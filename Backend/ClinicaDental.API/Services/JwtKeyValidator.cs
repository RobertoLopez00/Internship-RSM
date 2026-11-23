using System.Text;

namespace ClinicaDental.API.Services;

// HMAC-SHA256 needs at least 256 bits of key, and a key copied from the docs or .env.example is public:
// anyone could sign an Admin token with it. Refuse to start with either instead of issuing forgeable tokens.
public static class JwtKeyValidator
{
    public const int MinimumBytes = 32;

    private static readonly string[] KnownPlaceholders =
    [
        "change-this-to-a-random-secret-of-at-least-32-chars",
        "a-random-key-at-least-32-characters-long",
        "a-key-at-least-32-characters-long",
    ];

    public static string Validate(string? key)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("Jwt:Key must be configured via user-secrets or environment variables (JWT_KEY in .env for Docker).");
        if (KnownPlaceholders.Contains(key.Trim(), StringComparer.OrdinalIgnoreCase))
            throw new InvalidOperationException("Jwt:Key is still the example value from the docs. Generate a random one, e.g. `openssl rand -base64 48`.");
        if (Encoding.UTF8.GetByteCount(key) < MinimumBytes)
            throw new InvalidOperationException($"Jwt:Key must be at least {MinimumBytes} bytes long. Generate one with `openssl rand -base64 48`.");
        return key;
    }
}
