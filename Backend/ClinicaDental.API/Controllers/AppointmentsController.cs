using System.Security.Claims;
using ClinicaDental.API.Contracts;
using ClinicaDental.API.Services;
using ClinicaDental.Application.Appointments;
using ClinicaDental.Application.Clinic;
using ClinicaDental.Application.Common;
using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using ClinicaDental.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AppointmentsController(
    IAppointmentRepository appointments,
    AppointmentScheduler scheduler,
    AppDbContext context,
    IEmailSender emailSender,
    ClinicClock clock,
    ILogger<AppointmentsController> logger) : ControllerBase
{
    private const string StaffRoles = $"{UserRoles.Admin},{UserRoles.Doctor},{UserRoles.Receptionist}";

    // Newest first. page/pageSize are optional; when given, the total goes in the X-Total-Count header.
    [HttpGet]
    [Authorize(Roles = StaffRoles)]
    public async Task<ActionResult<IEnumerable<AppointmentResponse>>> GetAll([FromQuery] Guid? patientId, [FromQuery] int? page, [FromQuery] int? pageSize)
    {
        var result = await appointments.ListAsync(patientId, PageRequest.From(page, pageSize));
        if (page is not null || pageSize is not null) Response.Headers[PagingHeaders.TotalCount] = result.Total.ToString();
        return Ok(result.Items.Select(AppointmentResponse.From));
    }

    // Lets a signed-in patient see their own appointments without the staff-only roles required by GetAll.
    [HttpGet("mine")]
    [Authorize(Roles = UserRoles.Patient)]
    public async Task<ActionResult<IEnumerable<AppointmentResponse>>> GetMine()
    {
        var patientId = await CurrentPatientIdAsync();
        if (patientId is null) return Ok(Array.Empty<AppointmentResponse>());
        var result = await appointments.ListAsync(patientId, page: null);
        return Ok(result.Items.Select(AppointmentResponse.From));
    }

    // Occupied time ranges for a doctor around a calendar day. The window is wide enough to cover any client
    // timezone; the client converts to clinic time and blocks every slot that overlaps a range.
    [HttpGet("availability")]
    [AllowAnonymous]
    public async Task<ActionResult<AvailabilityResponse>> GetAvailability([FromQuery] Guid doctorId, [FromQuery] DateOnly date)
    {
        if (!await context.Doctors.AnyAsync(x => x.Id == doctorId && x.IsActive)) return NotFound(new { message = "Doctor not found." });

        var windowStart = DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue).AddDays(-1), DateTimeKind.Utc);
        var windowEnd = windowStart.AddDays(3);
        var booked = await context.Appointments
            .Where(x => x.DoctorId == doctorId && x.AppointmentDate < windowEnd && x.EndsAt > windowStart
                && x.Status != AppointmentStatus.Cancelled && x.Status != AppointmentStatus.NoShow)
            .OrderBy(x => x.AppointmentDate)
            .Select(x => new TimeRange(x.AppointmentDate, x.EndsAt))
            .ToListAsync();

        return Ok(new AvailabilityResponse(booked, booked.Select(x => x.Start).ToList()));
    }

    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<AppointmentResponse>> GetById(Guid id)
    {
        var appointment = await appointments.GetDetailsAsync(id);
        if (appointment is null) return NotFound();
        // Any authenticated user can hit this route, but a patient must only see their own appointment.
        if (User.IsInRole(UserRoles.Patient) && appointment.PatientId != await CurrentPatientIdAsync()) return Forbid();
        return Ok(AppointmentResponse.From(appointment));
    }

    // Patients book for themselves: the patient comes from their login, never from the request, and the
    // appointment always starts as Pending. Staff can book for any patient with any status.
    [HttpPost]
    [Authorize]
    [EnableRateLimiting(RateLimitPolicies.Booking)]
    public async Task<ActionResult<AppointmentResponse>> Create([FromBody] AppointmentRequest request)
    {
        var patientId = request.PatientId;
        var status = request.Status;
        if (User.IsInRole(UserRoles.Patient))
        {
            if (await CurrentPatientIdAsync() is not { } own) return Forbid();
            patientId = own;
            status = AppointmentStatus.Pending;
        }

        var result = await scheduler.CreateAsync(new ScheduleRequest(patientId, request.DoctorId, request.ServiceId, request.AppointmentDate.ToUtc(), status, request.Notes));
        if (!result.Succeeded) return Failure(result);
        var appointment = result.Appointment!;

        // The appointment is already saved, so a mail failure (SMTP down, Mailpit not running) must not turn
        // the booking into a 500: the client would show an error and a retry would hit its own slot as a conflict.
        try
        {
            var html = EmailTemplates.AppointmentConfirmation(result.Patient!.FullName, result.Doctor!.FullName, clock.Format(appointment.AppointmentDate), appointment.Notes);
            await emailSender.SendAsync(result.Patient.Email, "Appointment confirmed", html, isHtml: true);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Appointment {AppointmentId} was booked but its confirmation email could not be sent", appointment.Id);
        }

        var created = await appointments.GetDetailsAsync(appointment.Id);
        return CreatedAtAction(nameof(GetById), new { id = appointment.Id }, AppointmentResponse.From(created!));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = StaffRoles)]
    public async Task<IActionResult> Update(Guid id, [FromBody] AppointmentRequest request)
    {
        var result = await scheduler.UpdateAsync(id, new ScheduleRequest(request.PatientId, request.DoctorId, request.ServiceId, request.AppointmentDate.ToUtc(), request.Status, request.Notes));
        return result.Succeeded ? NoContent() : Failure(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Receptionist}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var existing = await appointments.GetByIdAsync(id);
        if (existing is null) return NotFound();
        await appointments.DeleteAsync(existing);
        return NoContent();
    }

    private ActionResult Failure(ScheduleResult result) => result.Error switch
    {
        ScheduleError.NotFound => NotFound(new { message = result.Message }),
        ScheduleError.Conflict => Conflict(new { message = result.Message }),
        _ => BadRequest(new { message = result.Message }),
    };

    private async Task<Guid?> CurrentPatientIdAsync()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return userId is null ? null : await context.Users.Where(x => x.Id == Guid.Parse(userId)).Select(x => x.PatientId).SingleOrDefaultAsync();
    }
}
