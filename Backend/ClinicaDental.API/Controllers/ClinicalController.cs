using System.Security.Claims;
using ClinicaDental.API.Contracts;
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
        var record = await records.GetByPatientIdAsync(patientId);
        if (record is null) { if (!await context.Patients.AnyAsync(x => x.Id == patientId)) return NotFound(); record = new DentalRecord { Id = Guid.NewGuid(), PatientId = patientId }; await records.AddAsync(record); }
        record.MedicalHistory = request.MedicalHistory?.Trim(); record.Allergies = request.Allergies?.Trim(); record.Medications = request.Medications?.Trim(); record.Observations = request.Observations?.Trim(); record.UpdatedAt = DateTime.UtcNow;
        await records.SaveChangesAsync(); return Ok(record);
    }
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Doctor}"), HttpPost("consultations")]
    public async Task<ActionResult<Consultation>> AddConsultation(Guid patientId, ConsultationRequest request)
    {
        var record = await records.GetByPatientIdAsync(patientId); if (record is null) return BadRequest(new { message = "Create the dental record first." });
        if (!await context.Doctors.AnyAsync(x => x.Id == request.DoctorId)) return BadRequest(new { message = "Invalid doctor." });
        var consultation = new Consultation { Id = Guid.NewGuid(), DentalRecordId = record.Id, DoctorId = request.DoctorId, ConsultationDate = request.ConsultationDate.ToUniversalTime(), Notes = request.Notes.Trim(), Diagnosis = request.Diagnosis?.Trim() };
        await records.AddConsultationAsync(consultation); return Ok(consultation);
    }
    // Admins and doctors can view any patient's dental record; a patient may only view their own,
    // matched via the linked User.PatientId rather than trusting the route parameter directly.
    // Still queries context directly for Patients/Doctors/Users checks — those belong to their own aggregates.
    private async Task<bool> CanAccess(Guid patientId) => User.IsInRole(UserRoles.Admin) || User.IsInRole(UserRoles.Doctor) || (User.FindFirstValue(ClaimTypes.NameIdentifier) is string id && await context.Users.AnyAsync(x => x.Id == Guid.Parse(id) && x.PatientId == patientId));
}
