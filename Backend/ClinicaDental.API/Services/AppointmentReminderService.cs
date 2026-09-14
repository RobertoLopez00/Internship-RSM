using ClinicaDental.Domain.Entities;
using ClinicaDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.API.Services;

public sealed class AppointmentReminderService(IServiceScopeFactory scopes, ILogger<AppointmentReminderService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Hourly poll rather than precise per-appointment scheduling — simple and good enough given
        // the ~24h reminder window below has 2 hours of slack to tolerate the poll interval.
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        do { await SendReminders(stoppingToken); } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
    private async Task SendReminders(CancellationToken token)
    {
        try
        {
            // BackgroundService is a singleton, but AppDbContext is scoped, so a new DI scope must be
            // created per run to get a valid (non-disposed) DbContext instance.
            using var scope = scopes.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<AppDbContext>(); var sender = scope.ServiceProvider.GetRequiredService<IEmailSender>();
            // Target window is "24 hours before appointment", widened by +/-1h to accommodate the hourly poll cadence.
            var start = DateTime.UtcNow.AddHours(23); var end = DateTime.UtcNow.AddHours(25);
            // ReminderSentAt == null prevents duplicate emails across poll cycles; only pending/confirmed
            // appointments get reminders (cancelled/completed ones are excluded).
            var appointments = await db.Appointments.Include(x => x.Patient).Include(x => x.Doctor).Where(x => x.ReminderSentAt == null && x.AppointmentDate >= start && x.AppointmentDate <= end && (x.Status == AppointmentStatuses.Pending || x.Status == AppointmentStatuses.Confirmed)).ToListAsync(token);
            foreach (var appointment in appointments)
            {
                var html = EmailTemplates.AppointmentReminder($"{appointment.Patient!.FirstName} {appointment.Patient.LastName}", $"{appointment.Doctor!.Name} {appointment.Doctor.LastName}", appointment.AppointmentDate.ToLocalTime().ToString("f"));
                await sender.SendAsync(appointment.Patient.Email, "Appointment reminder", html, token, isHtml: true);
                appointment.ReminderSentAt = DateTime.UtcNow;
            }
            if (appointments.Count > 0) await db.SaveChangesAsync(token);
        }
        // Swallow exceptions so one bad send (or transient DB/SMTP issue) doesn't crash the hosted service loop.
        catch (Exception exception) { logger.LogError(exception, "Could not send appointment reminders"); }
    }
}
