namespace ClinicaDental.Domain.Entities;

public class DentalService
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal BasePrice { get; set; }
    public int DurationMinutes { get; set; } = 30;
    public bool IsActive { get; set; } = true;
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
