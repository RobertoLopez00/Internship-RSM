using ClinicaDental.Domain.Entities;
using ClinicaDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.API.Services;

public sealed class AppointmentReminderService(IServiceScopeFactory scopes, ILogger<AppointmentReminderService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        do { await SendReminders(stoppingToken); } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
    private async Task SendReminders(CancellationToken token)
    {
        try
        {
            using var scope = scopes.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<AppDbContext>(); var sender = scope.ServiceProvider.GetRequiredService<IEmailSender>();
            var start = DateTime.UtcNow.AddHours(23); var end = DateTime.UtcNow.AddHours(25);
            var appointments = await db.Appointments.Include(x => x.Patient).Include(x => x.Doctor).Where(x => x.ReminderSentAt == null && x.AppointmentDate >= start && x.AppointmentDate <= end && (x.Status == AppointmentStatuses.Pending || x.Status == AppointmentStatuses.Confirmed)).ToListAsync(token);
            foreach (var appointment in appointments)
            {
                var html = EmailTemplates.AppointmentReminder($"{appointment.Patient!.FirstName} {appointment.Patient.LastName}", $"{appointment.Doctor!.Name} {appointment.Doctor.LastName}", appointment.AppointmentDate.ToLocalTime().ToString("f"));
                await sender.SendAsync(appointment.Patient.Email, "Appointment reminder", html, token, isHtml: true);
                appointment.ReminderSentAt = DateTime.UtcNow;
            }
            if (appointments.Count > 0) await db.SaveChangesAsync(token);
        }
        catch (Exception exception) { logger.LogError(exception, "Could not send appointment reminders"); }
    }
}
