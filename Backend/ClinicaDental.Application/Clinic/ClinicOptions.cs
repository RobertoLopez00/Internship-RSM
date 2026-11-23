namespace ClinicaDental.Application.Clinic;

// Bound from the "Clinic" configuration section. Every rule about local time (opening hours, "today",
// the time shown in emails) uses TimeZone, never the server's own clock zone.
public sealed class ClinicOptions
{
    // IANA ("America/Mexico_City") or Windows id. Empty means the server's local zone.
    public string? TimeZone { get; set; }
    // Opening hours in clinic time. 0 and 24 mean open all day.
    public int OpenHour { get; set; } = 9;
    public int CloseHour { get; set; } = 18;
    // Days the clinic doesn't take appointments, e.g. ["Sunday"].
    public List<DayOfWeek> ClosedDays { get; set; } = [];
    // ISO 4217 code used by the frontend to format prices.
    public string Currency { get; set; } = "USD";
    // Inbox for the public contact form. Empty means Email:From.
    public string? ContactEmail { get; set; }
}
