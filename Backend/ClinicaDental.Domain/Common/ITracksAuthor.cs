namespace ClinicaDental.Domain.Common;

// Clinical rows that record which login created and last edited them. AuditInterceptor fills both from the
// signed-in user; they stay null for rows written outside a request (seeding, background jobs).
public interface ITracksAuthor
{
    Guid? CreatedByUserId { get; set; }
    Guid? UpdatedByUserId { get; set; }
}
