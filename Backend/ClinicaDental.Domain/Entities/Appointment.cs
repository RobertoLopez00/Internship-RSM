namespace ClinicaDental.Domain.Entities;

public class Appointment
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public Guid? ServiceId { get; set; }
    public DateTime AppointmentDate { get; set; }
    public string Status { get; set; } = AppointmentStatuses.Pending;
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ReminderSentAt { get; set; }
    public Patient? Patient { get; set; }
    public Doctor? Doctor { get; set; }
    public DentalService? Service { get; set; }
}

public static class AppointmentStatuses
{
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
    public const string NoShow = "No-show";
    public static readonly string[] All = [Pending, Confirmed, Completed, Cancelled, NoShow];
}
