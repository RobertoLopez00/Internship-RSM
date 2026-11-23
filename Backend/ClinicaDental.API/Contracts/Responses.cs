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

// A person shown next to a record (patient or doctor) without the rest of their profile.
public record PersonRef(Guid Id, string FirstName, string LastName)
{
    public static PersonRef? From(Patient? p) => p is null ? null : new(p.Id, p.FirstName, p.LastName);
    public static PersonRef? From(Doctor? d) => d is null ? null : new(d.Id, d.FirstName, d.LastName);
}

// Requires Patient, Doctor and Service to be loaded for the names; they're null otherwise.
public record AppointmentResponse(Guid Id, Guid PatientId, string? PatientName, Guid DoctorId, string? DoctorName, string? DoctorSpecialty, Guid? ServiceId, string? ServiceName,
    DateTime AppointmentDate, DateTime EndsAt, AppointmentStatus Status, string Notes, DateTime CreatedAt, DateTime? UpdatedAt)
{
    public static AppointmentResponse From(Appointment a) => new(a.Id, a.PatientId, a.Patient?.FullName, a.DoctorId, a.Doctor?.FullName, a.Doctor?.Specialty?.Name, a.ServiceId, a.Service?.Name,
        a.AppointmentDate, a.EndsAt, a.Status, a.Notes, a.CreatedAt, a.UpdatedAt);
}

public record ServiceResponse(Guid Id, string Name, string? Description, decimal BasePrice, int DurationMinutes, bool IsActive)
{
    public static ServiceResponse From(DentalService s) => new(s.Id, s.Name, s.Description, s.BasePrice, s.DurationMinutes, s.IsActive);
}

// Requires Payments (and Patient/Doctor for the names) to be loaded. Paid and Balance are derived from the payments.
public record TreatmentResponse(Guid Id, Guid PatientId, PersonRef? Patient, Guid DoctorId, PersonRef? Doctor, string Name, TreatmentStatus Status, DateTime StartDate, DateTime? EndDate,
    decimal Cost, decimal Paid, decimal Balance, string? Observations, IReadOnlyList<PaymentResponse> Payments, DateTime CreatedAt, DateTime? UpdatedAt)
{
    public static TreatmentResponse From(Treatment t)
    {
        var paid = t.Payments.Sum(p => p.Amount);
        return new(t.Id, t.PatientId, PersonRef.From(t.Patient), t.DoctorId, PersonRef.From(t.Doctor), t.Name, t.Status, t.StartDate, t.EndDate,
            t.Cost, paid, t.Cost - paid, t.Observations, t.Payments.OrderBy(p => p.PaidAt).Select(PaymentResponse.From).ToList(), t.CreatedAt, t.UpdatedAt);
    }
}

// CreatedBy/UpdatedBy are display names of the logins that wrote the row, looked up by the caller.
public record ConsultationResponse(Guid Id, Guid DentalRecordId, Guid DoctorId, PersonRef? Doctor, Guid? AppointmentId, DateTime ConsultationDate, string Notes, string? Diagnosis, DateTime CreatedAt, string? CreatedBy)
{
    public static ConsultationResponse From(Consultation c, IReadOnlyDictionary<Guid, string>? authors = null) =>
        new(c.Id, c.DentalRecordId, c.DoctorId, PersonRef.From(c.Doctor), c.AppointmentId, c.ConsultationDate, c.Notes, c.Diagnosis, c.CreatedAt, AuthorName(c.CreatedByUserId, authors));

    internal static string? AuthorName(Guid? id, IReadOnlyDictionary<Guid, string>? authors) =>
        id is { } key && authors is not null && authors.TryGetValue(key, out var name) ? name : null;
}

public record DentalRecordResponse(Guid Id, Guid PatientId, string? MedicalHistory, string? Allergies, string? Medications, string? Observations,
    DateTime CreatedAt, string? CreatedBy, DateTime? UpdatedAt, string? UpdatedBy, IReadOnlyList<ConsultationResponse> Consultations)
{
    public static DentalRecordResponse From(DentalRecord r, IReadOnlyDictionary<Guid, string>? authors = null) =>
        new(r.Id, r.PatientId, r.MedicalHistory, r.Allergies, r.Medications, r.Observations,
            r.CreatedAt, ConsultationResponse.AuthorName(r.CreatedByUserId, authors), r.UpdatedAt, ConsultationResponse.AuthorName(r.UpdatedByUserId, authors),
            r.Consultations.OrderByDescending(c => c.ConsultationDate).Select(c => ConsultationResponse.From(c, authors)).ToList());
}

// What the public site and the panels need to show times and prices the way the clinic does.
public record ClinicSettingsResponse(string TimeZone, int OpenHour, int CloseHour, IReadOnlyList<DayOfWeek> ClosedDays, int SlotMinutes, string Currency);

public record PaymentResponse(Guid Id, Guid TreatmentId, decimal Amount, DateTime PaidAt, string Method, string? Notes)
{
    public static PaymentResponse From(Payment p) => new(p.Id, p.TreatmentId, p.Amount, p.PaidAt, p.Method, p.Notes);
}
