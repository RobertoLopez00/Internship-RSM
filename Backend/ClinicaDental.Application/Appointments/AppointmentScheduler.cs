using ClinicaDental.Application.Clinic;
using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Appointments;

public sealed record ScheduleRequest(Guid PatientId, Guid DoctorId, Guid? ServiceId, DateTime StartUtc, AppointmentStatus Status, string? Notes);

public enum ScheduleError { None, NotFound, Invalid, Conflict }

public sealed record ScheduleResult(ScheduleError Error, string? Message, Appointment? Appointment = null, Patient? Patient = null, Doctor? Doctor = null)
{
    public bool Succeeded => Error == ScheduleError.None;
    public static ScheduleResult Fail(ScheduleError error, string message) => new(error, message);
}

// The booking rules: the time is in the future and inside opening hours, the patient, doctor and service are
// available, and neither the doctor nor the patient has another active appointment at that time.
public sealed class AppointmentScheduler(
    IAppointmentRepository appointments,
    IPatientRepository patients,
    IDoctorRepository doctors,
    IDentalServiceRepository services,
    ClinicClock clock)
{
    public const string DoctorBusyMessage = "The doctor already has an appointment at that time.";
    public const string PatientBusyMessage = "The patient already has another appointment at that time.";
    private const string UnavailableMessage = "The patient or doctor is not available.";
    private const string ServiceUnavailableMessage = "The service is not available.";

    public async Task<ScheduleResult> CreateAsync(ScheduleRequest request)
    {
        if (request.StartUtc <= clock.UtcNow) return ScheduleResult.Fail(ScheduleError.Invalid, "The appointment must be scheduled in the future.");

        // Loaded (tracked) before the overlap queries: if another booking commits after this read, its stamp
        // change makes this SaveChanges fail instead of saving an overlap.
        var patient = await patients.GetByIdAsync(request.PatientId);
        var doctor = await doctors.GetByIdAsync(request.DoctorId);
        if (patient is not { IsActive: true } || doctor is not { IsActive: true }) return ScheduleResult.Fail(ScheduleError.Invalid, UnavailableMessage);

        DentalService? service = null;
        if (request.ServiceId is { } serviceId)
        {
            service = await services.GetByIdAsync(serviceId);
            if (service is not { IsActive: true }) return ScheduleResult.Fail(ScheduleError.Invalid, ServiceUnavailableMessage);
        }

        var end = request.StartUtc.AddMinutes(service?.DurationMinutes ?? Appointment.DefaultDurationMinutes);
        if (!clock.IsWithinOpeningHours(request.StartUtc, end)) return OutsideHours();
        if (request.Status.OccupiesTime() && await CheckFreeAsync(doctor, patient, request.StartUtc, end, exceptId: null) is { } busy) return busy;

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(), PatientId = patient.Id, DoctorId = doctor.Id, ServiceId = service?.Id,
            AppointmentDate = request.StartUtc, EndsAt = end, Status = request.Status, Notes = request.Notes?.Trim() ?? "",
        };
        await appointments.AddAsync(appointment);
        await appointments.SaveChangesAsync();
        return new ScheduleResult(ScheduleError.None, null, appointment, patient, doctor);
    }

    public async Task<ScheduleResult> UpdateAsync(Guid id, ScheduleRequest request)
    {
        var existing = await appointments.GetByIdAsync(id);
        if (existing is null) return ScheduleResult.Fail(ScheduleError.NotFound, "Appointment not found.");

        var patientChanged = request.PatientId != existing.PatientId;
        var doctorChanged = request.DoctorId != existing.DoctorId;
        var serviceChanged = request.ServiceId != existing.ServiceId;

        // Only a new patient, doctor or service must be active. Editing an appointment whose doctor was later
        // deactivated (for example to cancel it) still works.
        var patient = await patients.GetByIdAsync(request.PatientId);
        var doctor = await doctors.GetByIdAsync(request.DoctorId);
        if (patient is null || doctor is null || (patientChanged && !patient.IsActive) || (doctorChanged && !doctor.IsActive))
            return ScheduleResult.Fail(ScheduleError.Invalid, UnavailableMessage);

        // The appointment keeps its own duration unless the service changes, so editing a service's duration
        // never changes appointments that are already booked.
        var duration = existing.EndsAt - existing.AppointmentDate;
        if (serviceChanged)
        {
            DentalService? service = null;
            if (request.ServiceId is { } serviceId)
            {
                service = await services.GetByIdAsync(serviceId);
                if (service is not { IsActive: true }) return ScheduleResult.Fail(ScheduleError.Invalid, ServiceUnavailableMessage);
            }
            duration = TimeSpan.FromMinutes(service?.DurationMinutes ?? Appointment.DefaultDurationMinutes);
        }
        var start = request.StartUtc;
        var end = start + duration;

        // Opening hours only apply to a new time, so an old appointment can still be cancelled or annotated.
        var timeChanged = start != existing.AppointmentDate || end != existing.EndsAt;
        if (timeChanged && !clock.IsWithinOpeningHours(start, end)) return OutsideHours();

        var takesNewTime = timeChanged || patientChanged || doctorChanged || !existing.Status.OccupiesTime();
        if (request.Status.OccupiesTime() && takesNewTime && await CheckFreeAsync(doctor, patient, start, end, exceptId: id) is { } busy) return busy;

        existing.PatientId = patient.Id; existing.DoctorId = doctor.Id; existing.ServiceId = request.ServiceId;
        existing.AppointmentDate = start; existing.EndsAt = end; existing.Status = request.Status; existing.Notes = request.Notes?.Trim() ?? "";
        await appointments.SaveChangesAsync();
        return new ScheduleResult(ScheduleError.None, null, existing, patient, doctor);
    }

    private async Task<ScheduleResult?> CheckFreeAsync(Doctor doctor, Patient patient, DateTime start, DateTime end, Guid? exceptId)
    {
        if (await appointments.DoctorBusyAsync(doctor.Id, start, end, exceptId)) return ScheduleResult.Fail(ScheduleError.Conflict, DoctorBusyMessage);
        if (await appointments.PatientBusyAsync(patient.Id, start, end, exceptId)) return ScheduleResult.Fail(ScheduleError.Conflict, PatientBusyMessage);
        // New concurrency stamps go out in the same SaveChanges as the booking. If another booking for the same
        // doctor or patient saved first, the stamp no longer matches and EF throws DbUpdateConcurrencyException
        // (409 via DbUpdateExceptionHandler), so nothing is saved.
        doctor.ScheduleStamp = Guid.NewGuid();
        patient.ScheduleStamp = Guid.NewGuid();
        return null;
    }

    private ScheduleResult OutsideHours() =>
        ScheduleResult.Fail(ScheduleError.Invalid, $"The appointment must be within opening hours: {clock.DescribeOpeningHours()}.");
}
