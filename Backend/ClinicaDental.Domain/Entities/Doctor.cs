using ClinicaDental.Domain.Common;

namespace ClinicaDental.Domain.Entities;

public class Doctor : IAuditable
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public Guid SpecialtyId { get; set; }
    public string? Phone { get; set; }
    public string Email { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    // Optimistic concurrency token. Booking or moving an appointment that occupies this doctor's time assigns
    // a new value in the same SaveChanges, so two overlapping bookings that race can't both be saved.
    public Guid ScheduleStamp { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Specialty? Specialty { get; set; }
    public User? User { get; set; }
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<Treatment> Treatments { get; set; } = new List<Treatment>();

    public string FullName => $"{FirstName} {LastName}".Trim();
}
