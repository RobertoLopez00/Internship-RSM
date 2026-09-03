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
- **Appointments**: prevents two active appointments for the same doctor at the same time; sends confirmation and reminder emails (SMTP, optional).
- **Dashboard**: active patients, today's appointments, appointments by status, treatments in progress, income and outstanding balance — backed by real data from the database.

## Tech stack

**Backend** — `Backend/`, layered architecture (Domain / Application / Infrastructure / API):
- .NET 10 / ASP.NET Core Web API
- Entity Framework Core 10 + SQL Server
- JWT authentication (15-minute access token) with rotating refresh tokens, stored only as a hash
- Swagger / OpenAPI to explore and test the API
- Email delivery over SMTP (`System.Net.Mail`), disabled by default
- xUnit + `WebApplicationFactory` + in-memory SQLite for integration tests

**Frontend** — `frontend/`:
- React 19 + Vite
- Talks to the API via `fetch`, with automatic session refresh

**Infrastructure**:
- Docker / Docker Compose (backend + frontend in a single container, plus SQL Server)

## Project structure

```
Backend/
  ClinicaDental.Domain/          Entities and domain rules
  ClinicaDental.Application/     Use cases and interfaces
  ClinicaDental.Infrastructure/  EF Core, persistence
  ClinicaDental.API/             Controllers, authentication, Program.cs
  ClinicaDental.Tests/           Integration tests (xUnit)
frontend/
  src/                           Public app (App.jsx) and internal panel (AdminPortal.jsx + admin/)
  src/services/                  HTTP client (api.js) and session/auth (auth.js)
```

## How to run it

You'll need a reachable SQL Server instance (local, Docker, or remote) and, for native development, the .NET 10 SDK and Node 22+.

### Option A — Docker (recommended, single command)

Spins up SQL Server and the app (backend also serving the built frontend) together:

```bash
cd Internship
cp .env.example .env   # optional: adjust JWT_KEY, BOOTSTRAP_ADMIN_*, EMAIL_*
docker compose up --build
```

> If you already run a SQL Server container of your own on port 1433 (e.g. for daily development), stop it first with `docker stop <container-name>` — otherwise Compose fails with `port is already allocated`. Restart it with `docker start <container-name>` once you're done, or run `docker compose down` to free the port again.

The app is available at `http://localhost:8080` (UI and API under `/api`). Relevant variables (see `docker-compose.yml`): `JWT_KEY`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `SEED_SAMPLE_DATA`, `EMAIL_ENABLED`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`, `EMAIL_FROM`.

### Option B — Native, backend and frontend separately (for development)

**Backend:**
```bash
cd Backend/ClinicaDental.API
dotnet user-secrets set "Jwt:Key" "a-random-key-at-least-32-characters-long"
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
docker run -p 8080:8080 \
  -e ConnectionStrings__DefaultConnection="Server=host.docker.internal,1433;Database=ClinicaDentalDb;User Id=sa;Password=YOUR_PASSWORD;TrustServerCertificate=True;" \
  -e Jwt__Key="a-key-at-least-32-characters-long" \
  -e BootstrapAdmin__Email="admin@yourclinic.com" \
  -e BootstrapAdmin__Password="a-secure-password" \
  clinica-dental-app
```
`host.docker.internal` points to the host from inside the container (works on Docker Desktop / Mac / Windows; on Linux use the host's IP or `--network=host`).

**B) Fully native, pointing at the instance you manage with SSMS:** use the "Backend" snippet from Option B above, replacing `Server=` with the instance name you use in SSMS (e.g. `localhost\SQLEXPRESS` or the server name) and the matching credentials.

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

**Running natively** (Option B above), set the same values via user secrets:
```bash
dotnet user-secrets set "Email:Enabled" "true"
dotnet user-secrets set "Email:Host" "smtp.your-provider.com"
dotnet user-secrets set "Email:Username" "..."
dotnet user-secrets set "Email:Password" "..."
```

## Main endpoints

Documented by Swagger in development: `auth`, `users`, `services`, `patients`, `doctors`, `appointments`, `patients/{id}/record`, `treatments`, `dashboard`. Public-site appointments use `POST /api/appointments` (anonymous, validated server-side); managing and reading appointments requires authentication. Public booking creates the patient account via `POST /api/auth/register-patient`.

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
  "name": "Carlos",
  "lastName": "López",
  "specialty": "Orthodontics",
  "phone": "555-1234",
  "email": "carlos@dentalcare.com",
  "isActive": true
}
```
Copy the `id` from the response — you'll need it as `doctorId` below.

**2. Create a patient** — `POST /api/patients` (Admin or Receptionist)
```json
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "email": "juan@example.com",
  "phone": "555-5678",
  "dateOfBirth": "1990-01-15T00:00:00Z",
  "isActive": true
}
```
Copy the `id` from the response — you'll need it as `patientId` below.

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

**4. Book an appointment** — `POST /api/appointments` (anonymous, or Admin/Doctor/Receptionist)
```json
{
  "patientId": "<patientId from step 2>",
  "doctorId": "<doctorId from step 1>",
  "serviceId": "<serviceId from step 3, or null>",
  "appointmentDate": "2026-09-10T14:00:00Z",
  "status": "Pendiente",
  "notes": "First visit"
}
```
Valid `status` values: `Pendiente`, `Confirmada`, `Completada`, `Cancelada`, `No asistió`. The date must be in the future. Try sending the same `patientId`/`doctorId`/`appointmentDate` twice — the second call returns `409 Conflict` (the doctor already has a booking at that time).

**5. Create a treatment** — `POST /api/treatments` (Admin, Doctor, or Receptionist)
```json
{
  "patientId": "<patientId from step 2>",
  "doctorId": "<doctorId from step 1>",
  "name": "Root canal",
  "status": "Planificado",
  "startDate": "2026-09-10T00:00:00Z",
  "endDate": null,
  "cost": 300,
  "observations": "Upper left molar"
}
```
Valid `status` values: `Planificado`, `En curso`, `Completado`, `Cancelado`. Copy the `id` from the response — you'll need it as `treatmentId` below.

**6. Register a payment** — `POST /api/treatments/{treatmentId}/payments` (Admin or Receptionist)
```json
{
  "amount": 100,
  "paidAt": "2026-09-10T00:00:00Z",
  "method": "Cash",
  "notes": "First installment"
}
```
Try sending an `amount` greater than the treatment's remaining balance (`cost` minus payments so far) — it returns `400 Bad Request`.

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

`Backend/ClinicaDental.Tests` contains integration tests (xUnit + `WebApplicationFactory`) that spin up the full API against an in-memory SQLite database, without depending on SQL Server:

```bash
cd Backend/ClinicaDental.Tests
dotnet test
```

Current coverage:
- `AuthTests`: JWT issuance and validation, refresh token rotation, role-based authorization.
- `AppointmentConflictTests`: rejects two active appointments for the same doctor at the same time slot; allows reusing the slot after cancellation.
- `PaymentTests`: rejects payments that exceed a treatment's outstanding balance, including after partial payments.
- `DentalRecordTests`: dental record and its consultation history, including the restriction preventing access to another patient's record.
