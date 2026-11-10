using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ClinicaDental.Infrastructure.Persistence.Conventions;

// Every DateTime column stores UTC. On write, local times are converted and unspecified ones are taken
// as UTC. On read, the value is marked as UTC so the API serializes it with a trailing "Z".
public sealed class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
{
    public UtcDateTimeConverter() : base(
        v => v.Kind == DateTimeKind.Local ? v.ToUniversalTime() : DateTime.SpecifyKind(v, DateTimeKind.Utc),
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc))
    {
    }
}
