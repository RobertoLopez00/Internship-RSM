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

    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> GetById(Guid id)
    {
        var appointment = await _appointmentRepository.GetByIdAsync(id);
        if (appointment is null)
        {
            return NotFound();
        }
        if (User.IsInRole(UserRoles.Patient))
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var ownsAppointment = userId is not null && await _context.Users.AnyAsync(x => x.Id == Guid.Parse(userId) && x.PatientId == appointment.PatientId);
            if (!ownsAppointment) return Forbid();
        }

        return Ok(appointment);
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Create([FromBody] AppointmentRequest request)
    {
        if (request.AppointmentDate <= DateTime.UtcNow) return BadRequest(new { message = "The appointment must be scheduled in the future." });
        if (!IsValidStatus(request.Status)) return BadRequest(new { message = "Invalid appointment status." });
        if (!await _context.Patients.AnyAsync(x => x.Id == request.PatientId && x.IsActive) || !await _context.Doctors.AnyAsync(x => x.Id == request.DoctorId && x.IsActive)) return BadRequest(new { message = "The patient or doctor is not available." });
        if (request.ServiceId is not null && !await _context.Services.AnyAsync(x => x.Id == request.ServiceId && x.IsActive)) return BadRequest(new { message = "The service is not available." });
        var conflict = await _context.Appointments.AnyAsync(x => x.DoctorId == request.DoctorId && x.AppointmentDate == request.AppointmentDate && x.Status != AppointmentStatuses.Cancelled && x.Status != AppointmentStatuses.NoShow);
        if (conflict) return Conflict(new { message = "The doctor already has an appointment at that time." });
        var appointment = new Appointment { Id = Guid.NewGuid(), PatientId = request.PatientId, DoctorId = request.DoctorId, ServiceId = request.ServiceId, AppointmentDate = request.AppointmentDate.ToUniversalTime(), Status = request.Status, Notes = request.Notes?.Trim() ?? "", CreatedAt = DateTime.UtcNow };
        await _appointmentRepository.AddAsync(appointment);
        var patient = await _context.Patients.AsNoTracking().SingleAsync(x => x.Id == appointment.PatientId);
        var doctor = await _context.Doctors.AsNoTracking().SingleAsync(x => x.Id == appointment.DoctorId);
        var html = EmailTemplates.AppointmentConfirmation($"{patient.FirstName} {patient.LastName}", $"{doctor.Name} {doctor.LastName}", appointment.AppointmentDate.ToLocalTime().ToString("f"), appointment.Notes);
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

        if (!IsValidStatus(request.Status)) return BadRequest(new { message = "Invalid appointment status." });
        var conflict = await _context.Appointments.AnyAsync(x => x.Id != id && x.DoctorId == request.DoctorId && x.AppointmentDate == request.AppointmentDate && x.Status != AppointmentStatuses.Cancelled && x.Status != AppointmentStatuses.NoShow);
        if (conflict) return Conflict(new { message = "The doctor already has an appointment at that time." });
        existing.PatientId = request.PatientId; existing.DoctorId = request.DoctorId; existing.ServiceId = request.ServiceId; existing.AppointmentDate = request.AppointmentDate.ToUniversalTime(); existing.Status = request.Status; existing.Notes = request.Notes?.Trim() ?? ""; existing.UpdatedAt = DateTime.UtcNow;
        await _appointmentRepository.UpdateAsync(existing);

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

        await _appointmentRepository.DeleteAsync(id);
        return NoContent();
    }

    private static bool IsValidStatus(string status) => AppointmentStatuses.All.Contains(status);
}
