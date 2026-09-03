using System.ComponentModel.DataAnnotations;

namespace ClinicaDental.API.Contracts;

public record LoginRequest([Required, EmailAddress] string Email, [Required, MinLength(8)] string Password);
public record RefreshRequest([Required] string RefreshToken);
public record RegisterPatientRequest([Required, EmailAddress] string Email, [Required, MinLength(8)] string Password, [Required, MaxLength(100)] string FirstName, [Required, MaxLength(100)] string LastName, [MaxLength(30)] string? Phone, DateTime? DateOfBirth);
public record CreateUserRequest([Required, EmailAddress] string Email, [Required, MinLength(8)] string Password, [Required, MaxLength(30)] string Role, [Required, MaxLength(200)] string DisplayName, Guid? PatientId, Guid? DoctorId);
public record UpdateUserRequest([Required, MaxLength(30)] string Role, [Required, MaxLength(200)] string DisplayName, bool IsActive, Guid? PatientId, Guid? DoctorId);
public record ServiceRequest([Required, MaxLength(120)] string Name, [MaxLength(1000)] string? Description, [Range(0, 999999)] decimal BasePrice, [Range(5, 480)] int DurationMinutes, bool IsActive = true);
public record AppointmentRequest(Guid PatientId, Guid DoctorId, Guid? ServiceId, DateTime AppointmentDate, [Required, MaxLength(50)] string Status, [MaxLength(500)] string? Notes);
public record DentalRecordRequest([MaxLength(4000)] string? MedicalHistory, [MaxLength(4000)] string? Allergies, [MaxLength(4000)] string? Medications, [MaxLength(4000)] string? Observations);
public record ConsultationRequest(Guid DoctorId, DateTime ConsultationDate, [Required, MaxLength(4000)] string Notes, [MaxLength(2000)] string? Diagnosis);
public record TreatmentRequest(Guid PatientId, Guid DoctorId, [Required, MaxLength(200)] string Name, [Required, MaxLength(30)] string Status, DateTime StartDate, DateTime? EndDate, [Range(0, 999999)] decimal Cost, [MaxLength(4000)] string? Observations);
public record PaymentRequest([Range(0.01, 999999)] decimal Amount, DateTime PaidAt, [MaxLength(100)] string? Method, [MaxLength(1000)] string? Notes);
