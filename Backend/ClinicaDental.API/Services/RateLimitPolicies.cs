namespace ClinicaDental.API.Services;

// Names of the rate-limit policies registered in Program.cs. Each limit is configurable as
// RateLimiting:{Name}PerMinute (for example RateLimiting:LoginPerMinute), and RateLimiting:Enabled turns all off.
public static class RateLimitPolicies
{
    public const string Login = "Login";
    public const string Register = "Register";
    public const string Refresh = "Refresh";
    public const string Booking = "Booking";
    public const string Contact = "Contact";
}

public static class PagingHeaders
{
    // Total number of matches when a list endpoint is called with page/pageSize.
    public const string TotalCount = "X-Total-Count";
}
