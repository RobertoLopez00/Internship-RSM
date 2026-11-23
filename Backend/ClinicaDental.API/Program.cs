using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using ClinicaDental.API.Services;
using ClinicaDental.Application.Appointments;
using ClinicaDental.Application.Clinic;
using ClinicaDental.Application.Interfaces;
using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using ClinicaDental.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    // Statuses travel as their names ("NoShow"). Numbers and old labels ("No-show") are rejected with 400.
    options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter(allowIntegerValues: false));
});
// Constraint violations and concurrency conflicts become 409 instead of 500 (see DbUpdateExceptionHandler).
builder.Services.AddExceptionHandler<DbUpdateExceptionHandler>();
builder.Services.AddProblemDetails();
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

// Fail fast at startup rather than issuing tokens that can never be validated, or that anyone could forge.
var jwtSettings = builder.Configuration.GetSection("Jwt");
var jwtKey = JwtKeyValidator.Validate(jwtSettings["Key"]);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
    options.TokenValidationParameters = new TokenValidationParameters
    {
        // Validate all standard claims so a token issued for another app/env can't be replayed here.
        ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"], ValidAudience = jwtSettings["Audience"],
        // ClockSkew = 0 makes expiry exact instead of the 5-minute default grace period.
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)), ClockSkew = TimeSpan.Zero
    });
builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();

// Clinic time zone, opening hours and currency. ClinicClock validates them, so a typo fails at startup.
var clinicOptions = builder.Configuration.GetSection("Clinic").Get<ClinicOptions>() ?? new ClinicOptions();
builder.Services.AddSingleton(clinicOptions);
builder.Services.AddSingleton(new ClinicClock(clinicOptions));
builder.Services.AddScoped<AppointmentScheduler>();

// Runs as a background hosted service for the lifetime of the app, periodically scanning for
// upcoming appointments and sending reminder emails (see AppointmentReminderService).
builder.Services.AddHostedService<AppointmentReminderService>();
builder.Services.AddHostedService<RefreshTokenCleanupService>();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ??
    "Server=(localdb)\\mssqllocaldb;Database=ClinicaDentalDb;Trusted_Connection=True;TrustServerCertificate=True;";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.MigrationsAssembly("ClinicaDental.API");
    }));
builder.Services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("database");

builder.Services.AddScoped<IPatientRepository, PatientRepository>();
builder.Services.AddScoped<IDoctorRepository, DoctorRepository>();
builder.Services.AddScoped<IAppointmentRepository, AppointmentRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IDentalServiceRepository, DentalServiceRepository>();
builder.Services.AddScoped<ITreatmentRepository, TreatmentRepository>();
builder.Services.AddScoped<IDentalRecordRepository, DentalRecordRepository>();

// Only needed when the frontend runs on another origin (Vite dev server). In Docker the API serves the UI itself.
var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() is { Length: > 0 } origins
    ? origins
    : ["http://localhost:5173", "http://localhost:5174"];
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .WithExposedHeaders(PagingHeaders.TotalCount);
    });
});

// Per-client limits on the endpoints anyone can call: guessing passwords, mass registration, spam bookings and
// contact messages. Signed-in callers are counted per user, anonymous ones per IP address.
var rateLimits = builder.Configuration.GetSection("RateLimiting");
var rateLimitingEnabled = rateLimits.GetValue("Enabled", true);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
        await context.HttpContext.Response.WriteAsJsonAsync(new { message = "Too many attempts. Please wait a minute and try again." }, token);
    };
    void AddPolicy(string name, int defaultPermits) => options.AddPolicy(name, context =>
    {
        if (!rateLimitingEnabled) return RateLimitPartition.GetNoLimiter("disabled");
        var key = context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = rateLimits.GetValue($"{name}PerMinute", defaultPermits),
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        });
    });
    AddPolicy(RateLimitPolicies.Login, 10);
    AddPolicy(RateLimitPolicies.Register, 5);
    AddPolicy(RateLimitPolicies.Refresh, 30);
    AddPolicy(RateLimitPolicies.Booking, 20);
    AddPolicy(RateLimitPolicies.Contact, 5);
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
    // Sqlite (used for local/test runs) doesn't support migrations the same way SQL Server does,
    // so fall back to EnsureCreated for it and only migrate against real SQL Server.
    if (db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true) db.Database.EnsureCreated();
    else db.Database.Migrate();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var adminEmail = configuration["BootstrapAdmin:Email"]?.Trim().ToLower();
    var adminPassword = configuration["BootstrapAdmin:Password"];
    // One-time bootstrap: only creates an admin if none exists yet, so this is safe to run on every startup.
    if (!string.IsNullOrWhiteSpace(adminEmail) && !string.IsNullOrWhiteSpace(adminPassword) && !db.Users.Any(x => x.Role == UserRoles.Admin))
    {
        var admin = new User { Id = Guid.NewGuid(), Email = adminEmail, Role = UserRoles.Admin, DisplayName = configuration["BootstrapAdmin:DisplayName"] ?? "Administrator" };
        admin.PasswordHash = new PasswordHasher<User>().HashPassword(admin, adminPassword);
        db.Users.Add(admin); db.SaveChanges();
    }

    if (configuration.GetValue("SeedSampleData", true)) ClinicaDental.API.SeedData.SeedSampleData(db);
}

app.UseExceptionHandler();

// Order matters: CORS must run before auth so preflight requests aren't rejected,
// and Authentication must run before Authorization so User.Identity is populated before role checks.
app.UseHttpsRedirection();
app.UseCors("FrontendPolicy");
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
// After authentication, so signed-in callers are limited per user rather than per IP.
app.UseRateLimiter();
app.MapHealthChecks("/health");
app.MapControllers();
// SPA fallback: any unmatched route serves index.html so client-side routing can take over.
app.MapFallbackToFile("index.html");

app.Run();
