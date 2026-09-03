namespace ClinicaDental.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = UserRoles.Patient;
    public string DisplayName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public Guid? PatientId { get; set; }
    public Guid? DoctorId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public Patient? Patient { get; set; }
    public Doctor? Doctor { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

public static class UserRoles
{
    public const string Admin = "Admin";
    public const string Doctor = "Doctor";
    public const string Receptionist = "Receptionist";
    public const string Patient = "Patient";
    public static readonly string[] All = [Admin, Doctor, Receptionist, Patient];
}
