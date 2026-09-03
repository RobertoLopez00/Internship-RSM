using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using static ClinicaDental.Tests.TestHelpers;

namespace ClinicaDental.Tests;

public class AppointmentConflictTests : IClassFixture<ClinicaAppFactory>
{
    private readonly ClinicaAppFactory _factory;
    public AppointmentConflictTests(ClinicaAppFactory factory) => _factory = factory;

    private async Task<(HttpClient Client, Guid PatientId, Guid DoctorId)> SeedAsync()
    {
        var client = _factory.CreateClient();
        var (adminToken, _, _) = await LoginAsync(client, AdminEmail, AdminPassword);
        client.WithToken(adminToken);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var patientResponse = await client.PostAsJsonAsync("/api/patients", new { firstName = "Juan", lastName = "Test", email = $"juan-{suffix}@test.local", phone = "555", dateOfBirth = DateTime.UtcNow.AddYears(-30), isActive = true });
        patientResponse.EnsureSuccessStatusCode();
        var patientId = (await patientResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var doctorResponse = await client.PostAsJsonAsync("/api/doctors", new { name = "Carlos", lastName = "Test", specialty = "General", phone = "555", email = $"doc-{suffix}@test.local", isActive = true });
        doctorResponse.EnsureSuccessStatusCode();
        var doctorId = (await doctorResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        return (client, patientId, doctorId);
    }

    [Fact]
    public async Task CreateAppointment_SameDoctorSameSlot_ReturnsConflict()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var date = DateTime.UtcNow.AddDays(3).Date.AddHours(10);

        var first = await client.PostAsJsonAsync("/api/appointments", new { patientId, doctorId, serviceId = (Guid?)null, appointmentDate = date, status = "Pending", notes = "" });
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        var second = await client.PostAsJsonAsync("/api/appointments", new { patientId, doctorId, serviceId = (Guid?)null, appointmentDate = date, status = "Pending", notes = "" });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task CreateAppointment_SameDoctorDifferentSlot_Succeeds()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var date1 = DateTime.UtcNow.AddDays(4).Date.AddHours(9);
        var date2 = DateTime.UtcNow.AddDays(4).Date.AddHours(11);

        var first = await client.PostAsJsonAsync("/api/appointments", new { patientId, doctorId, serviceId = (Guid?)null, appointmentDate = date1, status = "Pending", notes = "" });
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        var second = await client.PostAsJsonAsync("/api/appointments", new { patientId, doctorId, serviceId = (Guid?)null, appointmentDate = date2, status = "Pending", notes = "" });
        Assert.Equal(HttpStatusCode.Created, second.StatusCode);
    }

    [Fact]
    public async Task CreateAppointment_SameSlotAfterCancellation_Succeeds()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var date = DateTime.UtcNow.AddDays(5).Date.AddHours(14);

        var first = await client.PostAsJsonAsync("/api/appointments", new { patientId, doctorId, serviceId = (Guid?)null, appointmentDate = date, status = "Pending", notes = "" });
        first.EnsureSuccessStatusCode();
        var firstId = (await first.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var cancel = await client.PutAsJsonAsync($"/api/appointments/{firstId}", new { patientId, doctorId, serviceId = (Guid?)null, appointmentDate = date, status = "Cancelled", notes = "" });
        Assert.Equal(HttpStatusCode.NoContent, cancel.StatusCode);

        var second = await client.PostAsJsonAsync("/api/appointments", new { patientId, doctorId, serviceId = (Guid?)null, appointmentDate = date, status = "Pending", notes = "" });
        Assert.Equal(HttpStatusCode.Created, second.StatusCode);
    }

    [Fact]
    public async Task CreateAppointment_InThePast_ReturnsBadRequest()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var response = await client.PostAsJsonAsync("/api/appointments", new { patientId, doctorId, serviceId = (Guid?)null, appointmentDate = DateTime.UtcNow.AddDays(-1), status = "Pending", notes = "" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
