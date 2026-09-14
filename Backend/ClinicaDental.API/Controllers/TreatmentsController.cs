using ClinicaDental.API.Contracts;
using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using ClinicaDental.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.API.Controllers;

[Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Doctor},{UserRoles.Receptionist}"), ApiController, Route("api/treatments")]
public class TreatmentsController(ITreatmentRepository treatments, AppDbContext context) : ControllerBase
{
    [HttpGet] public Task<List<Treatment>> GetAll() => treatments.GetAllAsync();
    [HttpGet("{id:guid}")] public async Task<ActionResult<Treatment>> Get(Guid id) => await treatments.GetByIdWithPaymentsAsync(id) is { } treatment ? Ok(treatment) : NotFound();
    [HttpPost] public async Task<ActionResult<Treatment>> Create(TreatmentRequest request) { if (!await IsValid(request)) return BadRequest(new { message = "Invalid patient, doctor, or treatment status." }); var treatment = new Treatment { Id = Guid.NewGuid() }; Apply(treatment, request); await treatments.AddAsync(treatment); return CreatedAtAction(nameof(Get), new { treatment.Id }, treatment); }
    [HttpPut("{id:guid}")] public async Task<IActionResult> Update(Guid id, TreatmentRequest request) { var treatment = await treatments.GetByIdAsync(id); if (treatment is null) return NotFound(); if (!await IsValid(request)) return BadRequest(new { message = "Invalid patient, doctor, or treatment status." }); Apply(treatment, request); await treatments.SaveChangesAsync(); return NoContent(); }
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Receptionist}"), HttpPost("{id:guid}/payments")]
    // Guards against overpayment: sum of existing payments plus the new one can't exceed the treatment cost.
    public async Task<ActionResult<Payment>> AddPayment(Guid id, PaymentRequest request) { var treatment = await treatments.GetByIdWithPaymentsAsync(id); if (treatment is null) return NotFound(); if (treatment.Payments.Sum(x => x.Amount) + request.Amount > treatment.Cost) return BadRequest(new { message = "The payment exceeds the outstanding balance." }); var payment = new Payment { Id = Guid.NewGuid(), TreatmentId = id, Amount = request.Amount, PaidAt = request.PaidAt.ToUniversalTime(), Method = request.Method?.Trim(), Notes = request.Notes?.Trim() }; await treatments.AddPaymentAsync(payment); return Ok(payment); }
    // Still queries context directly for Patients/Doctors existence checks — those belong to their own aggregates.
    private async Task<bool> IsValid(TreatmentRequest r) => TreatmentStatuses.All.Contains(r.Status) && await context.Patients.AnyAsync(x => x.Id == r.PatientId) && await context.Doctors.AnyAsync(x => x.Id == r.DoctorId);
    private static void Apply(Treatment x, TreatmentRequest r) { x.PatientId = r.PatientId; x.DoctorId = r.DoctorId; x.Name = r.Name.Trim(); x.Status = r.Status; x.StartDate = r.StartDate.ToUniversalTime(); x.EndDate = r.EndDate?.ToUniversalTime(); x.Cost = r.Cost; x.Observations = r.Observations?.Trim(); }
}
