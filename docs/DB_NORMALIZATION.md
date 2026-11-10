# Normalización de la base de datos: estado y pendientes

Notas para retomar este trabajo otro día. Última actualización: 2026-11-10.

## Estado actual

- **2026-11-10: reconstruido desde cero en esta Mac.** El código de la primera versión nunca llegó al repo: solo existía este documento. Se volvió a implementar todo lo que describe, con los mismos nombres e IDs de migración.
- Commit `503971c` en la rama `stitch` (sin push).
- Cuatro migraciones, escritas a mano a partir de lo que generó EF:
  - `20261106214814_NormalizeSchema`: la normalización inicial.
  - `20261109194723_ScheduleIntegrityAndStatusKeys`: duración de citas, concurrencia, vínculo entre consulta y cita, y estados como enum. Ver "Segunda etapa".
  - `20261109203325_AddPatientScheduleStamp`: token de concurrencia del paciente, para la regla de choques del paciente.
  - `20261109203642_UniqueServiceNames`: nombre único en el catálogo de servicios.
- **Las cuatro están aplicadas en la base real** `ClinicaDentalDb` de esta Mac desde el 2026-11-10, con `docker compose up --build`.
  - Respaldo previo dentro del contenedor: `/var/opt/mssql/backup/ClinicaDentalDb_before_normalization_20261110.bak`.
  - Resultado: 3 especialidades, el pago "Credit card" pasó a `CreditCard` con el texto original en `Notes`, 8 fechas de nacimiento de relleno quedaron en null (se comparó contra el respaldo: todas eran iguales a la fecha de alta), ningún email con `+dup-`, ningún login borrado.
- **Cuidado con la base de la otra máquina:** si allí ya se aplicó la versión anterior de `NormalizeSchema`, EF la va a saltar por tener el mismo ID, y el esquema puede no coincidir exactamente con esta versión. Lo seguro es restaurar esa base a `AddAppointmentReminder` (o desde un respaldo) antes de aplicar estas migraciones.
- El backend compila y pasan **65 pruebas** (`dotnet test` en `Backend/ClinicaDental.Tests`). Las reglas nuevas están en `SchemaRulesTests.cs` y `ScheduleIntegrityTests.cs`.
- El frontend compila (`npm run build`). Los 15 warnings de `npm run lint` ya existían antes de estos cambios.
- Las migraciones se probaron en SQL Server con una base de prueba aparte y datos viejos a propósito (estados en español, emails repetidos, logins huérfanos, fechas de relleno, tratamientos con fechas al revés, servicios repetidos). `Up`, `Down` hasta `AddAppointmentReminder` y `Up` otra vez funcionaron, y la migración se detuvo con el mensaje esperado ante un horario duplicado.
- Prueba de humo contra SQL Server: 6 reservas simultáneas superpuestas del mismo doctor, 6 del mismo paciente con 6 doctores y 4 pagos simultáneos de 70 sobre un costo de 100. En cada caso se guardó solo una.
- Flujos de la interfaz probados por HTTP (36 de 36) sobre una copia restaurada del respaldo, para no ensuciar la base real: reserva con registro, disponibilidad, portal del paciente, alta y edición de doctores y pacientes, desactivar y reactivar, cambio de estado, consulta vinculada a una cita, tratamientos y pagos, usuarios y logins del seed. La copia ya se borró. Sobre la app real solo se hicieron lecturas.
- **No se probó en un navegador**: falta abrir http://localhost:8080 y revisar los formularios a mano.

## Próximos pasos inmediatos

1. Revisar en el navegador (http://localhost:8080) los formularios que cambiaron: doctores (especialidad sugerida), pagos (select de método), pacientes (fecha opcional), usuarios (nombre solo para staff), citas (horarios bloqueados según la duración) y expediente (select de citas).
2. Hacer push de `stitch` cuando esté revisado.
3. Si todo está bien, borrar el respaldo `/var/opt/mssql/backup/ClinicaDentalDb_before_normalization_20261110.bak`.

## Qué se cambió

### Modelo de datos

| Cambio | Antes | Ahora |
|---|---|---|
| Especialidad del doctor | Texto libre `Doctor.Specialty` | Tabla `Specialties` y FK `Doctor.SpecialtyId`, con nombre único |
| Nombre del doctor | `Doctor.Name` | `Doctor.FirstName`, igual que en `Patient` |
| Nombre para mostrar | `User.DisplayName` obligatorio, copiado del perfil | Solo se guarda para Admin y Receptionist. Para Patient y Doctor se calcula con `User.GetDisplayName()` |
| Método de pago | Texto libre | Lista cerrada `PaymentMethods` con CHECK: Cash, CreditCard, DebitCard, BankTransfer, Insurance, Other |
| Fecha de nacimiento | `DateTime` obligatorio, con "hoy" como relleno | `DateOnly?` (columna `date`), null si no se conoce |
| Teléfonos | Obligatorios, `""` si no había | Opcionales (null) |
| Cadena de refresh tokens | `ReplacedByTokenHash` (copia del hash) | `ReplacedByTokenId`, una FK a la misma tabla |
| Tabla de servicios | `Services` | `DentalServices` (el DbSet sigue llamándose `Services`) |
| Auditoría | CreatedAt/UpdatedAt solo en algunas tablas, asignados a mano | Interfaz `IAuditable` en todas las tablas principales, llenada por `AuditInterceptor` |
| Fechas | Se perdía la indicación UTC al leer | `UtcDateTimeConverter` en todas las `DateTime`; la API devuelve fechas con "Z" |

### Restricciones e índices

- **CHECK constraints:**
  - Rol del usuario, y que el rol coincida con el vínculo (`CK_Users_RoleLink`).
  - DisplayName solo para staff.
  - Estados de citas y tratamientos.
  - Montos mayores a 0, costo no negativo, y `EndDate >= StartDate`.
  - Precio y duración del servicio.
  - Método de pago.
- **Índices únicos:**
  - `UX_Appointments_Doctor_Slot` sobre (DoctorId, AppointmentDate), filtrado para excluir Cancelled y No-show. Impide reservar el mismo horario dos veces aunque lleguen dos peticiones a la vez.
  - Email de Patient y email de Doctor.
- **Índices nuevos:** (PatientId, AppointmentDate), AppointmentDate y RefreshTokens.ExpiresAt. Se quitó el índice redundante sobre DoctorId.
- **Relaciones:** ya ninguna borra en cascada datos clínicos ni financieros. Las de Patient a DentalRecord, Treatment a Payment, Service a Appointment, y User a Patient/Doctor pasaron a `Restrict`.

### Código

- **Configuración EF:** cada entidad tiene su clase en `Infrastructure/Persistence/Configurations/`. Las reglas globales (UTC, precisión decimal) están en `AppDbContext.ConfigureConventions`. El interceptor se registra en `OnConfiguring` para que también aplique en las pruebas con SQLite.
- **DTOs:** pacientes y doctores se escriben con `PatientRequest` y `DoctorRequest`. Esto arregló el PUT, que antes siempre fallaba con 500. Los doctores se devuelven como `DoctorResponse`, con `specialty` como texto.
- **Borrado lógico:**
  - DELETE de paciente, doctor o servicio ahora desactiva (`IsActive = false`).
  - `SetActiveAsync` cambia el perfil y su login juntos, tanto al desactivar como al reactivar.
  - No se puede desactivar un perfil con citas futuras pendientes o confirmadas: responde 409.
  - Solo un Admin puede cambiar `IsActive` de un paciente.
- **Listados públicos:** los visitantes solo ven doctores y servicios activos. El staff ve todos.
- **Endpoint nuevo:** `GET /api/specialties` para sugerir especialidades en el formulario.
- **Citas:**
  - Create y Update normalizan la fecha a UTC una sola vez.
  - Update valida que el doctor, paciente o servicio nuevo esté activo, solo si cambió.
  - "Horario ocupado" solo se responde cuando de verdad es eso.
- **Tratamientos:** se rechaza una fecha de fin anterior al inicio, y un costo menor a lo ya pagado.
- **Registro web:**
  - Si ya existe un paciente con ese email, responde 409 y no crea un duplicado.
  - No se vincula solo, para que nadie pueda tomar el expediente de otra persona sabiendo su email. El Admin vincula la cuenta desde Usuarios.
- **Errores de base de datos:** `DbUpdateExceptionHandler` convierte violaciones de restricciones en 409. Otros errores siguen siendo 500.
- **Limpieza de tokens:** `RefreshTokenCleanupService` borra a diario los tokens vencidos hace más de 30 días.
- **Recordatorios:** `AppointmentReminderService` ya no avisa de citas con un paciente o doctor desactivado.
- **Seed:** usa especialidades del catálogo, `DateOnly`, y métodos de pago de la lista.

### Frontend

- Todo lo que mostraba `doctor.name` ahora usa `doctor.firstName`.
- **Formularios:**
  - Doctores: el campo de especialidad sugiere valores del catálogo.
  - Pagos: el método es un select.
  - Pacientes: la fecha de nacimiento se envía como `yyyy-mm-dd` o null.
  - Usuarios: el nombre solo se pide para Admin y Receptionist.
- **Desactivar en vez de borrar:** los botones de borrar dicen "Deactivate" y explican que se conserva el historial. El checkbox Active de pacientes solo lo ve un Admin.
- **Formulario de citas:** solo ofrece pacientes, doctores y servicios activos.
- **Registro:** `App.jsx` y `LoginView.jsx` ya no envían la fecha de hoy como fecha de nacimiento.
- **BookingWizard:** muestra el precio leyendo `basePrice`. Antes leía `price`, que no existía.

### Documentación

- README: ejemplos de la API actualizados (`firstName`, fecha `yyyy-mm-dd`, estados en inglés, métodos de pago).
- `docs/ARCHITECTURE.md`: refresh tokens, verificación de choques, registro y nombre para mostrar.

## Qué hace la migración con los datos existentes

En este orden:

1. **Estados viejos:** convierte las etiquetas en español (Pendiente, Confirmada, No asistió, Planificado, En curso…) a las de la API. **Se detiene** si queda algún estado desconocido.
2. **Se detiene** con un mensaje claro si un doctor tiene dos citas activas a la misma hora. Cuál cancelar es una decisión del negocio.
3. Crea `Specialties` a partir de los textos distintos (sin distinguir mayúsculas ni espacios). Los vacíos pasan a "General Dentistry".
4. Convierte `ReplacedByTokenHash` en `ReplacedByTokenId`.
5. **Usuarios:**
   - Borra los logins Patient/Doctor que quedaron sin perfil por el viejo `ON DELETE SET NULL`.
   - Limpia los vínculos que no corresponden al rol.
   - Pone en null el DisplayName de Patient y Doctor. Si un staff no tiene nombre, le pone su email.
6. **Pacientes y doctores:**
   - Pone en null las fechas de nacimiento de relleno y los teléfonos vacíos. Se toma como relleno una fecha igual o posterior al día de alta, o igual al día de la última edición.
   - Pasa los emails a minúsculas. Un email vacío pasa a `unknown-<id>@invalid.local`, porque ahora es obligatorio y único.
   - Recorta a 30 caracteres los teléfonos de doctor más largos.
7. **Emails duplicados:** conserva el email en el perfil que tiene login, o en el más antiguo. A los demás les agrega `+dup-<primeros 8 caracteres del id>` antes de la arroba. No une ni borra perfiles.
8. **Pagos:**
   - Guarda el texto original en `Notes` ("Original method: ..."), salvo que ya fuera un valor de la lista.
   - Lo mapea a la lista cerrada, incluidos términos en español. Lo que no reconoce pasa a "Other".
9. Intercambia las fechas de inicio y fin de tratamientos que estaban al revés.
10. Llena CreatedAt con la mejor fecha disponible (la del tratamiento, después de corregir sus fechas).
11. Crea CHECK constraints, índices y FKs. El filtro del índice único de horario usa `<>` y `AND`, porque SQL Server no acepta `NOT IN` en índices filtrados.

`Down()` revierte todo y reconstruye los datos que el esquema viejo exigía: nombres en DisplayName, texto de especialidad y hash del token.

## Segunda etapa (2026-11-09): agenda, concurrencia, expediente y estados

Migración `20261109194723_ScheduleIntegrityAndStatusKeys`. Pruebas en `Backend/ClinicaDental.Tests/ScheduleIntegrityTests.cs`.

### Choques de citas por duración

- **Hora de fin.** `Appointment.EndsAt` guarda el final de la cita: inicio más la duración del servicio, o 30 minutos sin servicio (`Appointment.DefaultDurationMinutes`). Un CHECK exige `EndsAt > AppointmentDate`.
- **Regla.** Dos citas activas del mismo doctor no pueden superponerse (`AppointmentsController.OverlapsAsync`). Una cita que termina a las 10:00 y otra que empieza a las 10:00 sí se permiten. Las canceladas y las NoShow liberan su tiempo.
- **Editar una cita.** Conserva su duración, salvo que cambie el servicio. Así, cambiar la duración de un servicio no altera citas ya reservadas.
- **Disponibilidad.** `GET /api/appointments/availability` devuelve `booked` con rangos `{ start, end }`, y además `bookedSlots` para compatibilidad. `TimeSlotPicker` recibe `durationMinutes` y bloquea los horarios que se superponen o que terminan después del cierre.

### Concurrencia

Se usan tokens de concurrencia optimista, que funcionan igual en SQL Server y SQLite:

- **Doctor.ScheduleStamp.** Reservar o mover una cita que ocupa horario le asigna un valor nuevo en el mismo SaveChanges. Si dos reservas del mismo doctor llegan a la vez, solo la primera se guarda. La segunda recibe 409 y no se guarda nada.
- **Treatment.ConcurrencyStamp.** Lo mismo al registrar un pago o al editar el tratamiento. Así, dos pagos simultáneos no pueden superar el costo.
- **Auditoría.** Cambiar solo un token no cuenta como edición, así que no toca `UpdatedAt`. `DbUpdateExceptionHandler` también convierte en 409 cualquier `DbUpdateConcurrencyException`.
- **Verificación.** Se probó en vivo contra SQL Server con 6 reservas simultáneas superpuestas y 4 pagos simultáneos de 70 sobre un costo de 100. Las reservas no quedaron superpuestas y solo se guardó un pago.

### Expediente y consultas

- **Expediente automático.** La primera consulta crea el expediente si no existe. Ya no hace falta guardarlo antes.
- **Vínculo con la cita.** `Consultation.AppointmentId` es opcional. La cita debe ser del mismo paciente, y cada cita tiene como máximo una consulta, con índice único filtrado. Si se borra la cita, solo se limpia el vínculo.
- **Formulario.** `DentalRecordModal` ofrece un select con las citas del paciente. También se arregló la detección del 404 del expediente: ahora usa `e.status === 404`.

### Estados como enum

- **Enums.** `AppointmentStatus` (Pending, Confirmed, Completed, Cancelled, NoShow) y `TreatmentStatus` (Planned, InProgress, Completed, Cancelled) se guardan como texto con el nombre del miembro.
- **JSON.** La API los envía y recibe por nombre (`JsonStringEnumConverter` con `allowIntegerValues: false`). Las etiquetas viejas ("No-show", "In progress") y los números se rechazan con 400.
- **Frontend.** Las etiquetas se muestran desde `services/api.js` (`AppointmentStatuses`, `TreatmentStatuses`, `statusLabel`).
- **Migración.** Convierte "No-show" en NoShow e "In progress" en InProgress, y recrea los CHECK y el filtro del índice único de horario. `Down()` restaura las etiquetas.

## Pendientes

### Decisiones abiertas (opcionales, no aplicadas)

- **Unir perfiles duplicados.** Si aparece algún email con `+dup-`, unir a mano los dos perfiles: mover citas, tratamientos y expediente. Hoy la base real no tiene ninguno.
- **Alergias y medicamentos.** Siguen como texto libre en `DentalRecord`. Una tabla aparte (`PatientAllergy`) solo vale la pena si se necesitan alertas o búsquedas. Se decidió no hacerlo por ahora.
- **Datos de contacto.** Patient y Doctor repiten nombre, email y teléfono. Se podría usar un tipo complejo compartido de EF. Se decidió no hacerlo por ahora, porque es un refactor sin cambio funcional.
- **Guids secuenciales.** Los Id se generan con `Guid.NewGuid()`, lo que fragmenta el índice clusterizado en SQL Server. Impacto despreciable a esta escala.
- **Horario de atención en el backend.** El horario de 9:00 a 18:00 solo lo aplica `TimeSlotPicker`. La API acepta citas a cualquier hora futura. Para hacerlo en el backend hace falta definir la zona horaria de la clínica en la configuración (por ejemplo `Clinic:TimeZone`, `Clinic:OpenHour`, `Clinic:CloseHour`), porque las citas se guardan en UTC. El frontend también debería usar esa zona, y no la del navegador, para que un paciente en otra zona horaria vea los horarios correctos.
- **Tratamiento completado sin fecha de fin.** No hay regla que obligue a poner `EndDate` cuando el estado es Completed. Es una decisión de negocio, no de normalización.

### Aplicados el 2026-11-09

- Choques por duración, pagos concurrentes, vínculo entre consulta y cita, expediente automático y estados como enum. Ver "Segunda etapa".
- Choques del paciente y nombres de servicio únicos. Ver "Tercera etapa".

## Tercera etapa (2026-11-09): choques del paciente y auditoría

### Choques del paciente

- **Regla.** Un paciente no puede tener dos citas activas superpuestas, aunque sean con doctores distintos (`AppointmentsController.PatientBusyAsync`). La API responde 409 con "The patient already has another appointment at that time."
- **Concurrencia.** `Patient.ScheduleStamp` funciona igual que el del doctor. Se probó en vivo contra SQL Server con 6 reservas simultáneas del mismo paciente con 6 doctores distintos: solo se guardó una.

### Nombres de servicio únicos

- **Regla.** `IX_DentalServices_Name` es único, sin distinguir mayúsculas, igual que `Specialties`. La API responde 409 con un mensaje claro al crear o renombrar un servicio con un nombre ya usado.
- **Migración.** Si una base ya tiene nombres repetidos, conserva el más antiguo y renombra los demás con " (2)", " (3)", en vez de fallar al arrancar.

### Resultado de la auditoría de normalización

Se revisó el esquema que generan las migraciones, tabla por tabla, y los datos de la base real en modo solo lectura.

- **Formas normales.** Todas las tablas tienen clave primaria simple (Guid), así que cumplen 2FN. No se encontraron dependencias transitivas sin control, así que cumplen 3FN.
- **Columnas parecidas entre tablas que no son repetición:**
  - Patients y Doctors comparten nombre, email y teléfono, pero son entidades distintas. Ningún dato se guarda dos veces, salvo que un doctor también fuera paciente, y la base real no tiene ninguno. Una tabla `Persons` compartida solo valdría la pena si eso pasara seguido.
  - `Users.Email` es el login y `Patients.Email` o `Doctors.Email` es el contacto. Pueden ser distintos a propósito.
  - `CreatedAt` y `UpdatedAt` en todas las tablas son auditoría por fila, no datos repetidos.
- **Redundancias controladas:**
  - `Users.Role` se puede deducir en parte del vínculo con paciente o doctor. `CK_Users_RoleLink` garantiza que nunca se contradigan.
  - `Appointments.EndsAt` es una foto de la duración del servicio al reservar, no una copia viva. Cambiar la duración de un servicio no debe cambiar citas ya reservadas.
- **Integridad que solo garantiza la aplicación, por limitaciones de SQL Server:**
  - Choques de citas por rango. SQL Server no tiene restricciones de exclusión, así que se usa la consulta más los tokens de concurrencia.
  - La suma de pagos no puede superar el costo. Es una regla sobre varias filas, así que se usa la consulta más el token del tratamiento.
  - Que la cita vinculada a una consulta sea del mismo paciente.
  - Que el login se active o desactive junto con su perfil.
- **Base real (2026-11-09):** sin FK ni CHECK sin validar, sin nombres de servicio repetidos, sin citas superpuestas de doctor ni de paciente, y sin doctores que también sean pacientes.

### Hallazgos que la revisión descartó

- La limpieza de fechas de nacimiento de relleno podría fallar si el reloj del cliente estaba desfasado justo a medianoche UTC. Es especulativo.
- Un Admin puede vincular un login a un perfil desactivado. Es intencional: es la forma de restaurar accesos.

## Cómo volver a probar la migración

Nunca sobre `ClinicaDentalDb`. Usa una base aparte:

```
# Base de prueba en el estado anterior a la migración
cd Backend
dotnet ef database update AddAppointmentReminder --project ClinicaDental.API --startup-project ClinicaDental.API --connection "Server=localhost,1433;Database=ClinicaDentalDb_MigrationTest;User Id=sa;Password=YourPassword123;TrustServerCertificate=True;"

# Cargar datos de prueba, luego aplicar y revertir
dotnet ef database update NormalizeSchema --project ClinicaDental.API --startup-project ClinicaDental.API --connection "<la misma cadena>"
dotnet ef database update AddAppointmentReminder --project ClinicaDental.API --startup-project ClinicaDental.API --connection "<la misma cadena>"

# Segunda migración: partir de NormalizeSchema, cargar datos con los estados viejos, aplicar y revertir
dotnet ef database update NormalizeSchema --project ClinicaDental.API --startup-project ClinicaDental.API --connection "<la misma cadena>"
dotnet ef database update ScheduleIntegrityAndStatusKeys --project ClinicaDental.API --startup-project ClinicaDental.API --connection "<la misma cadena>"
dotnet ef database update NormalizeSchema --project ClinicaDental.API --startup-project ClinicaDental.API --connection "<la misma cadena>"
```

Para una prueba de humo contra SQL Server, se puede levantar la API apuntando a la base de prueba. Agrega `Jwt__Key`, `BootstrapAdmin__Email` y `BootstrapAdmin__Password` como variables de entorno:

```
ConnectionStrings__DefaultConnection="Server=localhost,1433;Database=ClinicaDentalDb_MigrationTest;User Id=sa;Password=YourPassword123;TrustServerCertificate=True;" SeedSampleData=false dotnet run --no-launch-profile --urls http://localhost:5199
```

Detalles que costaron tiempo:

- **sqlcmd dentro del contenedor:** necesita `-I` (QUOTED_IDENTIFIER ON). Sin eso, los INSERT fallan porque ya existen índices filtrados.
- **Git Bash en Windows:** antepón `MSYS_NO_PATHCONV=1` a `docker exec`. Si no, convierte `/opt/...` en una ruta de Windows.
- **Ruta de sqlcmd:** `/opt/mssql-tools18/bin/sqlcmd`, con `-C` para confiar en el certificado.
- **Borrar la base de prueba al terminar:**
  ```
  ALTER DATABASE ClinicaDentalDb_MigrationTest SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ClinicaDentalDb_MigrationTest;
  ```

## Archivos clave

- **Entidades:** `Backend/ClinicaDental.Domain/Entities/`, `Backend/ClinicaDental.Domain/Common/IAuditable.cs`
- **Mapeo EF:** `Backend/ClinicaDental.Infrastructure/Persistence/Configurations/`, `.../Conventions/UtcDateTimeConverter.cs`, `.../Interceptors/AuditInterceptor.cs`
- **Migraciones:** `Backend/ClinicaDental.API/Migrations/20261106214814_NormalizeSchema.cs`, `..._ScheduleIntegrityAndStatusKeys.cs`, `..._AddPatientScheduleStamp.cs`, `..._UniqueServiceNames.cs`
- **Reserva de citas:** `Backend/ClinicaDental.API/Controllers/AppointmentsController.cs` (`OverlapsAsync`, Create, Update)
- **Contratos:** `Backend/ClinicaDental.API/Contracts/Requests.cs`, `Responses.cs`
- **Pruebas de las reglas nuevas:** `Backend/ClinicaDental.Tests/SchemaRulesTests.cs`, `ScheduleIntegrityTests.cs`
