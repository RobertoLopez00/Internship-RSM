using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using ClinicaDental.API.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ClinicaDental.Infrastructure.Persistence;
using ClinicaDental.API.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace ClinicaDental.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AppointmentsController : ControllerBase
{
    private const string DoctorBusyMessage = "The doctor already has an appointment at that time.";
    private const string PatientBusyMessage = "The patient already has another appointment at that time.";

    private readonly IAppointmentRepository _appointmentRepository;
    private readonly AppDbContext _context;
    private readonly IEmailSender _emailSender;

    public AppointmentsController(IAppointmentRepository appointmentRepository, AppDbContext context, IEmailSender emailSender)
    {
        _appointmentRepository = appointmentRepository;
        _context = context;
        _emailSender = emailSender;
    }

    [HttpGet]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Doctor},{UserRoles.Receptionist}")]
    public async Task<IActionResult> GetAll()
    {
        var appointments = await _appointmentRepository.GetAllAsync();
        return Ok(appointments);
    }

    // Lets a signed-in patient see their own appointments without the staff-only roles required by GetAll.
    [HttpGet("mine")]
    [Authorize(Roles = UserRoles.Patient)]
    public async Task<IActionResult> GetMine()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var patientId = userId is null ? null : await _context.Users.Where(x => x.Id == Guid.Parse(userId)).Select(x => x.PatientId).SingleOrDefaultAsync();
        if (patientId is null) return Ok(Array.Empty<object>());

        var appointments = await _context.Appointments
            .AsNoTracking()
            .Where(x => x.PatientId == patientId)
            .OrderByDescending(x => x.AppointmentDate)
            .Select(x => new
            {
                x.Id,
                x.AppointmentDate,
                x.EndsAt,
                x.Status,
                x.Notes,
                Doctor = x.Doctor == null ? null : new { x.Doctor.FirstName, x.Doctor.LastName, Specialty = x.Doctor.Specialty!.Name },
                Service = x.Service == null ? null : new { x.Service.Name },
            })
            .ToListAsync();

        return Ok(appointments);
    }

    // Occupied time ranges for a doctor around a calendar day. The window is wide enough to cover any client
    // timezone; the client converts to local time and blocks every slot that overlaps a range.
    [HttpGet("availability")]
    [AllowAnonymous]
    public async Task<ActionResult<AvailabilityResponse>> GetAvailability([FromQuery] Guid doctorId, [FromQuery] DateOnly date)
    {
        if (!await _context.Doctors.AnyAsync(x => x.Id == doctorId && x.IsActive)) return NotFound(new { message = "Doctor not found." });

        var windowStart = DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue).AddDays(-1), DateTimeKind.Utc);
        var windowEnd = windowStart.AddDays(3);
        var booked = await _context.Appointments
            .Where(x => x.DoctorId == doctorId && x.AppointmentDate < windowEnd && x.EndsAt > windowStart
                && x.Status != AppointmentStatus.Cancelled && x.Status != AppointmentStatus.NoShow)
            .OrderBy(x => x.AppointmentDate)
            .Select(x => new TimeRange(x.AppointmentDate, x.EndsAt))
            .ToListAsync();

        return Ok(new AvailabilityResponse(booked, booked.Select(x => x.Start).ToList()));
    }

    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> GetById(Guid id)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(id);
        if (appointment is null)
        {
            return NotFound();
        }
        // Any authenticated user can hit this route, but a patient must only see their own appointment
        // (staff roles are implicitly allowed since they don't match UserRoles.Patient).
        if (User.IsInRole(UserRoles.Patient))
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var ownsAppointment = userId is not null && await _context.Users.AnyAsync(x => x.Id == Guid.Parse(userId) && x.PatientId == appointment.PatientId);
            if (!ownsAppointment) return Forbid();
        }

        return Ok(appointment);
    }

    // Anonymous so patients can self-book from the public site without an account.
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Create([FromBody] AppointmentRequest request)
    {
        var start = request.AppointmentDate.ToUtc();
        if (start <= DateTime.UtcNow) return BadRequest(new { message = "The appointment must be scheduled in the future." });

        // Loaded (tracked) before the overlap queries: if another booking commits after this read, its stamp
        // change makes this SaveChanges fail instead of saving an overlap.
        var patient = await _context.Patients.FirstOrDefaultAsync(x => x.Id == request.PatientId && x.IsActive);
        var doctor = await _context.Doctors.FirstOrDefaultAsync(x => x.Id == request.DoctorId && x.IsActive);
        if (patient is null || doctor is null) return BadRequest(new { message = "The patient or doctor is not available." });
        DentalService? service = null;
        if (request.ServiceId is not null)
        {
            service = await _context.Services.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.ServiceId && x.IsActive);
            if (service is null) return BadRequest(new { message = "The service is not available." });
        }

        var end = start.AddMinutes(service?.DurationMinutes ?? Appointment.DefaultDurationMinutes);
        if (request.Status.OccupiesTime())
        {
            if (await OverlapsAsync(doctor.Id, start, end, exceptId: null)) return Conflict(new { message = DoctorBusyMessage });
            if (await PatientBusyAsync(patient.Id, start, end, exceptId: null)) return Conflict(new { message = PatientBusyMessage });
            ReserveSchedule(doctor, patient);
        }

        var appointment = new Appointment { Id = Guid.NewGuid(), PatientId = patient.Id, DoctorId = doctor.Id, ServiceId = service?.Id, AppointmentDate = start, EndsAt = end, Status = request.Status, Notes = request.Notes?.Trim() ?? "" };
        await _appointmentRepository.AddAsync(appointment);
        await _appointmentRepository.SaveChangesAsync();

        var html = EmailTemplates.AppointmentConfirmation(patient.FullName, doctor.FullName, appointment.AppointmentDate.ToLocalTime().ToString("f"), appointment.Notes);
        await _emailSender.SendAsync(patient.Email, "Appointment confirmed", html, isHtml: true);

        return CreatedAtAction(nameof(GetById), new { id = appointment.Id }, appointment);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Doctor},{UserRoles.Receptionist}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] AppointmentRequest request)
    {
        var existing = await _appointmentRepository.GetByIdAsync(id);
        if (existing is null)
        {
            return NotFound();
        }

        var start = request.AppointmentDate.ToUtc();
        var patientChanged = request.PatientId != existing.PatientId;
        var doctorChanged = request.DoctorId != existing.DoctorId;
        var serviceChanged = request.ServiceId != existing.ServiceId;

        // Only a new patient, doctor or service must be active. Editing an appointment whose doctor was later
        // deactivated (for example to cancel it) still works.
        var patient = await _context.Patients.FirstOrDefaultAsync(x => x.Id == request.PatientId && (x.IsActive || !patientChanged));
        var doctor = await _context.Doctors.FirstOrDefaultAsync(x => x.Id == request.DoctorId && (x.IsActive || !doctorChanged));
        if (patient is null || doctor is null) return BadRequest(new { message = "The patient or doctor is not available." });

        // The appointment keeps its own duration unless the service changes, so editing a service's duration
        // never changes appointments that are already booked.
        var duration = existing.EndsAt - existing.AppointmentDate;
        if (serviceChanged)
        {
            DentalService? service = null;
            if (request.ServiceId is not null)
            {
                service = await _context.Services.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.ServiceId && x.IsActive);
                if (service is null) return BadRequest(new { message = "The service is not available." });
            }
            duration = TimeSpan.FromMinutes(service?.DurationMinutes ?? Appointment.DefaultDurationMinutes);
        }
        var end = start + duration;

        var takesNewTime = start != existing.AppointmentDate || end != existing.EndsAt || patientChanged || doctorChanged || !existing.Status.OccupiesTime();
        if (request.Status.OccupiesTime() && takesNewTime)
        {
            if (await OverlapsAsync(doctor.Id, start, end, exceptId: id)) return Conflict(new { message = DoctorBusyMessage });
            if (await PatientBusyAsync(patient.Id, start, end, exceptId: id)) return Conflict(new { message = PatientBusyMessage });
            ReserveSchedule(doctor, patient);
        }

        existing.PatientId = patient.Id; existing.DoctorId = doctor.Id; existing.ServiceId = request.ServiceId;
        existing.AppointmentDate = start; existing.EndsAt = end; existing.Status = request.Status; existing.Notes = request.Notes?.Trim() ?? "";
        await _appointmentRepository.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Receptionist}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var existing = await _appointmentRepository.GetByIdAsync(id);
        if (existing is null)
        {
            return NotFound();
        }

        await _appointmentRepository.DeleteAsync(existing);
        return NoContent();
    }

    // Two active appointments of the same doctor may not overlap. Back-to-back is fine: one ending at 10:00
    // and another starting at 10:00 don't overlap. Cancelled and no-show appointments free their time.
    internal Task<bool> OverlapsAsync(Guid doctorId, DateTime start, DateTime end, Guid? exceptId) =>
        _context.Appointments.AnyAsync(x => x.DoctorId == doctorId && x.Id != exceptId
            && x.Status != AppointmentStatus.Cancelled && x.Status != AppointmentStatus.NoShow
            && x.AppointmentDate < end && x.EndsAt > start);

    // Same rule for the patient, across all doctors.
    internal Task<bool> PatientBusyAsync(Guid patientId, DateTime start, DateTime end, Guid? exceptId) =>
        _context.Appointments.AnyAsync(x => x.PatientId == patientId && x.Id != exceptId
            && x.Status != AppointmentStatus.Cancelled && x.Status != AppointmentStatus.NoShow
            && x.AppointmentDate < end && x.EndsAt > start);

    // New concurrency stamps go out in the same SaveChanges as the booking. If another booking for the same
    // doctor or patient saved first, the stamp no longer matches and EF throws DbUpdateConcurrencyException
    // (409 via DbUpdateExceptionHandler), so nothing is saved.
    private static void ReserveSchedule(Doctor doctor, Patient patient)
    {
        doctor.ScheduleStamp = Guid.NewGuid();
        patient.ScheduleStamp = Guid.NewGuid();
    }
}
