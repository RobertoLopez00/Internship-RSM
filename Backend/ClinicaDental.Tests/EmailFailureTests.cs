using System.Net;
using System.Net.Mail;
using ClinicaDental.API.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging.Abstractions;
using static ClinicaDental.Tests.TestHelpers;

namespace ClinicaDental.Tests;

// Simulates the SMTP server being unreachable (e.g. Mailpit not running when the API is started with dotnet run)
// for every recipient whose address starts with FailingPrefix.
public class FailingEmailAppFactory : ClinicaAppFactory
{
    public const string FailingPrefix = "smtp-fail";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddScoped<IEmailSender, FailingEmailSender>();
        });
    }

    private sealed class FailingEmailSender : IEmailSender
    {
        public Task SendAsync(string recipient, string subject, string body, CancellationToken cancellationToken = default, bool isHtml = false) =>
            recipient.StartsWith(FailingPrefix) ? throw new SmtpException("Failure sending mail.") : Task.CompletedTask;
    }
}

public class EmailFailureTests : IClassFixture<FailingEmailAppFactory>
{
    private readonly FailingEmailAppFactory _factory;
    public EmailFailureTests(FailingEmailAppFactory factory) => _factory = factory;

    [Fact]
    public async Task CreateAppointment_WhenEmailFails_StillReturnsCreatedAndSavesIt()
    {
        var client = await _factory.AdminClientAsync();
        var patientId = await client.CreatePatientAsync(email: $"{Unique(FailingEmailAppFactory.FailingPrefix)}@test.local");
        var doctorId = await client.CreateDoctorAsync();

        var response = await client.BookAsync(patientId, doctorId, FutureSlot(5, 10));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var appointmentId = await IdOf(response);
        Assert.True(_factory.WithDb(db => db.Appointments.Any(x => x.Id == appointmentId)));
    }

    [Fact]
    public async Task SendReminders_WhenOneEmailFails_StillMarksTheOthersAsSent()
    {
        var client = await _factory.AdminClientAsync();
        var failingPatient = await client.CreatePatientAsync(email: $"{Unique(FailingEmailAppFactory.FailingPrefix)}@test.local");
        var okPatient = await client.CreatePatientAsync();
        var start = DateTime.UtcNow.AddHours(24);
        var failingAppointment = await IdOf(await client.BookAsync(failingPatient, await client.CreateDoctorAsync(), start));
        var okAppointment = await IdOf(await client.BookAsync(okPatient, await client.CreateDoctorAsync(), start));

        var service = new AppointmentReminderService(_factory.Services.GetRequiredService<IServiceScopeFactory>(), NullLogger<AppointmentReminderService>.Instance);
        await service.SendReminders(CancellationToken.None);

        Assert.Null(_factory.WithDb(db => db.Appointments.Single(x => x.Id == failingAppointment).ReminderSentAt));
        Assert.NotNull(_factory.WithDb(db => db.Appointments.Single(x => x.Id == okAppointment).ReminderSentAt));
    }
}
