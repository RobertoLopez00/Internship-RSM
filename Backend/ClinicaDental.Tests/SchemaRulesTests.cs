using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static ClinicaDental.Tests.TestHelpers;

namespace ClinicaDental.Tests;

// Rules introduced by the NormalizeSchema migration: catalogs, closed lists, nullable data that used to be
// faked, soft delete, uniqueness and the CHECK constraints. See docs/DB_NORMALIZATION.md.
public class SchemaRulesTests : IClassFixture<ClinicaAppFactory>
{
    private readonly ClinicaAppFactory _factory;
    public SchemaRulesTests(ClinicaAppFactory factory) => _factory = factory;

    [Fact]
    public async Task Doctor_IsReturnedWithFirstNameAndSpecialtyName()
    {
        var client = await _factory.AdminClientAsync();
        var id = await client.CreateDoctorAsync("Periodontics");

        var doctor = await client.GetFromJsonAsync<JsonElement>($"/api/doctors/{id}");
        Assert.Equal("Test", doctor.GetProperty("firstName").GetString());
        Assert.Equal("Periodontics", doctor.GetProperty("specialty").GetString());
        Assert.False(doctor.TryGetProperty("name", out _));
    }

    [Fact]
    public async Task Specialty_IsReusedIgnoringCaseAndSpaces()
    {
        var client = await _factory.AdminClientAsync();
        var first = await client.CreateDoctorAsync("Endodontics");
        var second = await client.CreateDoctorAsync("  endodontics ");

        var a = await client.GetFromJsonAsync<JsonElement>($"/api/doctors/{first}");
        var b = await client.GetFromJsonAsync<JsonElement>($"/api/doctors/{second}");
        Assert.Equal(a.GetProperty("specialtyId").GetGuid(), b.GetProperty("specialtyId").GetGuid());

        var names = await client.GetFromJsonAsync<List<string>>("/api/specialties");
        Assert.Single(names!, n => n.Equals("Endodontics", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Doctor_Put_UpdatesTheDoctor()
    {
        var client = await _factory.AdminClientAsync();
        var id = await client.CreateDoctorAsync();
        var email = $"{Unique("renamed")}@test.local";

        var put = await client.PutAsJsonAsync($"/api/doctors/{id}", new { firstName = "Renamed", lastName = "Doctor", specialty = "Orthodontics", phone = (string?)null, email });
        Assert.Equal(HttpStatusCode.NoContent, put.StatusCode);

        var doctor = await client.GetFromJsonAsync<JsonElement>($"/api/doctors/{id}");
        Assert.Equal("Renamed", doctor.GetProperty("firstName").GetString());
        Assert.Equal("Orthodontics", doctor.GetProperty("specialty").GetString());
        Assert.Equal(JsonValueKind.Null, doctor.GetProperty("phone").ValueKind);
    }

    [Fact]
    public async Task Patient_Put_AcceptsUnknownDateOfBirthAndPhone()
    {
        var client = await _factory.AdminClientAsync();
        var id = await client.CreatePatientAsync();

        var put = await client.PutAsJsonAsync($"/api/patients/{id}", new { firstName = "Edited", lastName = "Patient", email = $"{Unique("edited")}@test.local", phone = "", dateOfBirth = (string?)null });
        Assert.Equal(HttpStatusCode.NoContent, put.StatusCode);

        var patient = await client.GetFromJsonAsync<JsonElement>($"/api/patients/{id}");
        Assert.Equal(JsonValueKind.Null, patient.GetProperty("dateOfBirth").ValueKind);
        Assert.Equal(JsonValueKind.Null, patient.GetProperty("phone").ValueKind);
    }

    [Fact]
    public async Task Patient_DateOfBirth_RoundTripsAsPlainDate()
    {
        var client = await _factory.AdminClientAsync();
        var id = await client.CreatePatientAsync(dateOfBirth: "1990-03-15");

        var patient = await client.GetFromJsonAsync<JsonElement>($"/api/patients/{id}");
        Assert.Equal("1990-03-15", patient.GetProperty("dateOfBirth").GetString());
    }

    [Fact]
    public async Task Patient_EmailIsUniqueIgnoringCase()
    {
        var client = await _factory.AdminClientAsync();
        var email = $"{Unique("dup")}@test.local";
        await client.CreatePatientAsync(email);

        var second = await client.PostAsJsonAsync("/api/patients", new { firstName = "Other", lastName = "Patient", email = email.ToUpperInvariant(), phone = (string?)null, dateOfBirth = (string?)null });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Doctor_EmailIsUnique()
    {
        var client = await _factory.AdminClientAsync();
        var email = $"{Unique("dupdoc")}@test.local";
        await client.CreateDoctorAsync(email: email);

        var second = await client.PostAsJsonAsync("/api/doctors", new { firstName = "Other", lastName = "Doctor", specialty = "General Dentistry", phone = (string?)null, email });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Patient_Delete_DeactivatesProfileAndLogin()
    {
        var admin = await _factory.AdminClientAsync();
        var email = $"{Unique("soft")}@test.local";
        var register = await _factory.CreateClient().PostAsJsonAsync("/api/auth/register-patient", new { email, password = "Patient123!", firstName = "Soft", lastName = "Delete", phone = (string?)null, dateOfBirth = (string?)null });
        register.EnsureSuccessStatusCode();
        var patientId = (await register.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("user").GetProperty("patientId").GetGuid();

        var delete = await admin.DeleteAsync($"/api/patients/{patientId}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        var patient = await admin.GetFromJsonAsync<JsonElement>($"/api/patients/{patientId}");
        Assert.False(patient.GetProperty("isActive").GetBoolean());
        var login = await _factory.CreateClient().PostAsJsonAsync("/api/auth/login", new { email, password = "Patient123!" });
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task Patient_Reactivate_ReactivatesLogin()
    {
        var admin = await _factory.AdminClientAsync();
        var email = $"{Unique("react")}@test.local";
        var register = await _factory.CreateClient().PostAsJsonAsync("/api/auth/register-patient", new { email, password = "Patient123!", firstName = "Re", lastName = "Active", phone = (string?)null, dateOfBirth = (string?)null });
        var patientId = (await register.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("user").GetProperty("patientId").GetGuid();
        (await admin.DeleteAsync($"/api/patients/{patientId}")).EnsureSuccessStatusCode();

        var put = await admin.PutAsJsonAsync($"/api/patients/{patientId}", new { firstName = "Re", lastName = "Active", email, phone = (string?)null, dateOfBirth = (string?)null, isActive = true });
        Assert.Equal(HttpStatusCode.NoContent, put.StatusCode);

        var login = await _factory.CreateClient().PostAsJsonAsync("/api/auth/login", new { email, password = "Patient123!" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task Patient_WithUpcomingAppointment_CantBeDeactivated()
    {
        var client = await _factory.AdminClientAsync();
        var patientId = await client.CreatePatientAsync();
        var doctorId = await client.CreateDoctorAsync();
        (await client.BookAsync(patientId, doctorId, FutureSlot(20, 10))).EnsureSuccessStatusCode();

        var delete = await client.DeleteAsync($"/api/patients/{patientId}");
        Assert.Equal(HttpStatusCode.Conflict, delete.StatusCode);
        var doctorDelete = await client.DeleteAsync($"/api/doctors/{doctorId}");
        Assert.Equal(HttpStatusCode.Conflict, doctorDelete.StatusCode);
    }

    [Fact]
    public async Task Patient_IsActive_CanOnlyBeChangedByAdmin()
    {
        var admin = await _factory.AdminClientAsync();
        var email = $"{Unique("rec")}@test.local";
        (await admin.PostAsJsonAsync("/api/users", new { email, password = "Reception123!", role = "Receptionist", displayName = "Front Desk", patientId = (Guid?)null, doctorId = (Guid?)null })).EnsureSuccessStatusCode();
        var receptionist = _factory.CreateClient();
        var (token, _, _) = await LoginAsync(receptionist, email, "Reception123!");
        receptionist.WithToken(token);
        var patientEmail = $"{Unique("p")}@test.local";
        var patientId = await receptionist.CreatePatientAsync(patientEmail);

        var deactivate = await receptionist.PutAsJsonAsync($"/api/patients/{patientId}", new { firstName = "Test", lastName = "Patient", email = patientEmail, phone = (string?)null, dateOfBirth = (string?)null, isActive = false });
        Assert.Equal(HttpStatusCode.Forbidden, deactivate.StatusCode);
        var plainEdit = await receptionist.PutAsJsonAsync($"/api/patients/{patientId}", new { firstName = "Edited", lastName = "Patient", email = patientEmail, phone = (string?)null, dateOfBirth = (string?)null, isActive = true });
        Assert.Equal(HttpStatusCode.NoContent, plainEdit.StatusCode);
    }

    [Fact]
    public async Task Doctor_Deactivated_IsHiddenFromVisitorsButNotFromStaff()
    {
        var admin = await _factory.AdminClientAsync();
        var doctorId = await admin.CreateDoctorAsync();
        (await admin.DeleteAsync($"/api/doctors/{doctorId}")).EnsureSuccessStatusCode();

        var publicList = await _factory.CreateClient().GetFromJsonAsync<List<JsonElement>>("/api/doctors");
        Assert.DoesNotContain(publicList!, d => d.GetProperty("id").GetGuid() == doctorId);
        var staffList = await admin.GetFromJsonAsync<List<JsonElement>>("/api/doctors");
        Assert.Contains(staffList!, d => d.GetProperty("id").GetGuid() == doctorId && !d.GetProperty("isActive").GetBoolean());
    }

    [Fact]
    public async Task Service_Delete_Deactivates()
    {
        var admin = await _factory.AdminClientAsync();
        var serviceId = await admin.CreateServiceAsync(30);
        (await admin.DeleteAsync($"/api/services/{serviceId}")).EnsureSuccessStatusCode();

        var publicList = await _factory.CreateClient().GetFromJsonAsync<List<JsonElement>>("/api/services");
        Assert.DoesNotContain(publicList!, s => s.GetProperty("id").GetGuid() == serviceId);
        var staffList = await admin.GetFromJsonAsync<List<JsonElement>>("/api/services");
        Assert.Contains(staffList!, s => s.GetProperty("id").GetGuid() == serviceId && !s.GetProperty("isActive").GetBoolean());
    }

    [Fact]
    public async Task Service_NameIsUniqueIgnoringCase()
    {
        var admin = await _factory.AdminClientAsync();
        var name = Unique("Whitening");
        await admin.CreateServiceAsync(30, name);

        var duplicate = await admin.PostAsJsonAsync("/api/services", new { name = name.ToUpperInvariant(), description = (string?)null, basePrice = 10m, durationMinutes = 30, isActive = true });
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        var otherId = await admin.CreateServiceAsync(30);
        var rename = await admin.PutAsJsonAsync($"/api/services/{otherId}", new { name, description = (string?)null, basePrice = 10m, durationMinutes = 30, isActive = true });
        Assert.Equal(HttpStatusCode.Conflict, rename.StatusCode);
    }

    [Fact]
    public async Task Register_WithEmailOfExistingPatient_ReturnsConflictAndDoesNotLink()
    {
        var admin = await _factory.AdminClientAsync();
        var email = $"{Unique("existing")}@test.local";
        var patientId = await admin.CreatePatientAsync(email);

        var register = await _factory.CreateClient().PostAsJsonAsync("/api/auth/register-patient", new { email, password = "Patient123!", firstName = "Someone", lastName = "Else", phone = (string?)null, dateOfBirth = (string?)null });
        Assert.Equal(HttpStatusCode.Conflict, register.StatusCode);
        Assert.False(_factory.WithDb(db => db.Users.Any(u => u.PatientId == patientId || u.Email == email)));
        Assert.Equal(1, _factory.WithDb(db => db.Patients.Count(p => p.Email == email)));
    }

    [Fact]
    public async Task Register_WithoutDateOfBirth_StoresNull()
    {
        var email = $"{Unique("nodob")}@test.local";
        var register = await _factory.CreateClient().PostAsJsonAsync("/api/auth/register-patient", new { email, password = "Patient123!", firstName = "No", lastName = "Birthday", phone = "", dateOfBirth = (string?)null });
        register.EnsureSuccessStatusCode();
        var body = await register.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("No Birthday", body.GetProperty("user").GetProperty("displayName").GetString());

        var patient = _factory.WithDb(db => db.Patients.AsNoTracking().Single(p => p.Email == email));
        Assert.Null(patient.DateOfBirth);
        Assert.Null(patient.Phone);
    }

    [Fact]
    public async Task User_DisplayName_IsOnlyStoredForStaff()
    {
        var admin = await _factory.AdminClientAsync();
        var doctorId = await admin.CreateDoctorAsync();
        var email = $"{Unique("docuser")}@test.local";

        var create = await admin.PostAsJsonAsync("/api/users", new { email, password = "Doctor123!", role = "Doctor", displayName = "Ignored", doctorId, patientId = (Guid?)null });
        create.EnsureSuccessStatusCode();
        Assert.Equal("Dr. Test Doctor", (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("displayName").GetString());
        Assert.Null(_factory.WithDb(db => db.Users.Single(u => u.Email == email).DisplayName));

        var staffWithoutName = await admin.PostAsJsonAsync("/api/users", new { email = $"{Unique("staff")}@test.local", password = "Staff123!!", role = "Receptionist", displayName = "", patientId = (Guid?)null, doctorId = (Guid?)null });
        Assert.Equal(HttpStatusCode.BadRequest, staffWithoutName.StatusCode);
    }

    [Fact]
    public async Task User_CantLinkAProfileThatAlreadyHasALogin()
    {
        var admin = await _factory.AdminClientAsync();
        var doctorId = await admin.CreateDoctorAsync();
        (await admin.PostAsJsonAsync("/api/users", new { email = $"{Unique("one")}@test.local", password = "Doctor123!", role = "Doctor", doctorId, patientId = (Guid?)null })).EnsureSuccessStatusCode();

        var second = await admin.PostAsJsonAsync("/api/users", new { email = $"{Unique("two")}@test.local", password = "Doctor123!", role = "Doctor", doctorId, patientId = (Guid?)null });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Payment_MethodOutsideTheList_IsRejected()
    {
        var (client, treatmentId) = await SeedTreatmentAsync(100m);
        var response = await client.PostAsJsonAsync($"/api/treatments/{treatmentId}/payments", new { amount = 10m, paidAt = DateTime.UtcNow, method = "Bitcoin", notes = (string?)null });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Treatment_EndBeforeStart_IsRejected()
    {
        var client = await _factory.AdminClientAsync();
        var patientId = await client.CreatePatientAsync();
        var doctorId = await client.CreateDoctorAsync();
        var response = await client.PostAsJsonAsync("/api/treatments", new { patientId, doctorId, name = "Backwards", status = "Planned", startDate = DateTime.UtcNow, endDate = DateTime.UtcNow.AddDays(-1), cost = 10m, observations = (string?)null });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Treatment_CostBelowWhatWasPaid_IsRejected()
    {
        var (client, treatmentId) = await SeedTreatmentAsync(100m);
        (await client.PostAsJsonAsync($"/api/treatments/{treatmentId}/payments", new { amount = 80m, paidAt = DateTime.UtcNow, method = "Cash", notes = (string?)null })).EnsureSuccessStatusCode();
        var treatment = await client.GetFromJsonAsync<JsonElement>($"/api/treatments/{treatmentId}");

        var update = await client.PutAsJsonAsync($"/api/treatments/{treatmentId}", new { patientId = treatment.GetProperty("patientId").GetGuid(), doctorId = treatment.GetProperty("doctorId").GetGuid(), name = "Cheaper", status = "Planned", startDate = DateTime.UtcNow, endDate = (DateTime?)null, cost = 50m, observations = (string?)null });
        Assert.Equal(HttpStatusCode.BadRequest, update.StatusCode);
    }

    [Fact]
    public async Task Dates_AreReturnedAsUtc()
    {
        var client = await _factory.AdminClientAsync();
        var patientId = await client.CreatePatientAsync();
        var doctorId = await client.CreateDoctorAsync();
        var booking = await client.BookAsync(patientId, doctorId, FutureSlot(21, 10));
        booking.EnsureSuccessStatusCode();

        var appointment = await client.GetFromJsonAsync<JsonElement>($"/api/appointments/{await IdOf(booking)}");
        Assert.EndsWith("Z", appointment.GetProperty("appointmentDate").GetString());
        Assert.EndsWith("Z", appointment.GetProperty("createdAt").GetString());
    }

    [Fact]
    public async Task RefreshToken_Rotation_LinksTheReplacementById()
    {
        var client = _factory.CreateClient();
        var (_, refreshToken, _) = await LoginAsync(client, AdminEmail, AdminPassword);
        (await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken })).EnsureSuccessStatusCode();

        var linked = _factory.WithDb(db => db.RefreshTokens.Include(t => t.ReplacedByToken).AsNoTracking().ToList()
            .Where(t => t.RevokedAt != null && t.ReplacedByTokenId != null).ToList());
        Assert.NotEmpty(linked);
        Assert.All(linked, t => Assert.NotNull(t.ReplacedByToken));
    }

    [Fact]
    public async Task Audit_FillsCreatedAtAndUpdatedAtOnRealEdits()
    {
        var client = await _factory.AdminClientAsync();
        var email = $"{Unique("audit")}@test.local";
        var id = await client.CreatePatientAsync(email);
        var created = _factory.WithDb(db => db.Patients.AsNoTracking().Single(p => p.Id == id));
        Assert.NotEqual(default, created.CreatedAt);
        Assert.Null(created.UpdatedAt);

        (await client.PutAsJsonAsync($"/api/patients/{id}", new { firstName = "Audited", lastName = "Patient", email, phone = (string?)null, dateOfBirth = (string?)null })).EnsureSuccessStatusCode();
        var edited = _factory.WithDb(db => db.Patients.AsNoTracking().Single(p => p.Id == id));
        Assert.NotNull(edited.UpdatedAt);
        Assert.Equal(created.CreatedAt, edited.CreatedAt);
    }

    [Fact]
    public async Task Database_RejectsPaymentMethodOutsideTheList()
    {
        var (_, treatmentId) = await SeedTreatmentAsync(100m);
        var error = Assert.Throws<DbUpdateException>(() => _factory.WithDb(db =>
        {
            db.Payments.Add(new Payment { Id = Guid.NewGuid(), TreatmentId = treatmentId, Amount = 10m, PaidAt = DateTime.UtcNow, Method = "Bitcoin" });
            return db.SaveChanges();
        }));
        Assert.Contains("CK_Payments_Method", error.InnerException?.Message);
    }

    [Fact]
    public async Task Database_RejectsTwoActiveAppointmentsInTheSameDoctorSlot()
    {
        var client = await _factory.AdminClientAsync();
        var patientId = await client.CreatePatientAsync();
        var otherPatientId = await client.CreatePatientAsync();
        var doctorId = await client.CreateDoctorAsync();
        var start = FutureSlot(22, 10);

        Assert.Throws<DbUpdateException>(() => _factory.WithDb(db =>
        {
            db.Appointments.AddRange(
                new Appointment { Id = Guid.NewGuid(), PatientId = patientId, DoctorId = doctorId, AppointmentDate = start, EndsAt = start.AddMinutes(30) },
                new Appointment { Id = Guid.NewGuid(), PatientId = otherPatientId, DoctorId = doctorId, AppointmentDate = start, EndsAt = start.AddMinutes(30) });
            return db.SaveChanges();
        }));
    }

    private async Task<(HttpClient Client, Guid TreatmentId)> SeedTreatmentAsync(decimal cost)
    {
        var client = await _factory.AdminClientAsync();
        var patientId = await client.CreatePatientAsync();
        var doctorId = await client.CreateDoctorAsync();
        var response = await client.PostAsJsonAsync("/api/treatments", new { patientId, doctorId, name = "Treatment", status = "Planned", startDate = DateTime.UtcNow, endDate = (DateTime?)null, cost, observations = (string?)null });
        response.EnsureSuccessStatusCode();
        return (client, await IdOf(response));
    }
}
