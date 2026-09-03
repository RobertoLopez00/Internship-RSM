using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace ClinicaDental.Tests;

public static class TestHelpers
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

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

    public const string AdminEmail = "admin@test.local";
    public const string AdminPassword = "AdminTest123!";
}
