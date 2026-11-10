using ClinicaDental.Domain.Common;

namespace ClinicaDental.Domain.Entities;

// Catalog of doctor specialties. Replaces the old free-text Doctor.Specialty so the same specialty
// can't be spelled three different ways.
public class Specialty : IAuditable
{
    public const string DefaultName = "General Dentistry";

    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public ICollection<Doctor> Doctors { get; set; } = new List<Doctor>();
}
