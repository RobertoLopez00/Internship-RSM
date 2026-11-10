using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ClinicaDental.Domain.Entities;
using ClinicaDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using static ClinicaDental.Tests.TestHelpers;

namespace ClinicaDental.Tests;

// Second and third stage: overlap by duration, concurrency stamps, consultation <-> appointment link,
// statuses as enum names, and patient clashes. See docs/DB_NORMALIZATION.md.
public class ScheduleIntegrityTests : IClassFixture<ClinicaAppFactory>
{
    private readonly ClinicaAppFactory _factory;
    public ScheduleIntegrityTests(ClinicaAppFactory factory) => _factory = factory;

    private async Task<(HttpClient Client, Guid PatientId, Guid DoctorId)> SeedAsync()
    {
        var client = await _factory.AdminClientAsync();
        return (client, await client.CreatePatientAsync(), await client.CreateDoctorAsync());
    }

    [Fact]
    public async Task Booking_InsideAnotherAppointmentsDuration_ReturnsConflict()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var otherPatient = await client.CreatePatientAsync();
        var hourLong = await client.CreateServiceAsync(60);
        (await client.BookAsync(patientId, doctorId, FutureSlot(30, 10), hourLong)).EnsureSuccessStatusCode();

        var overlapping = await client.BookAsync(otherPatient, doctorId, FutureSlot(30, 10, 30));
        Assert.Equal(HttpStatusCode.Conflict, overlapping.StatusCode);
        Assert.Contains("doctor", (await overlapping.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("message").GetString());
    }

    [Fact]
    public async Task Booking_BackToBack_IsAllowed()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        (await client.BookAsync(patientId, doctorId, FutureSlot(31, 10))).EnsureSuccessStatusCode();

        var next = await client.BookAsync(patientId, doctorId, FutureSlot(31, 10, 30));
        Assert.Equal(HttpStatusCode.Created, next.StatusCode);
    }

    [Fact]
    public async Task Booking_StoresEndFromServiceDurationOrDefault()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var service = await client.CreateServiceAsync(45);
        var withService = await IdOf(await client.BookAsync(patientId, doctorId, FutureSlot(32, 9), service));
        var withoutService = await IdOf(await client.BookAsync(patientId, doctorId, FutureSlot(32, 11)));

        var a = await client.GetFromJsonAsync<Appointment>($"/api/appointments/{withService}", Json);
        var b = await client.GetFromJsonAsync<Appointment>($"/api/appointments/{withoutService}", Json);
        Assert.Equal(TimeSpan.FromMinutes(45), a!.EndsAt - a.AppointmentDate);
        Assert.Equal(TimeSpan.FromMinutes(Appointment.DefaultDurationMinutes), b!.EndsAt - b.AppointmentDate);
    }

    [Fact]
    public async Task NoShow_FreesTheTime()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var start = FutureSlot(33, 15);
        var id = await IdOf(await client.BookAsync(patientId, doctorId, start));
        (await client.PutAsJsonAsync($"/api/appointments/{id}", new { patientId, doctorId, serviceId = (Guid?)null, appointmentDate = start, status = "NoShow", notes = "" })).EnsureSuccessStatusCode();

        var again = await client.BookAsync(patientId, doctorId, start);
        Assert.Equal(HttpStatusCode.Created, again.StatusCode);
    }

    [Fact]
    public async Task Patient_CantHaveTwoOverlappingAppointmentsWithDifferentDoctors()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var otherDoctor = await client.CreateDoctorAsync();
        (await client.BookAsync(patientId, doctorId, FutureSlot(34, 10))).EnsureSuccessStatusCode();

        var clash = await client.BookAsync(patientId, otherDoctor, FutureSlot(34, 10, 15));
        Assert.Equal(HttpStatusCode.Conflict, clash.StatusCode);
        Assert.Equal("The patient already has another appointment at that time.", (await clash.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("message").GetString());
    }

    [Fact]
    public async Task Update_MovingIntoAnotherAppointment_ReturnsConflict()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var otherPatient = await client.CreatePatientAsync();
        (await client.BookAsync(patientId, doctorId, FutureSlot(35, 10))).EnsureSuccessStatusCode();
        var second = await IdOf(await client.BookAsync(otherPatient, doctorId, FutureSlot(35, 12)));

        var move = await client.PutAsJsonAsync($"/api/appointments/{second}", new { patientId = otherPatient, doctorId, serviceId = (Guid?)null, appointmentDate = FutureSlot(35, 10, 15), status = "Pending", notes = "" });
        Assert.Equal(HttpStatusCode.Conflict, move.StatusCode);
    }

    [Fact]
    public async Task Update_KeepsDuration_WhenOnlyTheServiceCatalogChanges()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var serviceName = Unique("Duration");
        var service = await client.CreateServiceAsync(60, serviceName);
        var start = FutureSlot(36, 9);
        var id = await IdOf(await client.BookAsync(patientId, doctorId, start, service));
        (await client.PutAsJsonAsync($"/api/services/{service}", new { name = serviceName, description = (string?)null, basePrice = 50m, durationMinutes = 15, isActive = true })).EnsureSuccessStatusCode();

        (await client.PutAsJsonAsync($"/api/appointments/{id}", new { patientId, doctorId, serviceId = service, appointmentDate = start.AddHours(1), status = "Confirmed", notes = "moved" })).EnsureSuccessStatusCode();
        var moved = await client.GetFromJsonAsync<Appointment>($"/api/appointments/{id}", Json);
        Assert.Equal(TimeSpan.FromMinutes(60), moved!.EndsAt - moved.AppointmentDate);
    }

    [Fact]
    public async Task Update_ChangingTheService_RecomputesTheEnd()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var service = await client.CreateServiceAsync(90);
        var start = FutureSlot(37, 9);
        var id = await IdOf(await client.BookAsync(patientId, doctorId, start));

        (await client.PutAsJsonAsync($"/api/appointments/{id}", new { patientId, doctorId, serviceId = service, appointmentDate = start, status = "Pending", notes = "" })).EnsureSuccessStatusCode();
        var updated = await client.GetFromJsonAsync<Appointment>($"/api/appointments/{id}", Json);
        Assert.Equal(TimeSpan.FromMinutes(90), updated!.EndsAt - updated.AppointmentDate);
    }

    [Fact]
    public async Task Availability_ReturnsRangesAndLegacySlots()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var service = await client.CreateServiceAsync(60);
        var start = FutureSlot(38, 14);
        (await client.BookAsync(patientId, doctorId, start, service)).EnsureSuccessStatusCode();

        var body = await _factory.CreateClient().GetFromJsonAsync<JsonElement>($"/api/appointments/availability?doctorId={doctorId}&date={start:yyyy-MM-dd}");
        var range = Assert.Single(body.GetProperty("booked").EnumerateArray());
        Assert.Equal(start, range.GetProperty("start").GetDateTime().ToUniversalTime());
        Assert.Equal(start.AddHours(1), range.GetProperty("end").GetDateTime().ToUniversalTime());
        Assert.Single(body.GetProperty("bookedSlots").EnumerateArray());
    }

    [Theory]
    [InlineData("\"No-show\"")]
    [InlineData("\"In progress\"")]
    [InlineData("4")]
    public async Task Status_OldLabelsAndNumbers_AreRejected(string status)
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var json = $$"""{"patientId":"{{patientId}}","doctorId":"{{doctorId}}","serviceId":null,"appointmentDate":"{{FutureSlot(39, 10):O}}","status":{{status}},"notes":""}""";
        var response = await client.PostAsync("/api/appointments", new StringContent(json, System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Status_IsSentAsTheEnumName()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var id = await IdOf(await client.BookAsync(patientId, doctorId, FutureSlot(40, 10), status: "NoShow"));

        var appointment = await client.GetFromJsonAsync<JsonElement>($"/api/appointments/{id}");
        Assert.Equal("NoShow", appointment.GetProperty("status").GetString());
        Assert.Equal("NoShow", _factory.WithDb(db => db.Database.SqlQueryRaw<string>("SELECT Status AS Value FROM Appointments WHERE Id = {0}", id).AsEnumerable().Single()));
    }

    [Fact]
    public async Task DoctorScheduleStamp_RejectsTheSecondOfTwoRacingBookings()
    {
        var (client, _, doctorId) = await SeedAsync();
        using var scopeA = _factory.Services.CreateScope();
        using var scopeB = _factory.Services.CreateScope();
        var a = scopeA.ServiceProvider.GetRequiredService<AppDbContext>();
        var b = scopeB.ServiceProvider.GetRequiredService<AppDbContext>();
        // Both requests read the doctor before either one saves, like two bookings arriving at the same time.
        var doctorA = await a.Doctors.SingleAsync(d => d.Id == doctorId);
        var doctorB = await b.Doctors.SingleAsync(d => d.Id == doctorId);

        doctorA.ScheduleStamp = Guid.NewGuid();
        await a.SaveChangesAsync();
        doctorB.ScheduleStamp = Guid.NewGuid();
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => b.SaveChangesAsync());
    }

    [Fact]
    public async Task TreatmentConcurrencyStamp_RejectsTheSecondOfTwoRacingPayments()
    {
        var client = await _factory.AdminClientAsync();
        var patientId = await client.CreatePatientAsync();
        var doctorId = await client.CreateDoctorAsync();
        var treatmentId = await IdOf(await client.PostAsJsonAsync("/api/treatments", new { patientId, doctorId, name = "Race", status = "Planned", startDate = DateTime.UtcNow, endDate = (DateTime?)null, cost = 100m, observations = (string?)null }));
        using var scopeA = _factory.Services.CreateScope();
        using var scopeB = _factory.Services.CreateScope();
        var a = scopeA.ServiceProvider.GetRequiredService<AppDbContext>();
        var b = scopeB.ServiceProvider.GetRequiredService<AppDbContext>();
        var treatmentA = await a.Treatments.SingleAsync(t => t.Id == treatmentId);
        var treatmentB = await b.Treatments.SingleAsync(t => t.Id == treatmentId);

        a.Payments.Add(new Payment { Id = Guid.NewGuid(), TreatmentId = treatmentId, Amount = 70m, PaidAt = DateTime.UtcNow, Method = PaymentMethods.Cash });
        treatmentA.ConcurrencyStamp = Guid.NewGuid();
        await a.SaveChangesAsync();
        b.Payments.Add(new Payment { Id = Guid.NewGuid(), TreatmentId = treatmentId, Amount = 70m, PaidAt = DateTime.UtcNow, Method = PaymentMethods.Cash });
        treatmentB.ConcurrencyStamp = Guid.NewGuid();
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => b.SaveChangesAsync());

        Assert.Equal(70m, _factory.WithDb(db => db.Payments.Where(p => p.TreatmentId == treatmentId).AsEnumerable().Sum(p => p.Amount)));
    }

    [Fact]
    public async Task StampOnlyChange_DoesNotCountAsAnEdit()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        (await client.BookAsync(patientId, doctorId, FutureSlot(41, 10))).EnsureSuccessStatusCode();

        var doctor = _factory.WithDb(db => db.Doctors.AsNoTracking().Single(d => d.Id == doctorId));
        var patient = _factory.WithDb(db => db.Patients.AsNoTracking().Single(p => p.Id == patientId));
        Assert.Null(doctor.UpdatedAt);
        Assert.Null(patient.UpdatedAt);
    }

    [Fact]
    public async Task Consultation_LinkedToTheSamePatientsAppointment_IsSaved()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var appointmentId = await IdOf(await client.BookAsync(patientId, doctorId, FutureSlot(42, 10)));

        var response = await client.PostAsJsonAsync($"/api/patients/{patientId}/record/consultations", new { doctorId, consultationDate = DateTime.UtcNow, notes = "Checkup", diagnosis = (string?)null, appointmentId });
        response.EnsureSuccessStatusCode();
        Assert.Equal(appointmentId, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("appointmentId").GetGuid());
    }

    [Fact]
    public async Task Consultation_WithAnotherPatientsAppointment_IsRejected()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var otherPatient = await client.CreatePatientAsync();
        var appointmentId = await IdOf(await client.BookAsync(otherPatient, doctorId, FutureSlot(43, 10)));

        var response = await client.PostAsJsonAsync($"/api/patients/{patientId}/record/consultations", new { doctorId, consultationDate = DateTime.UtcNow, notes = "Wrong", diagnosis = (string?)null, appointmentId });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Consultation_SecondOneForTheSameAppointment_ReturnsConflict()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var appointmentId = await IdOf(await client.BookAsync(patientId, doctorId, FutureSlot(44, 10)));
        (await client.PostAsJsonAsync($"/api/patients/{patientId}/record/consultations", new { doctorId, consultationDate = DateTime.UtcNow, notes = "First", diagnosis = (string?)null, appointmentId })).EnsureSuccessStatusCode();

        var second = await client.PostAsJsonAsync($"/api/patients/{patientId}/record/consultations", new { doctorId, consultationDate = DateTime.UtcNow, notes = "Second", diagnosis = (string?)null, appointmentId });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task DeletingTheAppointment_OnlyClearsTheConsultationLink()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var appointmentId = await IdOf(await client.BookAsync(patientId, doctorId, FutureSlot(45, 10)));
        var consultation = await client.PostAsJsonAsync($"/api/patients/{patientId}/record/consultations", new { doctorId, consultationDate = DateTime.UtcNow, notes = "Kept", diagnosis = (string?)null, appointmentId });
        var consultationId = await IdOf(consultation);

        (await client.DeleteAsync($"/api/appointments/{appointmentId}")).EnsureSuccessStatusCode();
        var kept = _factory.WithDb(db => db.Consultations.AsNoTracking().Single(c => c.Id == consultationId));
        Assert.Null(kept.AppointmentId);
    }
}
