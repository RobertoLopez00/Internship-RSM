namespace ClinicaDental.API.Services;

public static class DateTimeExtensions
{
    // Normalizes a request date to UTC once, at the edge. A value without an offset is taken as UTC,
    // the same rule UtcDateTimeConverter applies when saving.
    public static DateTime ToUtc(this DateTime value) => value.Kind switch
    {
        DateTimeKind.Local => value.ToUniversalTime(),
        DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        _ => value,
    };
}
