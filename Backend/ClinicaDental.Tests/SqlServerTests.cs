using System.Net;
using System.Net.Http.Json;
using ClinicaDental.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using static ClinicaDental.Tests.TestHelpers;

namespace ClinicaDental.Tests;

// SQLite with EnsureCreated doesn't exercise the migrations or SQL Server-only pieces (filtered unique indexes,
// rowversion-style concurrency, CHECK constraints). These tests run the real migrations against SQL Server.
// They're skipped unless SQLSERVER_TEST_CONNECTION points at a server (CI provides one), for example:
//   SQLSERVER_TEST_CONNECTION="Server=localhost,1433;User Id=sa;Password=YourPassword123;TrustServerCertificate=True;"
public sealed class SqlServerFactAttribute : FactAttribute
{
    public const string Variable = "SQLSERVER_TEST_CONNECTION";

    public SqlServerFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(Variable)))
            Skip = $"Set {Variable} to run tests against SQL Server.";
    }
}

public class SqlServerAppFactory : WebApplicationFactory<Program>
{
    // A throwaway database per test run, dropped on dispose.
    private readonly string _connectionString = Environment.GetEnvironmentVariable(SqlServerFactAttribute.Variable) is { Length: > 0 } server
        ? new SqlConnectionStringBuilder(server) { InitialCatalog = $"ClinicaDentalTest_{Guid.NewGuid():N}" }.ConnectionString
        : "";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("ConnectionStrings:DefaultConnection", _connectionString);
        builder.UseSetting("Jwt:Key", "test-signing-key-at-least-32-characters-long");
        builder.UseSetting("Jwt:Issuer", "ClinicaDental");
        builder.UseSetting("Jwt:Audience", "ClinicaDental.Web");
        builder.UseSetting("Email:Enabled", "false");
        builder.UseSetting("BootstrapAdmin:Email", AdminEmail);
        builder.UseSetting("BootstrapAdmin:Password", AdminPassword);
        builder.UseSetting("BootstrapAdmin:DisplayName", "Test Admin");
        builder.UseSetting("SeedSampleData", "true");
        builder.UseSetting("Clinic:TimeZone", "UTC");
        builder.UseSetting("Clinic:OpenHour", "0");
        builder.UseSetting("Clinic:CloseHour", "24");
        builder.UseSetting("RateLimiting:Enabled", "false");
    }

    // xUnit disposes fixtures asynchronously, which stops the host before Dispose(bool) runs, so drop the database here.
    public override async ValueTask DisposeAsync()
    {
        if (_connectionString.Length > 0)
        {
            using var scope = Services.CreateScope();
            await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureDeletedAsync();
        }
        await base.DisposeAsync();
        GC.SuppressFinalize(this);
    }
}

public class SqlServerTests(SqlServerAppFactory factory) : IClassFixture<SqlServerAppFactory>
{
    [SqlServerFact]
    public async Task Migrations_ApplyCleanlyAndLeaveNoPendingModelChanges()
    {
        await factory.AdminClientAsync(); // starting the app runs Migrate() and the sample seed
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
        Assert.False(db.Database.HasPendingModelChanges());
        Assert.True(await db.Services.AnyAsync());
    }

    [SqlServerFact]
    public async Task OverlappingBookings_AreRejectedBySqlServer()
    {
        var admin = await factory.AdminClientAsync();
        var patientId = await admin.CreatePatientAsync();
        var otherPatient = await admin.CreatePatientAsync();
        var doctorId = await admin.CreateDoctorAsync();
        var start = FutureSlot(60, 10);

        var first = await admin.BookAsync(patientId, doctorId, start);
        var second = await admin.BookAsync(otherPatient, doctorId, start.AddMinutes(15));

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [SqlServerFact]
    public async Task DentalRecord_AuthorshipColumnsExistAndAreFilled()
    {
        var admin = await factory.AdminClientAsync();
        var patientId = await admin.CreatePatientAsync();
        var record = await (await admin.PutAsJsonAsync($"/api/patients/{patientId}/record", new { medicalHistory = "None", allergies = "", medications = "", observations = "" }))
            .Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();

        Assert.Equal("Test Admin", record.GetProperty("createdBy").GetString());
    }
}
