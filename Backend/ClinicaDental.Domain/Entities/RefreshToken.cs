namespace ClinicaDental.Domain.Entities;

public class RefreshToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }
    // Links a rotated-out token to its successor, forming a chain that lets reuse of a revoked token be detected.
    public string? ReplacedByTokenHash { get; set; }
    public User? User { get; set; }
}
