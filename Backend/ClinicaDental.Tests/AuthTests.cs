using System.Net;
using System.Net.Http.Json;
using static ClinicaDental.Tests.TestHelpers;

namespace ClinicaDental.Tests;

public class AuthTests : IClassFixture<ClinicaAppFactory>
{
    private readonly ClinicaAppFactory _factory;
    public AuthTests(ClinicaAppFactory factory) => _factory = factory;

    [Fact]
    public async Task Login_WithBootstrapAdmin_ReturnsTokens()
    {
        var client = _factory.CreateClient();
        var (accessToken, refreshToken, user) = await LoginAsync(client, AdminEmail, AdminPassword);

        Assert.False(string.IsNullOrWhiteSpace(accessToken));
        Assert.False(string.IsNullOrWhiteSpace(refreshToken));
        Assert.Equal("Admin", user.GetProperty("role").GetString());
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email = AdminEmail, password = "wrong-password" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_WithoutToken_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/patients");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AdminOnlyEndpoint_WithNonAdminRole_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        var (adminToken, _, _) = await LoginAsync(client, AdminEmail, AdminPassword);

        var doctorEmail = $"doctor-{Guid.NewGuid():N}@test.local";
        var createDoctor = await client.WithToken(adminToken).PostAsJsonAsync("/api/doctors", new { name = "Ana", lastName = "Ruiz", specialty = "General", phone = "555", email = "ana@test.local", isActive = true });
        createDoctor.EnsureSuccessStatusCode();
        var doctorId = (await createDoctor.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("id").GetGuid();

        var createUser = await client.WithToken(adminToken).PostAsJsonAsync("/api/users", new { email = doctorEmail, password = "DoctorPass123!", role = "Doctor", displayName = "Dr. Ana Ruiz", doctorId, patientId = (Guid?)null });
        createUser.EnsureSuccessStatusCode();

        var doctorClient = _factory.CreateClient();
        var (doctorToken, _, _) = await LoginAsync(doctorClient, doctorEmail, "DoctorPass123!");

        var response = await doctorClient.WithToken(doctorToken).GetAsync("/api/users");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_WithValidToken_IssuesNewAccessToken()
    {
        var client = _factory.CreateClient();
        var (_, refreshToken, _) = await LoginAsync(client, AdminEmail, AdminPassword);

        var response = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("accessToken").GetString()));
    }

    [Fact]
    public async Task Refresh_ReusingRevokedToken_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();
        var (_, refreshToken, _) = await LoginAsync(client, AdminEmail, AdminPassword);

        var first = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken });
        first.EnsureSuccessStatusCode();

        var reuse = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, reuse.StatusCode);
    }
}
