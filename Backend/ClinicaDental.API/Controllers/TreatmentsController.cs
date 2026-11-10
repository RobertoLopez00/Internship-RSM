using ClinicaDental.API.Contracts;
using ClinicaDental.API.Services;
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

    [HttpPost]
    public async Task<ActionResult<Treatment>> Create(TreatmentRequest request)
    {
        if (await Validate(request) is { } invalid) return invalid;
        var treatment = new Treatment { Id = Guid.NewGuid() };
        Apply(treatment, request);
        await treatments.AddAsync(treatment);
        await treatments.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { treatment.Id }, treatment);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, TreatmentRequest request)
    {
        var treatment = await treatments.GetByIdWithPaymentsAsync(id);
        if (treatment is null) return NotFound();
        if (await Validate(request) is { } invalid) return invalid;
        var paid = treatment.Payments.Sum(x => x.Amount);
        if (request.Cost < paid) return BadRequest(new { message = $"The cost can't be lower than what has already been paid ({paid:0.00})." });
        Apply(treatment, request);
        // Conflicts with a payment being recorded at the same time, which could otherwise exceed the new cost.
        treatment.ConcurrencyStamp = Guid.NewGuid();
        await treatments.SaveChangesAsync();
        return NoContent();
    }

    // Guards against overpayment: existing payments plus the new one can't exceed the cost. The new concurrency
    // stamp makes a second payment racing this one fail (409) instead of both passing the check.
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Receptionist}"), HttpPost("{id:guid}/payments")]
    public async Task<ActionResult<PaymentResponse>> AddPayment(Guid id, PaymentRequest request)
    {
        var treatment = await treatments.GetByIdWithPaymentsAsync(id);
        if (treatment is null) return NotFound();
        if (!PaymentMethods.All.Contains(request.Method)) return BadRequest(new { message = $"Invalid payment method. Use one of: {string.Join(", ", PaymentMethods.All)}." });
        if (treatment.Payments.Sum(x => x.Amount) + request.Amount > treatment.Cost) return BadRequest(new { message = "The payment exceeds the outstanding balance." });
        var payment = new Payment { Id = Guid.NewGuid(), TreatmentId = id, Amount = request.Amount, PaidAt = request.PaidAt.ToUtc(), Method = request.Method, Notes = request.Notes?.Trim() };
        await treatments.AddPaymentAsync(payment);
        treatment.ConcurrencyStamp = Guid.NewGuid();
        await treatments.SaveChangesAsync();
        return Ok(PaymentResponse.From(payment));
    }

    // Still queries context directly for Patients/Doctors existence checks — those belong to their own aggregates.
    private async Task<ActionResult?> Validate(TreatmentRequest r)
    {
        if (!await context.Patients.AnyAsync(x => x.Id == r.PatientId) || !await context.Doctors.AnyAsync(x => x.Id == r.DoctorId))
            return BadRequest(new { message = "Invalid patient or doctor." });
        if (r.EndDate is { } end && end.ToUtc() < r.StartDate.ToUtc())
            return BadRequest(new { message = "The end date can't be before the start date." });
        return null;
    }

    private static void Apply(Treatment x, TreatmentRequest r) { x.PatientId = r.PatientId; x.DoctorId = r.DoctorId; x.Name = r.Name.Trim(); x.Status = r.Status; x.StartDate = r.StartDate.ToUtc(); x.EndDate = r.EndDate?.ToUtc(); x.Cost = r.Cost; x.Observations = r.Observations?.Trim(); }
}
