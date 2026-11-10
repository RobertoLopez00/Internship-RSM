using ClinicaDental.Domain.Common;

namespace ClinicaDental.Domain.Entities;

public class User : IAuditable
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = UserRoles.Patient;
    // Stored only for staff without a profile (Admin, Receptionist). Patients and doctors take their
    // name from the linked profile, see GetDisplayName. CK_Users_DisplayName enforces this.
    public string? DisplayName { get; set; }
    public bool IsActive { get; set; } = true;
    // Exactly the link that matches Role is set (CK_Users_RoleLink).
    public Guid? PatientId { get; set; }
    public Guid? DoctorId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Patient? Patient { get; set; }
    public Doctor? Doctor { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    // Patient and Doctor must be loaded for those roles, otherwise this falls back to the email.
    public string GetDisplayName() => Role switch
    {
        UserRoles.Patient when Patient is not null => Patient.FullName,
        UserRoles.Doctor when Doctor is not null => $"Dr. {Doctor.FullName}",
        _ => string.IsNullOrWhiteSpace(DisplayName) ? Email : DisplayName,
    };
}

public static class UserRoles
{
    public const string Admin = "Admin";
    public const string Doctor = "Doctor";
    public const string Receptionist = "Receptionist";
    public const string Patient = "Patient";
    public static readonly string[] All = [Admin, Doctor, Receptionist, Patient];
    public static readonly string[] Staff = [Admin, Receptionist];
    public static bool StoresDisplayName(string role) => role is Admin or Receptionist;
}
