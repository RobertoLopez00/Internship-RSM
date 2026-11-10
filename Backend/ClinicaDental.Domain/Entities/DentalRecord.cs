using ClinicaDental.Domain.Common;

namespace ClinicaDental.Domain.Entities;

public class DentalRecord : IAuditable
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string? MedicalHistory { get; set; }
    public string? Allergies { get; set; }
    public string? Medications { get; set; }
    public string? Observations { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Patient? Patient { get; set; }
    public ICollection<Consultation> Consultations { get; set; } = new List<Consultation>();
}

public class Consultation : IAuditable
{
    public Guid Id { get; set; }
    public Guid DentalRecordId { get; set; }
    public Guid DoctorId { get; set; }
    public DateTime ConsultationDate { get; set; }
    public string Notes { get; set; } = string.Empty;
    public string? Diagnosis { get; set; }
    // Optional link to the appointment where the consultation happened. Same patient, at most one consultation per appointment.
    public Guid? AppointmentId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DentalRecord? DentalRecord { get; set; }
    public Appointment? Appointment { get; set; }
    public Doctor? Doctor { get; set; }
}
