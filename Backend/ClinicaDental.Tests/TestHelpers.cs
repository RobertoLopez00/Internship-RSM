using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ClinicaDental.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace ClinicaDental.Tests;

public static class TestHelpers
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() } };

    public static async Task<(string AccessToken, string RefreshToken, JsonElement User)> LoginAsync(HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return (body.GetProperty("accessToken").GetString()!, body.GetProperty("refreshToken").GetString()!, body.GetProperty("user"));
    }

    public static HttpClient WithToken(this HttpClient client, string token)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    public static async Task<HttpClient> AdminClientAsync(this ClinicaAppFactory factory)
    {
        var client = factory.CreateClient();
        var (token, _, _) = await LoginAsync(client, AdminEmail, AdminPassword);
        return client.WithToken(token);
    }

    public static string Unique(string prefix) => $"{prefix}-{Guid.NewGuid().ToString("N")[..8]}";

    public static async Task<Guid> CreatePatientAsync(this HttpClient client, string? email = null, string dateOfBirth = "1990-03-15")
    {
        var response = await client.PostAsJsonAsync("/api/patients", new { firstName = "Test", lastName = "Patient", email = email ?? $"{Unique("patient")}@test.local", phone = "555", dateOfBirth });
        response.EnsureSuccessStatusCode();
        return await IdOf(response);
    }

    public static async Task<Guid> CreateDoctorAsync(this HttpClient client, string specialty = "General Dentistry", string? email = null)
    {
        var response = await client.PostAsJsonAsync("/api/doctors", new { firstName = "Test", lastName = "Doctor", specialty, phone = "555", email = email ?? $"{Unique("doctor")}@test.local" });
        response.EnsureSuccessStatusCode();
        return await IdOf(response);
    }

    public static async Task<Guid> CreateServiceAsync(this HttpClient client, int durationMinutes, string? name = null)
    {
        var response = await client.PostAsJsonAsync("/api/services", new { name = name ?? Unique("Service"), description = (string?)null, basePrice = 50m, durationMinutes, isActive = true });
        response.EnsureSuccessStatusCode();
        return await IdOf(response);
    }

    public static Task<HttpResponseMessage> BookAsync(this HttpClient client, Guid patientId, Guid doctorId, DateTime start, Guid? serviceId = null, string status = "Pending") =>
        client.PostAsJsonAsync("/api/appointments", new { patientId, doctorId, serviceId, appointmentDate = start, status, notes = "" });

    public static async Task<Guid> IdOf(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

    // A future day at a fixed UTC hour, spread out per test so tests sharing a database don't collide.
    public static DateTime FutureSlot(int dayOffset, int hour, int minute = 0) => DateTime.UtcNow.Date.AddDays(dayOffset).AddHours(hour).AddMinutes(minute);

    public static T WithDb<T>(this ClinicaAppFactory factory, Func<AppDbContext, T> action)
    {
        using var scope = factory.Services.CreateScope();
        return action(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    public const string AdminEmail = "admin@test.local";
    public const string AdminPassword = "AdminTest123!";
}
