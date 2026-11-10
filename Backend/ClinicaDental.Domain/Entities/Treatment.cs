using ClinicaDental.Domain.Common;

namespace ClinicaDental.Domain.Entities;

public class Treatment : IAuditable
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public string Name { get; set; } = string.Empty;
    public TreatmentStatus Status { get; set; } = TreatmentStatus.Planned;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal Cost { get; set; }
    public string? Observations { get; set; }
    // Optimistic concurrency token. Recording a payment or editing the treatment assigns a new value in the
    // same SaveChanges, so two simultaneous payments can't both pass the "doesn't exceed the cost" check.
    public Guid ConcurrencyStamp { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Patient? Patient { get; set; }
    public Doctor? Doctor { get; set; }
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

// Stored as the member name (text).
public enum TreatmentStatus
{
    Planned,
    InProgress,
    Completed,
    Cancelled,
}

public class Payment : IAuditable
{
    public Guid Id { get; set; }
    public Guid TreatmentId { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaidAt { get; set; }
    public string Method { get; set; } = PaymentMethods.Cash;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Treatment? Treatment { get; set; }
}

// Closed list, enforced by a CHECK constraint. Replaces the old free-text method.
public static class PaymentMethods
{
    public const string Cash = "Cash";
    public const string CreditCard = "CreditCard";
    public const string DebitCard = "DebitCard";
    public const string BankTransfer = "BankTransfer";
    public const string Insurance = "Insurance";
    public const string Other = "Other";
    public static readonly string[] All = [Cash, CreditCard, DebitCard, BankTransfer, Insurance, Other];
}
