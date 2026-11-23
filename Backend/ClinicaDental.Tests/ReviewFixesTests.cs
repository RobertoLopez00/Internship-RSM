using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ClinicaDental.API.Services;
using ClinicaDental.Application.Clinic;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using static ClinicaDental.Tests.TestHelpers;

namespace ClinicaDental.Tests;

// Booking ownership, refresh-token reuse, response shapes, paging, authorship and health.
public class ReviewFixesTests(ClinicaAppFactory factory) : IClassFixture<ClinicaAppFactory>
{
    private async Task<(HttpClient Client, Guid PatientId)> PatientLoginAsync(HttpClient admin)
    {
        var email = $"{Unique("self")}@test.local";
        var register = await factory.CreateClient().PostAsJsonAsync("/api/auth/register-patient", new { email, password = "Patient123!", firstName = "Self", lastName = "Booker", phone = (string?)null, dateOfBirth = (string?)null });
        register.EnsureSuccessStatusCode();
        var body = await register.Content.ReadFromJsonAsync<JsonElement>();
        var client = factory.CreateClient().WithToken(body.GetProperty("accessToken").GetString()!);
        return (client, body.GetProperty("user").GetProperty("patientId").GetGuid());
    }

    [Fact]
    public async Task CreateAppointment_Anonymous_IsRejected()
    {
        var admin = await factory.AdminClientAsync();
        var response = await factory.CreateClient().BookAsync(await admin.CreatePatientAsync(), await admin.CreateDoctorAsync(), FutureSlot(50, 10));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateAppointment_AsPatient_BooksForThemselvesAsPendingWithoutLeakingContactData()
    {
        var admin = await factory.AdminClientAsync();
        var someoneElse = await admin.CreatePatientAsync();
        var (patient, ownId) = await PatientLoginAsync(admin);

        var response = await patient.BookAsync(someoneElse, await admin.CreateDoctorAsync(), FutureSlot(51, 10), status: "Completed");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(ownId, body.GetProperty("patientId").GetGuid());
        Assert.Equal("Pending", body.GetProperty("status").GetString());
        Assert.False(body.TryGetProperty("patient", out _));
        Assert.DoesNotContain("@", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Refresh_ReusingARotatedToken_EndsEverySessionOfThatUser()
    {
        var client = factory.CreateClient();
        var (_, first, _) = await LoginAsync(client, AdminEmail, AdminPassword);
        var rotated = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = first });
        rotated.EnsureSuccessStatusCode();
        var second = (await rotated.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("refreshToken").GetString();

        var replay = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = first });
        var afterReplay = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = second });

        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, afterReplay.StatusCode);
    }

    [Fact]
    public async Task Treatments_ReturnDerivedBalanceAndNoInternalFields()
    {
        var admin = await factory.AdminClientAsync();
        var create = await admin.PostAsJsonAsync("/api/treatments", new { patientId = await admin.CreatePatientAsync(), doctorId = await admin.CreateDoctorAsync(), name = "Crown", status = "Planned", startDate = DateTime.UtcNow, endDate = (DateTime?)null, cost = 200m, observations = (string?)null });
        create.EnsureSuccessStatusCode();
        var id = await IdOf(create);
        (await admin.PostAsJsonAsync($"/api/treatments/{id}/payments", new { amount = 50m, paidAt = DateTime.UtcNow, method = "Cash", notes = (string?)null })).EnsureSuccessStatusCode();

        var treatment = await admin.GetFromJsonAsync<JsonElement>($"/api/treatments/{id}");

        Assert.Equal(50m, treatment.GetProperty("paid").GetDecimal());
        Assert.Equal(150m, treatment.GetProperty("balance").GetDecimal());
        Assert.Equal("Test", treatment.GetProperty("patient").GetProperty("firstName").GetString());
        Assert.False(treatment.TryGetProperty("concurrencyStamp", out _));
        Assert.False(treatment.GetProperty("patient").TryGetProperty("email", out _));
    }

    [Fact]
    public async Task Appointments_CanBePagedAndFilteredByPatient()
    {
        var admin = await factory.AdminClientAsync();
        var patientId = await admin.CreatePatientAsync();
        var doctorId = await admin.CreateDoctorAsync();
        (await admin.BookAsync(patientId, doctorId, FutureSlot(52, 9))).EnsureSuccessStatusCode();
        (await admin.BookAsync(patientId, doctorId, FutureSlot(52, 11))).EnsureSuccessStatusCode();

        var response = await admin.GetAsync($"/api/appointments?patientId={patientId}&page=1&pageSize=1");
        var items = await response.Content.ReadFromJsonAsync<List<JsonElement>>();

        Assert.Equal("2", response.Headers.GetValues(PagingHeaders.TotalCount).Single());
        var only = Assert.Single(items!);
        Assert.Equal(FutureSlot(52, 11), only.GetProperty("appointmentDate").GetDateTime().ToUniversalTime());
        Assert.Equal("Test Patient", only.GetProperty("patientName").GetString());
    }

    [Fact]
    public async Task DentalRecord_RecordsWhoCreatedAndEditedIt()
    {
        var admin = await factory.AdminClientAsync();
        var patientId = await admin.CreatePatientAsync();
        var doctorId = await admin.CreateDoctorAsync();
        (await admin.PutAsJsonAsync($"/api/patients/{patientId}/record", new { medicalHistory = "None", allergies = "", medications = "", observations = "" })).EnsureSuccessStatusCode();
        (await admin.PostAsJsonAsync($"/api/patients/{patientId}/record/consultations", new { doctorId, consultationDate = DateTime.UtcNow, notes = "Checkup", diagnosis = (string?)null, appointmentId = (Guid?)null })).EnsureSuccessStatusCode();
        var updated = await admin.PutAsJsonAsync($"/api/patients/{patientId}/record", new { medicalHistory = "Asthma", allergies = "", medications = "", observations = "" });

        var record = await updated.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal("Test Admin", record.GetProperty("createdBy").GetString());
        Assert.Equal("Test Admin", record.GetProperty("updatedBy").GetString());
        var consultation = Assert.Single(record.GetProperty("consultations").EnumerateArray());
        Assert.Equal("Test Admin", consultation.GetProperty("createdBy").GetString());
        Assert.Equal("Test", consultation.GetProperty("doctor").GetProperty("firstName").GetString());
    }

    [Fact]
    public async Task Health_ReportsHealthyWhenTheDatabaseAnswers()
    {
        var response = await factory.CreateClient().GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }
}

public class JwtKeyValidatorTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("too-short")]
    [InlineData("change-this-to-a-random-secret-of-at-least-32-chars")]
    public void Validate_RejectsMissingShortOrExampleKeys(string? key) =>
        Assert.Throws<InvalidOperationException>(() => JwtKeyValidator.Validate(key));

    [Fact]
    public void Validate_AcceptsALongRandomKey() =>
        Assert.Equal("test-signing-key-at-least-32-characters-long", JwtKeyValidator.Validate("test-signing-key-at-least-32-characters-long"));
}

public class ClinicClockTests
{
    // Bogota is UTC-5 all year, so these instants don't depend on daylight saving.
    private static ClinicClock Bogota(params DayOfWeek[] closed) => new(new ClinicOptions { TimeZone = "America/Bogota", OpenHour = 9, CloseHour = 18, ClosedDays = [.. closed] });

    [Theory]
    [InlineData("2030-01-07T14:00:00Z", 30, true)]   // Monday 09:00 local
    [InlineData("2030-01-07T13:30:00Z", 30, false)]  // 08:30 local, before opening
    [InlineData("2030-01-07T22:30:00Z", 30, true)]   // ends exactly at 18:00
    [InlineData("2030-01-07T22:45:00Z", 30, false)]  // runs past closing
    public void IsWithinOpeningHours_UsesTheClinicZone(string startUtc, int minutes, bool expected)
    {
        var start = DateTime.Parse(startUtc).ToUniversalTime();
        Assert.Equal(expected, Bogota().IsWithinOpeningHours(start, start.AddMinutes(minutes)));
    }

    [Fact]
    public void IsWithinOpeningHours_RejectsClosedDays()
    {
        var sundayMorning = DateTime.Parse("2030-01-06T15:00:00Z").ToUniversalTime();
        Assert.False(Bogota(DayOfWeek.Sunday).IsWithinOpeningHours(sundayMorning, sundayMorning.AddMinutes(30)));
    }

    [Fact]
    public void Format_ShowsClinicTimeAndZone() =>
        Assert.Equal("Monday, January 7, 2030 9:00 AM (America/Bogota)", Bogota().Format(DateTime.Parse("2030-01-07T14:00:00Z").ToUniversalTime()));

    [Fact]
    public void Constructor_RejectsUnknownZonesAndInvertedHours()
    {
        Assert.Throws<InvalidOperationException>(() => new ClinicClock(new ClinicOptions { TimeZone = "Mars/Olympus" }));
        Assert.Throws<InvalidOperationException>(() => new ClinicClock(new ClinicOptions { OpenHour = 18, CloseHour = 9 }));
    }
}

// 09:00-18:00 in Bogota (UTC-5), closed on Sundays.
public class OpeningHoursAppFactory : ClinicaAppFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("Clinic:TimeZone", "America/Bogota");
        builder.UseSetting("Clinic:OpenHour", "9");
        builder.UseSetting("Clinic:CloseHour", "18");
        builder.UseSetting("Clinic:ClosedDays:0", "Sunday");
        builder.UseSetting("Clinic:Currency", "EUR");
    }
}

public class OpeningHoursTests(OpeningHoursAppFactory factory) : IClassFixture<OpeningHoursAppFactory>
{
    // The next Monday at least a week away, at the given UTC hour.
    private static DateTime NextMondayUtc(int hourUtc, int minute = 0)
    {
        var day = DateTime.UtcNow.Date.AddDays(7);
        while (day.DayOfWeek != DayOfWeek.Monday) day = day.AddDays(1);
        return day.AddHours(hourUtc).AddMinutes(minute);
    }

    [Fact]
    public async Task Booking_OutsideOpeningHours_IsRejected()
    {
        var admin = await factory.AdminClientAsync();
        var patientId = await admin.CreatePatientAsync();
        var doctorId = await admin.CreateDoctorAsync();

        var early = await admin.BookAsync(patientId, doctorId, NextMondayUtc(13));                  // 08:00 Bogota
        var late = await admin.BookAsync(patientId, doctorId, NextMondayUtc(22, 45));               // 17:45-18:15
        var sunday = await admin.BookAsync(patientId, doctorId, NextMondayUtc(15).AddDays(-1));     // Sunday 10:00
        var ok = await admin.BookAsync(patientId, doctorId, NextMondayUtc(14));                     // 09:00 Bogota

        Assert.Equal(HttpStatusCode.BadRequest, early.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, late.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, sunday.StatusCode);
        Assert.Contains("opening hours", (await early.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("message").GetString());
        Assert.Equal(HttpStatusCode.Created, ok.StatusCode);
    }

    [Fact]
    public async Task Rescheduling_OutsideOpeningHours_IsRejectedButCancellingStillWorks()
    {
        var admin = await factory.AdminClientAsync();
        var patientId = await admin.CreatePatientAsync();
        var doctorId = await admin.CreateDoctorAsync();
        var start = NextMondayUtc(15);
        var id = await IdOf(await admin.BookAsync(patientId, doctorId, start));

        var moved = await admin.PutAsJsonAsync($"/api/appointments/{id}", new { patientId, doctorId, serviceId = (Guid?)null, appointmentDate = NextMondayUtc(12), status = "Pending", notes = "" });
        var cancelled = await admin.PutAsJsonAsync($"/api/appointments/{id}", new { patientId, doctorId, serviceId = (Guid?)null, appointmentDate = start, status = "Cancelled", notes = "" });

        Assert.Equal(HttpStatusCode.BadRequest, moved.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, cancelled.StatusCode);
    }

    [Fact]
    public async Task Settings_ExposeZoneHoursAndCurrency()
    {
        var settings = await factory.CreateClient().GetFromJsonAsync<JsonElement>("/api/clinic/settings");

        Assert.Equal("America/Bogota", settings.GetProperty("timeZone").GetString());
        Assert.Equal(9, settings.GetProperty("openHour").GetInt32());
        Assert.Equal(18, settings.GetProperty("closeHour").GetInt32());
        Assert.Equal("Sunday", Assert.Single(settings.GetProperty("closedDays").EnumerateArray()).GetString());
        Assert.Equal("EUR", settings.GetProperty("currency").GetString());
    }
}

public class RateLimitedAppFactory : ClinicaAppFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("RateLimiting:Enabled", "true");
        builder.UseSetting("RateLimiting:LoginPerMinute", "3");
    }
}

public class RateLimitTests(RateLimitedAppFactory factory) : IClassFixture<RateLimitedAppFactory>
{
    [Fact]
    public async Task Login_TooManyAttempts_Returns429()
    {
        var client = factory.CreateClient();
        HttpResponseMessage? last = null;
        for (var i = 0; i < 4; i++) last = await client.PostAsJsonAsync("/api/auth/login", new { email = "nobody@test.local", password = "WrongPass123!" });

        Assert.Equal(HttpStatusCode.TooManyRequests, last!.StatusCode);
        Assert.Contains("Too many attempts", (await last.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("message").GetString());
    }
}

public sealed class RecordingEmailSender : IEmailSender
{
    public List<(string Recipient, string Subject, string? ReplyTo)> Sent { get; } = [];
    public bool Fail { get; set; }

    public Task SendAsync(string recipient, string subject, string body, CancellationToken cancellationToken = default, bool isHtml = false, string? replyTo = null)
    {
        if (Fail) throw new System.Net.Mail.SmtpException("Failure sending mail.");
        lock (Sent) Sent.Add((recipient, subject, replyTo));
        return Task.CompletedTask;
    }
}

public class ContactAppFactory : ClinicaAppFactory
{
    public RecordingEmailSender Email { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("Clinic:ContactEmail", "front-desk@test.local");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(Email);
        });
    }
}

public class ContactTests(ContactAppFactory factory) : IClassFixture<ContactAppFactory>
{
    private static object Message => new { name = "Ana", email = "ana@test.local", phone = (string?)null, message = "Do you accept insurance?" };

    [Fact]
    public async Task Contact_EmailsTheClinicWithTheVisitorAsReplyTo()
    {
        factory.Email.Fail = false;
        var response = await factory.CreateClient().PostAsJsonAsync("/api/clinic/contact", Message);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Contains(factory.Email.Sent, x => x.Recipient == "front-desk@test.local" && x.ReplyTo == "ana@test.local");
    }

    [Fact]
    public async Task Contact_WhenEmailFails_Returns503SoTheVisitorKnows()
    {
        factory.Email.Fail = true;
        try
        {
            var response = await factory.CreateClient().PostAsJsonAsync("/api/clinic/contact", Message);
            Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        }
        finally { factory.Email.Fail = false; }
    }
}
