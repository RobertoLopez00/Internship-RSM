using ClinicaDental.Domain.Common;

namespace ClinicaDental.Domain.Entities;

public class Appointment : IAuditable
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public Guid? ServiceId { get; set; }
    // Duration used when the appointment has no service.
    public const int DefaultDurationMinutes = 30;

    public DateTime AppointmentDate { get; set; }
    // End of the appointment: start plus the service duration at booking time. It is a snapshot, so changing
    // a service's duration later doesn't move appointments that are already booked.
    public DateTime EndsAt { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    // Set once a reminder email goes out (see AppointmentReminderService) to prevent re-sending on later poll cycles.
    public DateTime? ReminderSentAt { get; set; }
    public Patient? Patient { get; set; }
    public Doctor? Doctor { get; set; }
    public DentalService? Service { get; set; }
}

// Stored as the member name (text). The API reads and writes the name too, never the number.
public enum AppointmentStatus
{
    Pending,
    Confirmed,
    Completed,
    Cancelled,
    NoShow,
}

public static class AppointmentStatusExtensions
{
    // Cancelled and no-show appointments free their time; every other status occupies it.
    public static bool OccupiesTime(this AppointmentStatus status) => status is not (AppointmentStatus.Cancelled or AppointmentStatus.NoShow);
}
