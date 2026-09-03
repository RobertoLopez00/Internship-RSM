using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using static ClinicaDental.Tests.TestHelpers;

namespace ClinicaDental.Tests;

public class PaymentTests : IClassFixture<ClinicaAppFactory>
{
    private readonly ClinicaAppFactory _factory;
    public PaymentTests(ClinicaAppFactory factory) => _factory = factory;

    private async Task<(HttpClient Client, Guid TreatmentId)> SeedTreatmentAsync(decimal cost)
    {
        var client = _factory.CreateClient();
        var (adminToken, _, _) = await LoginAsync(client, AdminEmail, AdminPassword);
        client.WithToken(adminToken);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var patientResponse = await client.PostAsJsonAsync("/api/patients", new { firstName = "Pago", lastName = "Test", email = $"pago-{suffix}@test.local", phone = "555", dateOfBirth = DateTime.UtcNow.AddYears(-25), isActive = true });
        patientResponse.EnsureSuccessStatusCode();
        var patientId = (await patientResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var doctorResponse = await client.PostAsJsonAsync("/api/doctors", new { name = "Doc", lastName = "Pago", specialty = "General", phone = "555", email = $"docpago-{suffix}@test.local", isActive = true });
        doctorResponse.EnsureSuccessStatusCode();
        var doctorId = (await doctorResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var treatmentResponse = await client.PostAsJsonAsync("/api/treatments", new { patientId, doctorId, name = "Test treatment", status = "Planned", startDate = DateTime.UtcNow, endDate = (DateTime?)null, cost, observations = (string?)null });
        treatmentResponse.EnsureSuccessStatusCode();
        var treatmentId = (await treatmentResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        return (client, treatmentId);
    }

    [Fact]
    public async Task AddPayment_ExceedingBalance_ReturnsBadRequest()
    {
        var (client, treatmentId) = await SeedTreatmentAsync(100m);
        var response = await client.PostAsJsonAsync($"/api/treatments/{treatmentId}/payments", new { amount = 150m, paidAt = DateTime.UtcNow, method = "Efectivo", notes = (string?)null });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddPayment_WithinBalance_Succeeds()
    {
        var (client, treatmentId) = await SeedTreatmentAsync(100m);
        var response = await client.PostAsJsonAsync($"/api/treatments/{treatmentId}/payments", new { amount = 60m, paidAt = DateTime.UtcNow, method = "Efectivo", notes = (string?)null });
        Assert.True(response.IsSuccessStatusCode);
    }

    [Fact]
    public async Task AddPayment_ExceedingRemainingBalanceAfterPartialPayment_ReturnsBadRequest()
    {
        var (client, treatmentId) = await SeedTreatmentAsync(100m);
        var partial = await client.PostAsJsonAsync($"/api/treatments/{treatmentId}/payments", new { amount = 70m, paidAt = DateTime.UtcNow, method = "Efectivo", notes = (string?)null });
        partial.EnsureSuccessStatusCode();

        var overPay = await client.PostAsJsonAsync($"/api/treatments/{treatmentId}/payments", new { amount = 40m, paidAt = DateTime.UtcNow, method = "Efectivo", notes = (string?)null });
        Assert.Equal(HttpStatusCode.BadRequest, overPay.StatusCode);
    }

    [Fact]
    public async Task AddPayment_ExactRemainingBalance_Succeeds()
    {
        var (client, treatmentId) = await SeedTreatmentAsync(100m);
        var partial = await client.PostAsJsonAsync($"/api/treatments/{treatmentId}/payments", new { amount = 70m, paidAt = DateTime.UtcNow, method = "Efectivo", notes = (string?)null });
        partial.EnsureSuccessStatusCode();

        var remainder = await client.PostAsJsonAsync($"/api/treatments/{treatmentId}/payments", new { amount = 30m, paidAt = DateTime.UtcNow, method = "Efectivo", notes = (string?)null });
        Assert.True(remainder.IsSuccessStatusCode);
    }
}
