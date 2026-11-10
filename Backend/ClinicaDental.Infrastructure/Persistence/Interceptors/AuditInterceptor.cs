using ClinicaDental.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace ClinicaDental.Infrastructure.Persistence.Interceptors;

// Fills IAuditable.CreatedAt on insert and UpdatedAt on a real edit. Changing only a concurrency token
// (for example Doctor.ScheduleStamp when a booking reserves the doctor's time) is not an edit of the row.
public sealed class AuditInterceptor : SaveChangesInterceptor
{
    public static readonly AuditInterceptor Instance = new();

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Stamp(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        Stamp(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void Stamp(DbContext? context)
    {
        if (context is null) return;
        context.ChangeTracker.DetectChanges();
        var now = DateTime.UtcNow;
        foreach (var entry in context.ChangeTracker.Entries<IAuditable>())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.CreatedAt == default) entry.Entity.CreatedAt = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Property(x => x.CreatedAt).IsModified = false;
                var edited = entry.Properties.Any(p => p.IsModified && !p.Metadata.IsConcurrencyToken && p.Metadata.Name != nameof(IAuditable.UpdatedAt));
                if (edited) entry.Entity.UpdatedAt = now;
            }
        }
    }
}
