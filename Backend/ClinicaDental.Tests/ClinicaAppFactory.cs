using ClinicaDental.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using System.Linq;

namespace ClinicaDental.Tests;

public class ClinicaAppFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _connection.Open();

        builder.UseEnvironment("Development");
        builder.UseSetting("Jwt:Key", "test-signing-key-at-least-32-characters-long");
        builder.UseSetting("Jwt:Issuer", "ClinicaDental");
        builder.UseSetting("Jwt:Audience", "ClinicaDental.Web");
        builder.UseSetting("Jwt:AccessTokenMinutes", "15");
        builder.UseSetting("Jwt:RefreshTokenDays", "7");
        builder.UseSetting("Email:Enabled", "false");
        builder.UseSetting("BootstrapAdmin:Email", "admin@test.local");
        builder.UseSetting("BootstrapAdmin:Password", "AdminTest123!");
        builder.UseSetting("BootstrapAdmin:DisplayName", "Test Admin");
        builder.UseSetting("SeedSampleData", "false");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll(typeof(DbContextOptions<AppDbContext>));
            foreach (var descriptor in services.Where(d => d.ServiceType.IsGenericType && d.ServiceType.GetGenericTypeDefinition().Name.Contains("IDbContextOptionsConfiguration")).ToList())
                services.Remove(descriptor);
            services.RemoveAll<AppDbContext>();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _connection.Dispose();
    }
}
