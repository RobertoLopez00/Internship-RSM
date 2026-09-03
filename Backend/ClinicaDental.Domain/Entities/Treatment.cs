namespace ClinicaDental.Domain.Entities;

public class Treatment
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = TreatmentStatuses.Planned;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal Cost { get; set; }
    public string? Observations { get; set; }
    public Patient? Patient { get; set; }
    public Doctor? Doctor { get; set; }
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public static class TreatmentStatuses
{
    public const string Planned = "Planned";
    public const string InProgress = "In progress";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
    public static readonly string[] All = [Planned, InProgress, Completed, Cancelled];
}

public class Payment
{
    public Guid Id { get; set; }
    public Guid TreatmentId { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaidAt { get; set; }
    public string? Method { get; set; }
    public string? Notes { get; set; }
    public Treatment? Treatment { get; set; }
}
