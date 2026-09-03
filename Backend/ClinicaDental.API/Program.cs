using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Infrastructure.Persistence;
using ClinicaDental.API.Services;
using ClinicaDental.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization", Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT",
        In = ParameterLocation.Header, Description = "Enter only the JWT token (do not type Bearer)."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() }
    });
});

var jwtSettings = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSettings["Key"] ?? throw new InvalidOperationException("Jwt:Key must be configured via user-secrets or environment variables.");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"], ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)), ClockSkew = TimeSpan.Zero
    });
builder.Services.AddAuthorization();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
builder.Services.AddHostedService<AppointmentReminderService>();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ??
    "Server=(localdb)\\mssqllocaldb;Database=ClinicaDentalDb;Trusted_Connection=True;TrustServerCertificate=True;";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.MigrationsAssembly("ClinicaDental.API");
    }));

builder.Services.AddScoped<IPatientRepository, PatientRepository>();
builder.Services.AddScoped<IDoctorRepository, DoctorRepository>();
builder.Services.AddScoped<IAppointmentRepository, AppointmentRepository>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true) db.Database.EnsureCreated();
    else db.Database.Migrate();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var adminEmail = configuration["BootstrapAdmin:Email"]?.Trim().ToLower();
    var adminPassword = configuration["BootstrapAdmin:Password"];
    if (!string.IsNullOrWhiteSpace(adminEmail) && !string.IsNullOrWhiteSpace(adminPassword) && !db.Users.Any(x => x.Role == UserRoles.Admin))
    {
        var admin = new User { Id = Guid.NewGuid(), Email = adminEmail, Role = UserRoles.Admin, DisplayName = configuration["BootstrapAdmin:DisplayName"] ?? "Administrator" };
        admin.PasswordHash = new PasswordHasher<User>().HashPassword(admin, adminPassword);
        db.Users.Add(admin); db.SaveChanges();
    }

    if (configuration.GetValue("SeedSampleData", true)) ClinicaDental.API.SeedData.SeedSampleData(db);
}

app.UseHttpsRedirection();
app.UseCors("FrontendPolicy");
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
