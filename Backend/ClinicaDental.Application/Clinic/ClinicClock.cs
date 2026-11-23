using System.Globalization;

namespace ClinicaDental.Application.Clinic;

// Converts between UTC (what the database stores) and the clinic's local time.
public sealed class ClinicClock
{
    private static readonly CultureInfo DisplayCulture = CultureInfo.GetCultureInfo("en-US");

    public ClinicClock(ClinicOptions options, TimeProvider? time = null)
    {
        if (options.OpenHour is < 0 or > 23 || options.CloseHour is < 1 or > 24 || options.OpenHour >= options.CloseHour)
            throw new InvalidOperationException("Clinic:OpenHour and Clinic:CloseHour must satisfy 0 <= OpenHour < CloseHour <= 24.");
        Options = options;
        Time = time ?? TimeProvider.System;
        try
        {
            Zone = string.IsNullOrWhiteSpace(options.TimeZone) ? TimeZoneInfo.Local : TimeZoneInfo.FindSystemTimeZoneById(options.TimeZone.Trim());
        }
        catch (TimeZoneNotFoundException)
        {
            throw new InvalidOperationException($"Clinic:TimeZone '{options.TimeZone}' is not a known time zone. Use an IANA id such as 'America/Mexico_City'.");
        }
        IanaId = Zone.HasIanaId ? Zone.Id : TimeZoneInfo.TryConvertWindowsIdToIanaId(Zone.Id, out var iana) ? iana : Zone.Id;
    }

    public ClinicOptions Options { get; }
    public TimeZoneInfo Zone { get; }
    public TimeProvider Time { get; }
    // What browsers understand in Intl.DateTimeFormat({ timeZone }).
    public string IanaId { get; }

    public DateTime UtcNow => Time.GetUtcNow().UtcDateTime;

    public DateTime ToClinicTime(DateTime utc) => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Zone);

    public DateTime ToUtc(DateTime clinicTime) => TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(clinicTime, DateTimeKind.Unspecified), Zone);

    // Start and end (UTC) of the current calendar day in the clinic.
    public (DateTime Start, DateTime End) TodayUtc()
    {
        var today = ToClinicTime(UtcNow).Date;
        return (ToUtc(today), ToUtc(today.AddDays(1)));
    }

    public bool IsOpenAllDay => Options.OpenHour == 0 && Options.CloseHour == 24 && Options.ClosedDays.Count == 0;

    // True when [startUtc, endUtc) falls on an open day, inside opening hours, without crossing midnight.
    public bool IsWithinOpeningHours(DateTime startUtc, DateTime endUtc)
    {
        if (IsOpenAllDay) return true;
        var start = ToClinicTime(startUtc);
        var end = ToClinicTime(endUtc);
        if (Options.ClosedDays.Contains(start.DayOfWeek)) return false;
        var opens = start.Date.AddHours(Options.OpenHour);
        var closes = start.Date.AddHours(Options.CloseHour);
        return start >= opens && end <= closes;
    }

    public string DescribeOpeningHours()
    {
        var hours = $"{Options.OpenHour:00}:00–{Options.CloseHour:00}:00 ({IanaId})";
        return Options.ClosedDays.Count == 0 ? hours : $"{hours}, closed on {string.Join(", ", Options.ClosedDays)}";
    }

    // For emails: "Friday, December 4, 2026 10:00 AM (America/Mexico_City)".
    public string Format(DateTime utc) => $"{ToClinicTime(utc).ToString("dddd, MMMM d, yyyy h:mm tt", DisplayCulture)} ({IanaId})";
}
