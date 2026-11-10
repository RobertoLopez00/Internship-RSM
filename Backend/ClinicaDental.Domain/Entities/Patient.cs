using ClinicaDental.Domain.Common;

namespace ClinicaDental.Domain.Entities;

public class Patient : IAuditable
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    // Null when unknown. The old schema required a value and the app filled in "today".
    public DateOnly? DateOfBirth { get; set; }
    public bool IsActive { get; set; } = true;
    // Optimistic concurrency token, same as Doctor.ScheduleStamp: booking a time for this patient assigns a
    // new value, so two overlapping bookings for the same patient (even with different doctors) can't both win.
    public Guid ScheduleStamp { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public User? User { get; set; }
    public DentalRecord? DentalRecord { get; set; }
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<Treatment> Treatments { get; set; } = new List<Treatment>();

    public string FullName => $"{FirstName} {LastName}".Trim();
}
