using System.Security.Claims;
using ClinicaDental.API.Contracts;
using ClinicaDental.API.Services;
using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using ClinicaDental.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.API.Controllers;

[Authorize, ApiController, Route("api/patients/{patientId:guid}/record")]
public class ClinicalController(IDentalRecordRepository records, AppDbContext context) : ControllerBase
{
    [HttpGet] public async Task<ActionResult<object>> Get(Guid patientId)
    {
        if (!await CanAccess(patientId)) return Forbid();
        var record = await records.GetWithConsultationsAsync(patientId);
        return record is null ? NotFound() : Ok(record);
    }

    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Doctor}"), HttpPut]
    public async Task<ActionResult<DentalRecord>> Upsert(Guid patientId, DentalRecordRequest request)
    {
        var record = await GetOrCreateRecordAsync(patientId);
        if (record is null) return NotFound();
        record.MedicalHistory = request.MedicalHistory?.Trim(); record.Allergies = request.Allergies?.Trim(); record.Medications = request.Medications?.Trim(); record.Observations = request.Observations?.Trim();
        await records.SaveChangesAsync(); return Ok(record);
    }

    // The first consultation creates the dental record if the patient doesn't have one yet.
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Doctor}"), HttpPost("consultations")]
    public async Task<ActionResult<ConsultationResponse>> AddConsultation(Guid patientId, ConsultationRequest request)
    {
        if (!await context.Doctors.AnyAsync(x => x.Id == request.DoctorId)) return BadRequest(new { message = "Invalid doctor." });
        if (request.AppointmentId is { } appointmentId)
        {
            var appointmentPatient = await context.Appointments.Where(x => x.Id == appointmentId).Select(x => (Guid?)x.PatientId).SingleOrDefaultAsync();
            if (appointmentPatient is null) return BadRequest(new { message = "The appointment doesn't exist." });
            if (appointmentPatient != patientId) return BadRequest(new { message = "The appointment belongs to another patient." });
            if (await context.Consultations.AnyAsync(x => x.AppointmentId == appointmentId)) return Conflict(new { message = "That appointment already has a consultation." });
        }

        var record = await GetOrCreateRecordAsync(patientId);
        if (record is null) return NotFound();
        var consultation = new Consultation { Id = Guid.NewGuid(), DentalRecordId = record.Id, DoctorId = request.DoctorId, AppointmentId = request.AppointmentId, ConsultationDate = request.ConsultationDate.ToUtc(), Notes = request.Notes.Trim(), Diagnosis = request.Diagnosis?.Trim() };
        await records.AddConsultationAsync(consultation);
        return Ok(ConsultationResponse.From(consultation));
    }

    // Null when the patient doesn't exist. A new record is added but not saved.
    private async Task<DentalRecord?> GetOrCreateRecordAsync(Guid patientId)
    {
        var record = await records.GetByPatientIdAsync(patientId);
        if (record is not null) return record;
        if (!await context.Patients.AnyAsync(x => x.Id == patientId)) return null;
        record = new DentalRecord { Id = Guid.NewGuid(), PatientId = patientId };
        await records.AddAsync(record);
        return record;
    }

    // Admins and doctors can view any patient's dental record; a patient may only view their own,
    // matched via the linked User.PatientId rather than trusting the route parameter directly.
    // Still queries context directly for Patients/Doctors/Users checks — those belong to their own aggregates.
    private async Task<bool> CanAccess(Guid patientId) => User.IsInRole(UserRoles.Admin) || User.IsInRole(UserRoles.Doctor) || (User.FindFirstValue(ClaimTypes.NameIdentifier) is string id && await context.Users.AnyAsync(x => x.Id == Guid.Parse(id) && x.PatientId == patientId));
}
