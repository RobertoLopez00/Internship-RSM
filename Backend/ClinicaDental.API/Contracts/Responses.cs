using ClinicaDental.Domain.Entities;

namespace ClinicaDental.API.Contracts;

public record PatientResponse(Guid Id, string FirstName, string LastName, string Email, string? Phone, DateOnly? DateOfBirth, bool IsActive, DateTime CreatedAt, DateTime? UpdatedAt)
{
    public static PatientResponse From(Patient p) => new(p.Id, p.FirstName, p.LastName, p.Email, p.Phone, p.DateOfBirth, p.IsActive, p.CreatedAt, p.UpdatedAt);
}

// Specialty is the catalog name, so clients don't need a second lookup. Requires Doctor.Specialty to be loaded.
public record DoctorResponse(Guid Id, string FirstName, string LastName, Guid SpecialtyId, string Specialty, string? Phone, string Email, bool IsActive, DateTime CreatedAt, DateTime? UpdatedAt)
{
    public static DoctorResponse From(Doctor d) => new(d.Id, d.FirstName, d.LastName, d.SpecialtyId, d.Specialty?.Name ?? string.Empty, d.Phone, d.Email, d.IsActive, d.CreatedAt, d.UpdatedAt);
}

// DisplayName is computed (User.GetDisplayName). Requires Patient and Doctor to be loaded.
public record UserResponse(Guid Id, string Email, string Role, string DisplayName, bool IsActive, Guid? PatientId, Guid? DoctorId, DateTime CreatedAt)
{
    public static UserResponse From(User u) => new(u.Id, u.Email, u.Role, u.GetDisplayName(), u.IsActive, u.PatientId, u.DoctorId, u.CreatedAt);
}

public record SessionUser(Guid Id, string Email, string Role, string DisplayName, Guid? PatientId, Guid? DoctorId)
{
    public static SessionUser From(User u) => new(u.Id, u.Email, u.Role, u.GetDisplayName(), u.PatientId, u.DoctorId);
}

public record AuthResponse(string AccessToken, string RefreshToken, SessionUser User);

public record TimeRange(DateTime Start, DateTime End);

// Booked holds the occupied ranges. BookedSlots repeats only the start times for older clients.
public record AvailabilityResponse(IReadOnlyList<TimeRange> Booked, IReadOnlyList<DateTime> BookedSlots);

public record ConsultationResponse(Guid Id, Guid DentalRecordId, Guid DoctorId, Guid? AppointmentId, DateTime ConsultationDate, string Notes, string? Diagnosis)
{
    public static ConsultationResponse From(Consultation c) => new(c.Id, c.DentalRecordId, c.DoctorId, c.AppointmentId, c.ConsultationDate, c.Notes, c.Diagnosis);
}

public record PaymentResponse(Guid Id, Guid TreatmentId, decimal Amount, DateTime PaidAt, string Method, string? Notes)
{
    public static PaymentResponse From(Payment p) => new(p.Id, p.TreatmentId, p.Amount, p.PaidAt, p.Method, p.Notes);
}
