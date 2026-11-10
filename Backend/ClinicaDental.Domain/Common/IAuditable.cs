namespace ClinicaDental.Domain.Common;

// Rows that carry their own creation/modification time. AuditInterceptor fills both on SaveChanges,
// so application code never assigns them by hand.
public interface IAuditable
{
    DateTime CreatedAt { get; set; }
    DateTime? UpdatedAt { get; set; }
}
