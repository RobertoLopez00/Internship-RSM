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
  `IAppointmentRepository`) y un par de clases de casos de uso.
- **Infrastructure** depende de Application (para implementar sus interfaces)
  y de Domain. Contiene `AppDbContext` (EF Core) y las clases concretas de
  los repositorios (`PatientRepository`, `DoctorRepository`,
  `AppointmentRepository`).
- **API** depende de las tres. `Program.cs` conecta todo mediante inyección
  de dependencias, y los controllers son los puntos de entrada HTTP.

### Matiz importante: las capas se saltan parcialmente en la práctica

El proyecto *sí tiene* las interfaces de repositorio de la capa Application, y
tres controllers (`PatientsController`, `DoctorsController`,
`AppointmentsController`) sí pasan por ellas
(`IPatientRepository` → `PatientRepository` → `AppDbContext`).

Pero la mayoría de los demás controllers (`ClinicalController`,
`DashboardController`, `ServicesController`, `TreatmentsController`,
`UsersController`, `AuthController`) inyectan `AppDbContext`
**directamente** y lo consultan con LINQ, saltándose por completo la capa de
repositorios/casos de uso. También existe un caso de uso,
`GetAllPatientsUseCase`, que vive en `Application/UseCases/Patients/` pero
nunca se registra en la inyección de dependencias ni se llama desde ningún
lado — actualmente es código muerto.

En resumen: el *andamiaje* para una arquitectura en capas estricta existe
(interfaces + un caso de uso), pero no se aplicó de forma consistente — solo
un subconjunto de endpoints pasa por ella. Si vas a extender esto, conviene
decidir de una vez si (a) hacer que todo pase por repositorios/casos de uso
por consistencia, o (b) aceptar que los controllers hablen directo con
`AppDbContext` para CRUD simple y reservar los casos de uso para endpoints
con lógica de negocio real (como la verificación de conflictos de citas).
Ambas opciones son válidas; lo importante es tener presente que el estado
actual es mixto.

## 2. Cómo fluye una petición (ejemplo: reservar una cita)

1. **Frontend** (`BookingWizard.jsx` a través de `App.jsx`) llama a
   `createAppointment(...)` en `services/api.js`, que hace un POST con JSON a
   `/api/appointments`.
2. **`AppointmentsController.Create`** (`Backend/ClinicaDental.API/Controllers/AppointmentsController.cs`)
   recibe la petición. Este endpoint es `[AllowAnonymous]` — cualquiera puede
   reservar una cita sin haber iniciado sesión todavía, porque el flujo de
   reserva también crea la cuenta del paciente (ver
   `AuthController.RegisterPatient`, que el frontend llama por separado antes
   de esto).
3. El controller valida las reglas de negocio directamente en el método de
   acción:
   - la fecha de la cita debe estar en el futuro,
   - el estado debe ser un miembro del enum `AppointmentStatus` (la API lo
     recibe por nombre, por ejemplo `"NoShow"`; un número o una etiqueta
     vieja responde 400 antes de llegar al controller),
   - el paciente/doctor/servicio deben existir y estar activos,
   - la cita dura lo que su servicio (30 minutos sin servicio) y no puede
     superponerse con otra cita activa del mismo doctor ni del mismo
     paciente (`OverlapsAsync` y `PatientBusyAsync`). Para que dos reservas
     simultáneas no pasen las dos esa verificación, la reserva cambia
     `Doctor.ScheduleStamp` y `Patient.ScheduleStamp` (tokens de
     concurrencia) en el mismo `SaveChanges`; la segunda recibe 409.
4. Si todo es correcto, llama a `_appointmentRepository.AddAsync(appointment)`
   (capa Infrastructure → EF Core → SQL Server), y luego envía un correo de
   confirmación mediante `IEmailSender`.
5. La respuesta regresa a través del controller hacia el frontend, que
   actualiza el estado de la interfaz.

Esto muestra el patrón "mixto" en acción: la validación y orquestación viven
en el controller (no en un caso de uso), mientras que la persistencia se
delega al repositorio/EF Core.

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

- `[AllowAnonymous]` — no requiere token (login, registro, consulta de
  disponibilidad, creación inicial de cita).
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
   `POST /api/auth/refresh` con el refresh token guardado.
3. El backend (`AuthController.Refresh`) hashea el refresh token recibido, lo
   busca, y lo rechaza si no existe, está revocado, expiró, o pertenece a un
   usuario desactivado. Si es válido, **revoca el refresh token anterior**
   (`stored.RevokedAt = ...`) y emite un par nuevo de access+refresh token —
   esto es *rotación* de refresh tokens, que limita el daño si un refresh
   token llega a ser robado (solo puede usarse una vez).
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

Hay dos puntos donde se dispara un correo:

1. **Al crear una cita** — `AppointmentsController.Create`
   (`Backend/ClinicaDental.API/Controllers/AppointmentsController.cs`) inyecta
   `IEmailSender` y, justo después de guardar la cita en la base de datos,
   arma el HTML con `EmailTemplates.AppointmentConfirmation(...)` y lo envía
   al correo del paciente con el asunto "Appointment confirmed". Esto ocurre
   de forma síncrona dentro de la misma petición HTTP — si el envío falla, la
   excepción se propagaría (no hay try/catch alrededor en este endpoint).

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

## 6. Cosas pendientes / a tener en cuenta antes de extender el proyecto

- **Capas inconsistentes**: ver §1 — la mayoría de los controllers se saltan
  la capa de repositorios/casos de uso y hablan directo con `AppDbContext`.
  Solo Patients/Doctors/Appointments pasan por repositorios.
- **Código muerto**: `GetAllPatientsUseCase` no se usa.
- **No existe flujo de recuperación de contraseña** actualmente — solo
  login, registro y refresh.
- **CORS** está fijo a `localhost:5173`/`5174` en `Program.cs`
  (`FrontendPolicy`) — habrá que actualizarlo para cualquier despliegue que
  no sea local.
