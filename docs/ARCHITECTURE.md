# ClinicaDental — Descripción de la Arquitectura

Este documento explica cómo está organizado el código y cómo se comunican las
distintas partes entre sí: la estructura en capas del backend, el flujo de
autenticación/autorización (JWT), y cómo el frontend en React consume la API.

## 1. Estructura general

```
frontend/         SPA en React + Vite (páginas, asistente de reservas, panel de admin)
Backend/
  ClinicaDental.API              API Web de ASP.NET Core — punto de entrada, controllers, configuración JWT
  ClinicaDental.Application      Casos de uso + interfaces de repositorios (la capa de "contratos")
  ClinicaDental.Domain           Entidades — sin dependencias de ninguna otra capa
  ClinicaDental.Infrastructure   DbContext de EF Core + implementaciones de repositorios
  ClinicaDental.Tests            Pruebas de integración (xUnit, WebApplicationFactory)
```

La dirección de las dependencias fluye hacia adentro, al estilo Clean Architecture:

```
API  →  Application  →  Domain
 ↓                        ↑
Infrastructure ───────────┘
```

- **Domain** no tiene dependencias — son clases de entidades simples
  (`Appointment`, `Patient`, `Doctor`, `User`, …).
- **Application** depende únicamente de Domain. Define las *interfaces* de
  los repositorios (`IPatientRepository`, `IDoctorRepository`,
  `IAppointmentRepository`, …), las reglas de reserva
  (`Appointments/AppointmentScheduler`), el reloj de la clínica
  (`Clinic/ClinicClock`: zona horaria, horario de atención) y abstracciones
  como `ICurrentUser` y la paginación (`Common/Paging`).
- **Infrastructure** depende de Application (para implementar sus interfaces)
  y de Domain. Contiene `AppDbContext` (EF Core) y las clases concretas de
  los repositorios (`PatientRepository`, `DoctorRepository`,
  `AppointmentRepository`).
- **API** depende de las tres. `Program.cs` conecta todo mediante inyección
  de dependencias, y los controllers son los puntos de entrada HTTP.

### Criterio para usar cada capa

Se eligió una regla explícita en lugar de forzar todo por casos de uso:

- **Lógica de negocio real → Application.** Las reglas de reserva (fecha
  futura, horario de atención, disponibilidad de paciente/doctor/servicio,
  solapamientos y tokens de concurrencia) viven en `AppointmentScheduler`,
  que solo depende de interfaces de repositorio y de `ClinicClock`. El
  controller de citas solo traduce HTTP ↔ `ScheduleRequest`/`ScheduleResult`
  y envía el correo.
- **CRUD simple y consultas de lectura → controller + repositorio o
  `AppDbContext`.** `DashboardController`, `AuthController` y algunas
  validaciones de existencia en `ClinicalController`, `TreatmentsController`
  y `UsersController` consultan `AppDbContext` directamente porque no hay
  regla que encapsular.

Si un endpoint de CRUD empieza a acumular reglas (como pasó con las citas),
la señal es moverlo a un servicio en Application con el mismo patrón.

### Respuestas: siempre DTOs

Los controllers nunca devuelven entidades de EF Core. Cada recurso tiene su
DTO en `Contracts/Responses.cs` (`AppointmentResponse`, `TreatmentResponse`,
`ServiceResponse`, `DentalRecordResponse`, …). Así no se filtran campos
internos (tokens de concurrencia) ni datos de otras personas a través de
propiedades de navegación, y el contrato de la API no cambia por accidente
al tocar el modelo.

## 2. Cómo fluye una petición (ejemplo: reservar una cita)

1. **Frontend**: el asistente de reservas (`BookingWizard.jsx` a través de
   `App.jsx`) primero crea la cuenta del paciente con
   `POST /api/auth/register-patient` (si no hay sesión) y después llama a
   `createAppointment(...)` en `services/api.js` con esa sesión. La hora
   elegida es hora de la clínica (`TimeSlotPicker` usa
   `GET /api/clinic/settings`) y se convierte a UTC con `clinicTimeToIso`.
2. **`AppointmentsController.Create`** exige sesión (`[Authorize]`) y tiene
   límite de peticiones (`Booking`). Si quien llama es un **Patient**, el
   paciente sale de su login, nunca del cuerpo de la petición, y el estado
   se fuerza a `Pending`. El personal puede reservar para cualquier paciente.
3. **`AppointmentScheduler.CreateAsync`** (capa Application) aplica las
   reglas:
   - la fecha debe estar en el futuro,
   - paciente, doctor y servicio deben existir y estar activos,
   - la cita (que dura lo que su servicio, 30 minutos sin servicio) debe
     caer dentro del horario de atención y en un día abierto, en la zona de
     la clínica (`ClinicClock.IsWithinOpeningHours`),
   - no puede superponerse con otra cita activa del mismo doctor ni del
     mismo paciente. Para que dos reservas simultáneas no pasen las dos esa
     verificación, se cambian `Doctor.ScheduleStamp` y
     `Patient.ScheduleStamp` (tokens de concurrencia) en el mismo
     `SaveChanges`; la segunda recibe 409.
4. Si todo es correcto guarda la cita y el controller envía el correo de
   confirmación con la hora formateada en la zona de la clínica
   (`ClinicClock.Format`). Un fallo de SMTP solo se registra como warning:
   la cita ya está guardada y la respuesta sigue siendo 201.
5. La respuesta es un `AppointmentResponse` con los nombres de paciente,
   doctor y servicio, sin datos de contacto.

## 3. Autenticación y Autorización (JWT)

### 3.1 Tokens

Se emiten dos tokens juntos al iniciar sesión/registrarse
(`AuthController.IssueTokens`,
`Backend/ClinicaDental.API/Controllers/AuthController.cs:69`):

- **Access token (token de acceso)** — un JWT de corta duración (15 minutos
  por defecto, configurable vía `Jwt:AccessTokenMinutes`). Se genera con
  `JwtTokenService.CreateAccessToken`
  (`Backend/ClinicaDental.API/Services/JwtTokenService.cs`). Contiene los
  claims: `sub`/`NameIdentifier` (id del usuario), `email`, `name` (nombre
  para mostrar) y `role` — este último es contra el que se validan los
  chequeos `[Authorize(Roles = ...)]` basados en rol.
- **Refresh token** — un valor aleatorio de 64 bytes (`CreateRefreshToken`),
  *no* es un JWT. Nunca se envía tal cual a la base de datos: solo se guarda
  su hash SHA-256 (`HashToken`) en la tabla `RefreshTokens`, junto con una
  fecha de expiración (`Jwt:RefreshTokenDays`, 7 días por defecto) y un
  registro de auditoría `RevokedAt`/`ReplacedByTokenId` (una FK al token
  que lo reemplazó). `RefreshTokenCleanupService` borra a diario los tokens
  vencidos hace más de 30 días. Guardar solo el
  hash significa que una base de datos filtrada no entrega refresh tokens
  utilizables.

### 3.2 Flujo de inicio de sesión

```
POST /api/auth/login  { email, password }
  → AuthController.Login
  → PasswordHasher<User>.VerifyHashedPassword(...)   (el hasher de ASP.NET Identity, tipo bcrypt)
  → IssueTokens(user): crea el access token y agrega el refresh token; Login guarda con SaveChanges
  → 200 OK { accessToken, refreshToken, user }
```

`RegisterPatient` sigue la misma forma pero primero crea una entidad
`Patient` y una entidad `User` vinculada (`user.PatientId = patient.Id`) en
una sola transacción (`context.AddRange(patient, user)`), y luego emite los
tokens de la misma manera — por eso el flujo de "reservar y registrarse" puede
ocurrir como un solo paso de "crea mi cuenta con esta cita" dentro del
asistente. Si ya existe un paciente con ese email, responde 409 y no crea
ni vincula nada: saber el email de alguien no debe bastar para tomar su
expediente. Un Admin vincula la cuenta desde Usuarios.

El nombre que viaja en el claim `name` y en `user.displayName` sale de
`User.GetDisplayName()`: para Patient y Doctor se arma desde el perfil
vinculado, y solo Admin y Receptionist guardan `DisplayName` en la tabla.

### 3.3 Cómo valida la API un token en cada petición

Configurado una sola vez en `Program.cs`:

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
    options.TokenValidationParameters = new TokenValidationParameters {
        ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
        ValidIssuer = ..., ValidAudience = ..., IssuerSigningKey = ...(Jwt:Key)..., ClockSkew = TimeSpan.Zero
    });
```

`app.UseAuthentication()` (se ejecuta antes que `app.UseAuthorization()` en
el pipeline de middleware de `Program.cs`) lee el header
`Authorization: Bearer <jwt>` en cada petición entrante, verifica la firma
contra `Jwt:Key`, revisa emisor/audiencia/expiración, y — si es válido —
llena `HttpContext.User` con los claims del token. `ClockSkew = TimeSpan.Zero`
significa que no hay margen de tolerancia después de la expiración
(normalmente ASP.NET permite ~5 minutos de desfase).

Los controllers luego declaran quién puede acceder:

- `[AllowAnonymous]` — no requiere token (login, registro, refresh,
  consulta de disponibilidad, ajustes de la clínica, formulario de
  contacto). Crear una cita ya **no** es anónimo: requiere sesión.
- `[Authorize]` — cualquier usuario autenticado, sin importar el rol.
- `[Authorize(Roles = "Admin,Doctor,Receptionist")]` — solo estos roles
  pasan; cualquier otro (incluso con un token válido pero de rol incorrecto)
  recibe `403 Forbidden`.

Algunos endpoints agregan una *segunda* capa de autorización manual además
del chequeo de rol, porque los roles por sí solos no pueden expresar "este
paciente solo puede ver su propio expediente". Ejemplo,
`ClinicalController.CanAccess`:

```csharp
private async Task<bool> CanAccess(Guid patientId) =>
    User.IsInRole(UserRoles.Admin) || User.IsInRole(UserRoles.Doctor) ||
    (User.FindFirstValue(ClaimTypes.NameIdentifier) is string id &&
     await context.Users.AnyAsync(x => x.Id == Guid.Parse(id) && x.PatientId == patientId));
```

Esto lee el claim del id de usuario del token ya validado y verifica en la
base de datos si ese usuario es realmente el dueño del expediente de
paciente solicitado. `AppointmentsController.GetById` hace lo mismo para las
citas. Esto es autorización de "propiedad" (ownership) — no se puede
expresar solo con `[Authorize(Roles=...)]` porque depende de *cuál* paciente,
no solo de *qué rol*.

### 3.4 Flujo de refresh (renovación de token)

Los access tokens son de corta duración a propósito, así que el frontend
necesita renovarlos silenciosamente. `authorizedFetch`, en
`frontend/src/services/auth.js`, envuelve cada llamada autenticada a la API:

1. Envía la petición con el access token actual.
2. Si la respuesta es `401 Unauthorized` (token expirado), llama a
   `POST /api/auth/refresh` con el refresh token guardado. **Un solo refresh
   a la vez**: los paneles cargan varios recursos en paralelo, y todos
   reciben 401 juntos. Comparten la misma promesa de refresh
   (`refreshSession`), y entre pestañas un Web Lock hace lo mismo. Si al
   tomar el turno el refresh token guardado ya cambió, otra petición o
   pestaña ya renovó la sesión y simplemente se reintenta con el token
   nuevo. Sin esto, la segunda petición enviaría un token ya rotado y
   dispararía la detección de reuso.
3. El backend (`AuthController.Refresh`) hashea el refresh token recibido, lo
   busca, y lo rechaza si no existe, está revocado, expiró, o pertenece a un
   usuario desactivado. Si es válido, **revoca el refresh token anterior**
   (`stored.RevokedAt = ...`) y emite un par nuevo de access+refresh token —
   esto es *rotación* de refresh tokens, que limita el daño si un refresh
   token llega a ser robado (solo puede usarse una vez).
   **Detección de reuso**: si llega un token que ya fue rotado (tiene
   `ReplacedByTokenId`), alguien tiene una copia. No se puede saber si es el
   usuario o un atacante, así que se revocan todas las sesiones activas de
   ese usuario y debe iniciar sesión otra vez.
4. El frontend guarda los tokens nuevos y reintenta la petición original una
   vez.
5. Si el refresh mismo falla, `expireSession()` limpia el almacenamiento
   local, notifica a la app mediante `onSessionExpired` (conectado en
   `App.jsx` para redirigir al login), y lanza `SessionExpiredError`.

### 3.5 Control de acceso por rol en el frontend

`services/auth.js` también expone `canAccess(roles)`, que simplemente
verifica el rol guardado en `localStorage` desde la última respuesta de
`/auth/me` o de login. Esto es control **solo de interfaz** (ocultar enlaces
de administración, etc.) — **no tiene ningún valor de seguridad por sí
mismo**, ya que se puede evadir trivialmente desde el cliente. La aplicación
real de las reglas siempre ocurre en el backend mediante
`[Authorize(Roles=...)]` y las verificaciones de propiedad descritas arriba.
El chequeo del frontend solo evita mostrarle a los usuarios opciones que de
todas formas recibirían un 403.

## 4. Servicio de correo

El envío de correos está detrás de una interfaz, `IEmailSender`
(`Backend/ClinicaDental.API/Services/EmailSender.cs`), con una única
implementación real, `SmtpEmailSender`, que manda el correo por SMTP usando
`System.Net.Mail.SmtpClient`.

### 4.1 Inyección

Se registra en `Program.cs` como **scoped**:

```csharp
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
```

Cualquier controller o servicio puede pedirlo por constructor (inyección de
dependencias estándar de ASP.NET Core) sin conocer los detalles de SMTP —
solo conoce el contrato `SendAsync(recipient, subject, body, cancellationToken, isHtml)`.

### 4.2 Cuándo se usa

Hay tres puntos donde se dispara un correo:

1. **Al crear una cita** — `AppointmentsController.Create`
   (`Backend/ClinicaDental.API/Controllers/AppointmentsController.cs`) inyecta
   `IEmailSender` y, justo después de guardar la cita en la base de datos,
   arma el HTML con `EmailTemplates.AppointmentConfirmation(...)` y lo envía
   al correo del paciente con el asunto "Appointment confirmed". Esto ocurre
   de forma síncrona dentro de la misma petición HTTP. Si el envío falla, se
   registra un warning y la reserva responde 201 igual, porque la cita ya
   está guardada.

2. **Recordatorio de cita** — `AppointmentReminderService`
   (`Backend/ClinicaDental.API/Services/AppointmentReminderService.cs`) es un
   `BackgroundService` (un hosted service que corre en segundo plano durante
   toda la vida de la aplicación, registrado con
   `builder.Services.AddHostedService<AppointmentReminderService>()` en
   `Program.cs`). Cada hora (`PeriodicTimer` de 1 hora) revisa qué citas caen
   dentro de una ventana de ~24 horas antes de su fecha (23-25h, con margen
   para tolerar el intervalo de sondeo), que todavía no tengan
   `ReminderSentAt` (para no mandar el recordatorio dos veces) y cuyo estado
   sea `Pending` o `Confirmed`. Para cada una, envía un correo con
   `EmailTemplates.AppointmentReminder(...)` y marca `ReminderSentAt =
   DateTime.UtcNow`.

   Como `BackgroundService` es un singleton pero `AppDbContext` es scoped, el
   servicio crea manualmente un nuevo scope de DI (`scopes.CreateScope()`) en
   cada ejecución para obtener una instancia válida del `DbContext` y de
   `IEmailSender` — no puede simplemente inyectarlos por constructor como
   haría un controller. Cualquier excepción durante el envío se captura y se
   registra en el log (`catch (Exception exception)`), para que un fallo
   puntual de un correo (o del SMTP) no tumbe el bucle del servicio en
   segundo plano.

3. **Formulario de contacto** — `ClinicController.Contact`
   (`POST /api/clinic/contact`, anónimo, con límite de peticiones) envía el
   mensaje a `Clinic:ContactEmail` (o `Email:From`) con el visitante como
   Reply-To. No guarda nada en la base de datos. Si el envío falla responde
   503 para que el visitante sepa que debe llamar.

Todas las fechas de los correos se formatean con `ClinicClock.Format`, en la
zona horaria de la clínica, nunca en la del servidor.

### 4.3 Modo desarrollo/pruebas sin SMTP

`SmtpEmailSender` revisa primero la clave de configuración `Email:Enabled`.
Si es `false`, no intenta conectarse a ningún servidor SMTP — simplemente
registra en el log qué habría enviado (asunto y destinatario) y retorna. Esto
permite correr el backend en desarrollo o en las pruebas de integración sin
necesitar credenciales SMTP reales.

## 5. Referencia rápida — dónde está cada cosa

| Tema | Archivo |
|---|---|
| Configuración de DI, JWT, pipeline de middleware, seed de la base de datos | `Backend/ClinicaDental.API/Program.cs` |
| Creación/hash de tokens | `Backend/ClinicaDental.API/Services/JwtTokenService.cs` |
| Endpoints de login/registro/refresh/logout | `Backend/ClinicaDental.API/Controllers/AuthController.cs` |
| Constantes de roles | `Backend/ClinicaDental.Domain/Entities/User.cs` (`UserRoles`) |
| Modelo de EF Core + DbContext | `Backend/ClinicaDental.Infrastructure/Persistence/AppDbContext.cs` |
| Interfaces de repositorios | `Backend/ClinicaDental.Application/Interfaces/Repositories/` |
| Implementaciones de repositorios | `Backend/ClinicaDental.Infrastructure/Persistence/*Repository.cs` |
| Almacenamiento de sesión y renovación de token (frontend) | `frontend/src/services/auth.js` |
| Llamadas a la API (frontend) | `frontend/src/services/api.js` |
| Validación de pasos del asistente de reservas | `frontend/src/BookingWizard.jsx` |
| Servicio de correo (SMTP) | `Backend/ClinicaDental.API/Services/EmailSender.cs` |
| Recordatorios de cita en segundo plano | `Backend/ClinicaDental.API/Services/AppointmentReminderService.cs` |
| Reglas de reserva | `Backend/ClinicaDental.Application/Appointments/AppointmentScheduler.cs` |
| Zona horaria y horario de la clínica | `Backend/ClinicaDental.Application/Clinic/ClinicClock.cs` |
| Límites de peticiones, CORS, health check | `Backend/ClinicaDental.API/Program.cs`, `Services/RateLimitPolicies.cs` |
| Autoría de expedientes (quién creó/editó) | `Backend/ClinicaDental.Infrastructure/Persistence/Interceptors/AuditInterceptor.cs` |
| Hora de la clínica y moneda (frontend) | `frontend/src/services/clinic.js` |
| Rutas del frontend | `frontend/src/useRoute.js` |

## 6. Cosas pendientes / a tener en cuenta antes de extender el proyecto

- **No existe flujo de recuperación ni cambio de contraseña** — solo login,
  registro y refresh. Tampoco hay verificación del email al registrarse.
- **Paginación en el frontend**: los paneles de citas y tratamientos ya
  paginan. Los selectores de los formularios todavía cargan todos los
  pacientes y doctores; con muchos registros convendría un buscador.
- **Límites por IP detrás de un proxy**: los límites anónimos usan la IP de
  la conexión. Detrás de un reverse proxy hay que configurar forwarded
  headers, o todos los visitantes compartirían el mismo límite.
- **Horarios por doctor**: el horario de atención es uno para toda la
  clínica. No hay agenda ni días libres por doctor.
