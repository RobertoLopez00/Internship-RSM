# Dental Clinic

Management system for a dental clinic: a public site for booking appointments and an internal panel (role-based) for managing patients, doctors, appointments, services, treatments, payments, dental records, and users.

## What it's about

- **Public site**: landing page with clinic info, services and specialists, and a booking form that creates a patient account on the spot.
- **Internal panel**: role-based login (`Admin`, `Doctor`, `Receptionist`, `Patient`), each role sees only the modules it's allowed to.
  - **Admin**: full access — patients, appointments, doctors, services, treatments, payments, users, dashboard.
  - **Receptionist**: patients, appointments, doctors, services, treatments, dashboard.
  - **Doctor**: patients, appointments, treatments.
  - **Patient**: their own appointments.
- **Dental record**: medical history, allergies, medications, observations, and consultation history per patient.
- **Treatments and payments**: each treatment has a cost and accumulates payments; the system blocks a payment that would exceed the outstanding balance.
- **Appointments**: only inside the clinic's opening hours and time zone; prevents two active appointments for the same doctor (or the same patient) at the same time; sends confirmation and reminder emails (SMTP, optional).
- **Contact form**: messages from the public site are emailed to the clinic inbox, with the visitor as Reply-To.
- **Dashboard**: active patients, today's appointments, appointments by status, treatments in progress, income and outstanding balance — backed by real data from the database.

## Tech stack

**Backend** — `Backend/`, layered architecture (Domain / Application / Infrastructure / API):
- .NET 10 / ASP.NET Core Web API
- Entity Framework Core 10 + SQL Server
- JWT authentication (15-minute access token) with rotating refresh tokens, stored only as a hash; replaying a rotated refresh token ends every session of that user
- Rate limiting on login, registration, token refresh, booking and the contact form
- Swagger / OpenAPI to explore and test the API
- Email delivery over SMTP (`System.Net.Mail`), disabled by default
- xUnit + `WebApplicationFactory` + in-memory SQLite for integration tests, plus a SQL Server suite that runs the real migrations

**Frontend** — `frontend/`:
- React 19 + Vite
- Talks to the API via `fetch`, with automatic session refresh (one refresh at a time, shared across tabs)
- History-based routing: `/`, `/team`, `/services`, `/login`, `/portal`
- Vitest for unit tests

**Infrastructure**:
- Docker / Docker Compose (backend + frontend in a single container running as a non-root user, plus SQL Server and Mailpit)
- GitHub Actions CI (`.github/workflows/ci.yml`): backend build and tests against a real SQL Server, frontend lint, tests and build

## Project structure

```
Backend/
  ClinicaDental.Domain/          Entities and domain rules
  ClinicaDental.Application/     Booking rules, clinic clock, repository interfaces
  ClinicaDental.Infrastructure/  EF Core, persistence
  ClinicaDental.API/             Controllers, authentication, Program.cs
  ClinicaDental.Tests/           Integration tests (xUnit)
frontend/
  src/                           Public app (App.jsx) and internal panel (AdminPortal.jsx + admin/)
  src/services/                  HTTP client (api.js), session/auth (auth.js), clinic time and currency (clinic.js)
```

## How to run it

You'll need a reachable SQL Server instance (local, Docker, or remote) and, for native development, the .NET 10 SDK and Node 22+.

### Option A — Docker (recommended, single command)

Spins up SQL Server and the app (backend also serving the built frontend) together:

```bash
cd Internship
cp .env.example .env
# Required: set JWT_KEY in .env to a random value, for example the output of:
openssl rand -base64 48
docker compose up --build
```

The API refuses to start without `JWT_KEY`, with one shorter than 32 bytes, or with an example value copied from these docs, because anyone who knows the key can sign in as Admin. The `app` container then exits and its log says why (`docker compose logs app`).

> If you already run a SQL Server container of your own on port 1433 (e.g. for daily development), stop it first with `docker stop <container-name>` — otherwise Compose fails with `port is already allocated`. Restart it with `docker start <container-name>` once you're done, or run `docker compose down` to free the port again.

The app is available at `http://localhost:8080` (UI and API under `/api`). Relevant variables (see `docker-compose.yml` and `.env.example`): `JWT_KEY`, `SQL_SA_PASSWORD`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `SEED_SAMPLE_DATA`, `CLINIC_TIMEZONE`, `CLINIC_OPEN_HOUR`, `CLINIC_CLOSE_HOUR`, `CLINIC_CURRENCY`, `CLINIC_CONTACT_EMAIL`, `EMAIL_ENABLED`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`, `EMAIL_FROM`. `GET /health` answers `Healthy` when the API can reach the database.

### Option B — Native, backend and frontend separately (for development)

**Supporting containers** — SQL Server and Mailpit only, without the `app` container (run from the repo root):
```bash
docker compose up -d sqlserver mailpit
```
Both restart automatically with Docker Desktop. If you skip Mailpit, the API still works, but every email it tries to send fails and is only logged as a warning (see [Email delivery](#email-delivery)).

**Backend:**
```bash
cd Backend/ClinicaDental.API
dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 48)"
# Only if your SQL Server isn't the local container with the default password from docker-compose.yml
# (that one is already configured in appsettings.Development.json):
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,1433;Database=ClinicaDentalDb;User Id=sa;Password=YOUR_PASSWORD;TrustServerCertificate=True;"
dotnet user-secrets set "BootstrapAdmin:Email" "admin@yourclinic.com"
dotnet user-secrets set "BootstrapAdmin:Password" "a-secure-bootstrap-password"
dotnet ef database update
dotnet run
```
The API runs at `http://localhost:5097`, with Swagger available in development. On startup, if no other administrator exists and both `BootstrapAdmin` secrets are configured, the API creates the first `Admin` user — there are no insecure default credentials.

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:5173`, pointing by default to `http://localhost:5097/api` (configurable via `VITE_API_URL`).

## Seed data

On first startup against an empty database (no services yet), the API automatically creates:

- The bootstrap `Admin` account, from `BootstrapAdmin:Email`/`Password` (see above) — the only thing created if `SeedSampleData` is `false`.
- 5 sample services, 3 doctors, 4 patients, 5 appointments, 3 treatments with payments, and a dental record with one consultation.
- Two extra login accounts to try other roles: `doctor@dentalcare.com` / `Doctor123!` and `receptionist@dentalcare.com` / `Receptionist123!`.

This means anyone who clones the repo and runs `docker compose up --build` (or `dotnet run` natively) sees a populated app immediately, without extra setup. The seed only runs once — it's skipped whenever the `Services` table already has data, so it won't duplicate or overwrite anything on subsequent restarts.

To start with a completely empty database instead (only the bootstrap admin, no sample data), set `SeedSampleData` to `false` — via `SEED_SAMPLE_DATA=false` in `.env` for Docker, or `dotnet user-secrets set "SeedSampleData" "false"` when running natively. The seed logic lives in `Backend/ClinicaDental.API/SeedData.cs`.

### Using SQL Server Management Studio / your own instance instead of the SQL Server container

The only thing that needs to change is the connection string — no code changes required.

**A) Docker for the app only, with your own SQL Server:**
```bash
docker build -t clinica-dental-app .
docker run --init -p 8080:8080 \
  -e ConnectionStrings__DefaultConnection="Server=host.docker.internal,1433;Database=ClinicaDentalDb;User Id=sa;Password=YOUR_PASSWORD;TrustServerCertificate=True;" \
  -e Jwt__Key="$(openssl rand -base64 48)" \
  -e Clinic__TimeZone="America/Mexico_City" \
  -e BootstrapAdmin__Email="admin@yourclinic.com" \
  -e BootstrapAdmin__Password="a-secure-password" \
  clinica-dental-app
```
`--init` matters: without an init process, a startup error leaves the .NET process spinning instead of exiting. `host.docker.internal` points to the host from inside the container (works on Docker Desktop / Mac / Windows; on Linux use the host's IP or `--network=host`).

**B) Fully native, pointing at the instance you manage with SSMS:** use the "Backend" snippet from Option B above, replacing `Server=` with the instance name you use in SSMS (e.g. `localhost\SQLEXPRESS` or the server name) and the matching credentials.

## Clinic settings: time zone, opening hours, currency

Everything about local time uses the clinic's time zone, never the server's or the visitor's: opening hours, "today" on the dashboard, the times in emails, and the slots the booking page offers. A visitor in another country sees and books clinic time, and the page says so.

| Setting | Docker variable | Default | Meaning |
|---|---|---|---|
| `Clinic:TimeZone` | `CLINIC_TIMEZONE` | server zone (UTC in Docker) | IANA id such as `America/Mexico_City` |
| `Clinic:OpenHour` / `Clinic:CloseHour` | `CLINIC_OPEN_HOUR` / `CLINIC_CLOSE_HOUR` | 9 / 18 | Opening hours; `0` and `24` mean open all day |
| `Clinic:ClosedDays` | `Clinic__ClosedDays__0=Sunday` | none | Days without appointments |
| `Clinic:Currency` | `CLINIC_CURRENCY` | `USD` | ISO 4217 code used to show prices |
| `Clinic:ContactEmail` | `CLINIC_CONTACT_EMAIL` | `Email:From` | Inbox for the contact form |

The API rejects an appointment that starts before opening, ends after closing, or falls on a closed day, with a `400` that states the hours. Rescheduling follows the same rule; cancelling or editing notes of an old appointment does not. The frontend reads these settings from `GET /api/clinic/settings` before it renders, so it only offers slots the API accepts. An unknown time zone or inverted hours stop the API at startup.

## Security limits

- **Rate limits** per signed-in user, or per IP address for anonymous calls, per minute: login 10, registration 5, token refresh 30, booking 20, contact form 5. Each is configurable as `RateLimiting:{Name}PerMinute`, and `RateLimiting:Enabled=false` turns them off. Over the limit the API answers `429` with a `Retry-After` header. Behind a reverse proxy, configure forwarded headers so the limit sees the client's IP.
- **Refresh-token reuse**: refresh tokens rotate on every use. If an already-rotated token comes back, someone holds a copy, so the API revokes every session of that user and they sign in again.
- **Booking ownership**: `POST /api/appointments` requires a login. A patient always books for their own record, and the appointment starts as `Pending` whatever the request says. Staff can book for any patient.
- **Clinical authorship**: dental records and consultations store which login created and last edited them, shown as "created by / last edited by" in the panel.
- **CORS** origins come from `Cors:Origins` (the Vite dev server by default). In Docker the API serves the UI itself, so no CORS is needed.

## Email delivery

The API sends two kinds of emails through SMTP: an appointment confirmation when a booking is created, and a reminder 23–25 hours before the appointment (checked hourly by a background service). This only happens when `Email:Enabled` is `true` — otherwise it's a no-op that just logs what would have been sent, so no SMTP setup is required for normal development.

Both emails are sent as styled HTML (`Backend/ClinicaDental.API/Services/EmailTemplates.cs`), reusing the site's palette and branding — the same gradient header (`#0ea5e9` → `#14b8a6`), dark-blue text (`#12314a`), and the "D" DentalCare logo mark. Each email shows the appointment date/time, doctor, and (for confirmations) any notes, in a simple card layout that renders consistently across email clients.

**With Docker Compose**, email works out of the box: the stack includes [Mailpit](https://github.com/axllent/mailpit), a fake SMTP server that catches every email instead of delivering it externally. Run `docker compose up --build` and open `http://localhost:8025` to see confirmations and reminders as they're sent — no real credentials needed.

**To use a real SMTP provider** (Gmail, SendGrid, your own server, etc.) instead of Mailpit, override the `EMAIL_*` variables in `.env`:
```bash
EMAIL_ENABLED=true
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_USE_SSL=true
EMAIL_USERNAME=your-smtp-username
EMAIL_PASSWORD=your-smtp-password
EMAIL_FROM=noreply@yourclinic.com
```
For Gmail specifically, use an [app password](https://myaccount.google.com/apppasswords) rather than your account password.

**Running natively** (Option B above) with Mailpit, start the container (`docker compose up -d sqlserver mailpit`) and point the API at it:
```bash
dotnet user-secrets set "Email:Enabled" "true"
dotnet user-secrets set "Email:Host" "localhost"
dotnet user-secrets set "Email:Port" "1025"
dotnet user-secrets set "Email:UseSsl" "false"
dotnet user-secrets set "Email:From" "noreply@dentalcare.com"
```
Note that `localhost` is right for `dotnet run`, while inside Docker Compose the host is `mailpit` (the service name).

To use a real SMTP provider natively instead, set the same keys to its values:
```bash
dotnet user-secrets set "Email:Enabled" "true"
dotnet user-secrets set "Email:Host" "smtp.your-provider.com"
dotnet user-secrets set "Email:Username" "..."
dotnet user-secrets set "Email:Password" "..."
```

If the SMTP server can't be reached when a booking is created, the appointment is still saved and the API returns `201`; the failed confirmation email is logged as a warning. A reminder that fails is logged and retried on the next hourly run while the appointment is still inside the 23–25 hour window; the other reminders in the same run are still sent and marked.

## Main endpoints

Documented by Swagger in development: `auth`, `users`, `services`, `patients`, `doctors`, `appointments`, `patients/{id}/record`, `treatments`, `dashboard`, `clinic`. Public booking first creates the patient account via `POST /api/auth/register-patient`, then books with that login through `POST /api/appointments`. `GET /api/clinic/settings` and `POST /api/clinic/contact` are anonymous.

Responses are DTOs, never database entities, so internal fields (concurrency stamps, other people's contact data) don't leak. `GET /api/patients`, `GET /api/appointments` and `GET /api/treatments` accept optional `page` and `pageSize` (at most 200); with them, the total number of matches comes back in the `X-Total-Count` header. Without them they return everything, as before. `GET /api/appointments?patientId=...` returns one patient's appointments.

### Testing JWT auth in Swagger

1. Run the API and open Swagger at `http://localhost:5097/swagger` (or `/swagger` on whatever port you're using).
2. Expand `POST /api/auth/login`, click **Try it out**, and send your credentials (e.g. the `BootstrapAdmin` email/password you configured). The response body includes `accessToken`, `refreshToken`, and `user`.
3. Copy the `accessToken` value (just the token string, without `Bearer` in front).
4. Click the **Authorize** button at the top right of the Swagger page (padlock icon).
5. Paste the token into the `Bearer` field and click **Authorize**, then **Close**.
6. Every subsequent request through Swagger's UI will include that token automatically. Try `GET /api/patients` or `GET /api/dashboard` — you should get a `200` instead of `401`.
7. When the access token expires (15 minutes by default), repeat the login (or call `POST /api/auth/refresh` with the saved `refreshToken`) and re-authorize with the new token.

Endpoints restricted by role (e.g. `POST /api/doctors` is `Admin`-only) will return `403 Forbidden` if the logged-in user's role doesn't match, even with a valid token.

### Example requests for other endpoints

Once authorized in Swagger (see above), try these against a fresh database. Each **Try it out** form maps directly to these JSON bodies — dates use ISO 8601, and `PatientId`/`DoctorId`/`ServiceId` are GUIDs you get back from earlier calls.

**1. Create a doctor** — `POST /api/doctors` (Admin)
```json
{
  "firstName": "Carlos",
  "lastName": "López",
  "specialty": "Orthodontics",
  "phone": "555-1234",
  "email": "carlos@dentalcare.com"
}
```
`specialty` is a name from the catalog (`GET /api/specialties`); a new name is added to it, matched without regard to case. `phone` is optional. Copy the `id` from the response — you'll need it as `doctorId` below.

**2. Create a patient** — `POST /api/patients` (Admin or Receptionist)
```json
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "email": "juan@example.com",
  "phone": "555-5678",
  "dateOfBirth": "1990-01-15"
}
```
`dateOfBirth` is a plain `yyyy-mm-dd` date, or `null` when unknown; `phone` is optional. Emails are unique per patient (and per doctor), ignoring case. Copy the `id` from the response — you'll need it as `patientId` below.

**3. Create a service** — `POST /api/services` (Admin or Receptionist)
```json
{
  "name": "Dental cleaning",
  "description": "Routine cleaning and checkup",
  "basePrice": 50,
  "durationMinutes": 30,
  "isActive": true
}
```

**4. Book an appointment** — `POST /api/appointments` (any login; a Patient always books for themselves as `Pending`)
```json
{
  "patientId": "<patientId from step 2>",
  "doctorId": "<doctorId from step 1>",
  "serviceId": "<serviceId from step 3, or null>",
  "appointmentDate": "2026-09-10T14:00:00Z",
  "status": "Pending",
  "notes": "First visit"
}
```
Valid `status` values: `Pending`, `Confirmed`, `Completed`, `Cancelled`, `NoShow` (the enum names; numbers and labels such as `No-show` return `400`). The date must be in the future and inside opening hours (see [Clinic settings](#clinic-settings-time-zone-opening-hours-currency)). The appointment lasts as long as its service (30 minutes without one). Try booking the same doctor for a time that overlaps it — the call returns `409 Conflict` (the doctor already has a booking at that time). The same patient can't have two overlapping appointments either, even with different doctors.

**5. Create a treatment** — `POST /api/treatments` (Admin, Doctor, or Receptionist)
```json
{
  "patientId": "<patientId from step 2>",
  "doctorId": "<doctorId from step 1>",
  "name": "Root canal",
  "status": "Planned",
  "startDate": "2026-09-10T00:00:00Z",
  "endDate": null,
  "cost": 300,
  "observations": "Upper left molar"
}
```
Valid `status` values: `Planned`, `InProgress`, `Completed`, `Cancelled`. `endDate` can't be before `startDate`. Copy the `id` from the response — you'll need it as `treatmentId` below.

**6. Register a payment** — `POST /api/treatments/{treatmentId}/payments` (Admin or Receptionist)
```json
{
  "amount": 100,
  "paidAt": "2026-09-10T00:00:00Z",
  "method": "Cash",
  "notes": "First installment"
}
```
`method` is one of `Cash`, `CreditCard`, `DebitCard`, `BankTransfer`, `Insurance`, `Other`. Try sending an `amount` greater than the treatment's remaining balance (`cost` minus payments so far) — it returns `400 Bad Request`.

**7. Update the dental record** — `PUT /api/patients/{patientId}/record` (Admin or Doctor)
```json
{
  "medicalHistory": "Hypertension",
  "allergies": "Penicillin",
  "medications": "None",
  "observations": "Cooperative patient"
}
```
This creates the record if it doesn't exist yet, or updates it otherwise. `GET /api/patients/{patientId}/record` returns `404` until the first `PUT`.

**8. Add a consultation to the record** — `POST /api/patients/{patientId}/record/consultations` (Admin or Doctor)
```json
{
  "doctorId": "<doctorId from step 1>",
  "consultationDate": "2026-09-10T15:00:00Z",
  "notes": "Routine cleaning, no cavities found",
  "diagnosis": "No caries"
}
```
Requires the dental record to exist first (step 7) — otherwise returns `400 Bad Request`.

**9. Check the dashboard** — `GET /api/dashboard` (Admin or Receptionist)

No body needed. Returns `patients`, `appointmentsToday`, `appointmentsByStatus`, `activeTreatments`, `income`, and `outstandingBalance`, computed live from the data you just created.

## Automated tests

**Backend.** `Backend/ClinicaDental.Tests` contains integration tests (xUnit + `WebApplicationFactory`) that spin up the full API against an in-memory SQLite database, without depending on SQL Server. The test project is part of the solution, so either command works:

```bash
dotnet test Backend/ClinicaDental.slnx
cd Backend/ClinicaDental.Tests && dotnet test
```

SQLite can't exercise the migrations or SQL Server-only rules, so `SqlServerTests` runs the real migrations against a throwaway database on a real server. They're skipped unless `SQLSERVER_TEST_CONNECTION` is set; CI always sets it. To run them locally with the Compose SQL Server:

```bash
docker compose up -d sqlserver
SQLSERVER_TEST_CONNECTION="Server=localhost,1433;User Id=sa;Password=YourPassword123;TrustServerCertificate=True;" dotnet test Backend/ClinicaDental.slnx
```

Coverage:
- `AuthTests`: JWT issuance and validation, refresh token rotation, role-based authorization.
- `AppointmentConflictTests` and `ScheduleIntegrityTests`: overlapping appointments for the same doctor or patient, durations, concurrent bookings, rescheduling, status names.
- `PaymentTests`: rejects payments that exceed a treatment's outstanding balance, including after partial payments.
- `DentalRecordTests`: dental record and its consultation history, including the restriction preventing access to another patient's record.
- `SchemaRulesTests`: unique emails and names, soft deletes, role and profile links, refresh-token cleanup.
- `EmailFailureTests`: bookings and reminders keep working when SMTP fails.
- `ReviewFixesTests`: patients can only book for themselves, refresh-token reuse ends all sessions, DTO shapes, paging, clinical authorship, health check.
- `OpeningHoursTests` and `ClinicClockTests`: opening hours and closed days in the clinic's time zone, settings endpoint, email date format.
- `RateLimitTests`, `ContactTests`, `JwtKeyValidatorTests`: login limit, contact form delivery and failure, rejected JWT keys.
- `SqlServerTests`: migrations apply with no pending model changes, overlap rules and authorship on SQL Server.

**Frontend.**

```bash
cd frontend
npm test        # Vitest: clinic time-zone conversions, single-flight token refresh
npm run lint    # oxlint, expected to report no warnings (CI fails on any)
```
