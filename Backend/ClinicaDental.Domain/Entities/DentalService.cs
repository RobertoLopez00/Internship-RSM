using ClinicaDental.Domain.Common;

namespace ClinicaDental.Domain.Entities;

public class DentalService : IAuditable
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal BasePrice { get; set; }
    public int DurationMinutes { get; set; } = 30;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
