using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using static ClinicaDental.Tests.TestHelpers;

namespace ClinicaDental.Tests;

public class DentalRecordTests : IClassFixture<ClinicaAppFactory>
{
    private readonly ClinicaAppFactory _factory;
    public DentalRecordTests(ClinicaAppFactory factory) => _factory = factory;

    private async Task<(HttpClient Client, Guid PatientId, Guid DoctorId)> SeedAsync()
    {
        var client = _factory.CreateClient();
        var (adminToken, _, _) = await LoginAsync(client, AdminEmail, AdminPassword);
        client.WithToken(adminToken);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var patientResponse = await client.PostAsJsonAsync("/api/patients", new { firstName = "Expediente", lastName = "Test", email = $"exp-{suffix}@test.local", phone = "555", dateOfBirth = DateTime.UtcNow.AddYears(-40), isActive = true });
        patientResponse.EnsureSuccessStatusCode();
        var patientId = (await patientResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var doctorResponse = await client.PostAsJsonAsync("/api/doctors", new { name = "Doc", lastName = "Exp", specialty = "General", phone = "555", email = $"docexp-{suffix}@test.local", isActive = true });
        doctorResponse.EnsureSuccessStatusCode();
        var doctorId = (await doctorResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        return (client, patientId, doctorId);
    }

    [Fact]
    public async Task GetRecord_BeforeCreation_ReturnsNotFound()
    {
        var (client, patientId, _) = await SeedAsync();
        var response = await client.GetAsync($"/api/patients/{patientId}/record");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpsertRecord_ThenGet_ReturnsStoredData()
    {
        var (client, patientId, _) = await SeedAsync();
        var upsert = await client.PutAsJsonAsync($"/api/patients/{patientId}/record", new { medicalHistory = "Hypertension", allergies = "Penicillin", medications = "None", observations = "Cooperative patient" });
        upsert.EnsureSuccessStatusCode();

        var response = await client.GetAsync($"/api/patients/{patientId}/record");
        response.EnsureSuccessStatusCode();
        var record = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Penicillin", record.GetProperty("allergies").GetString());
    }

    [Fact]
    public async Task AddConsultation_WithoutRecord_ReturnsBadRequest()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var response = await client.PostAsJsonAsync($"/api/patients/{patientId}/record/consultations", new { doctorId, consultationDate = DateTime.UtcNow, notes = "Primera visita", diagnosis = (string?)null });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddConsultation_AfterRecordExists_AppearsInHistory()
    {
        var (client, patientId, doctorId) = await SeedAsync();
        var upsert = await client.PutAsJsonAsync($"/api/patients/{patientId}/record", new { medicalHistory = "", allergies = "", medications = "", observations = "" });
        upsert.EnsureSuccessStatusCode();

        var addConsultation = await client.PostAsJsonAsync($"/api/patients/{patientId}/record/consultations", new { doctorId, consultationDate = DateTime.UtcNow, notes = "Limpieza dental de rutina", diagnosis = "Sin caries" });
        addConsultation.EnsureSuccessStatusCode();

        var response = await client.GetAsync($"/api/patients/{patientId}/record");
        response.EnsureSuccessStatusCode();
        var record = await response.Content.ReadFromJsonAsync<JsonElement>();
        var consultations = record.GetProperty("consultations").EnumerateArray().ToList();
        Assert.Single(consultations);
        Assert.Equal("Sin caries", consultations[0].GetProperty("diagnosis").GetString());
    }

    [Fact]
    public async Task GetRecord_AsUnrelatedPatientUser_ReturnsForbidden()
    {
        var (adminClient, patientId, _) = await SeedAsync();
        var upsert = await adminClient.PutAsJsonAsync($"/api/patients/{patientId}/record", new { medicalHistory = "", allergies = "", medications = "", observations = "" });
        upsert.EnsureSuccessStatusCode();

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var otherPatientResponse = await adminClient.PostAsJsonAsync("/api/patients", new { firstName = "Otro", lastName = "Paciente", email = $"otro-{suffix}@test.local", phone = "555", dateOfBirth = DateTime.UtcNow.AddYears(-20), isActive = true });
        otherPatientResponse.EnsureSuccessStatusCode();
        var otherPatientId = (await otherPatientResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var otherUserEmail = $"user-{suffix}@test.local";
        var createUser = await adminClient.PostAsJsonAsync("/api/users", new { email = otherUserEmail, password = "PatientPass123!", role = "Patient", displayName = "Otro Paciente", patientId = otherPatientId, doctorId = (Guid?)null });
        createUser.EnsureSuccessStatusCode();

        var patientClient = _factory.CreateClient();
        var (patientToken, _, _) = await LoginAsync(patientClient, otherUserEmail, "PatientPass123!");

        var response = await patientClient.WithToken(patientToken).GetAsync($"/api/patients/{patientId}/record");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
