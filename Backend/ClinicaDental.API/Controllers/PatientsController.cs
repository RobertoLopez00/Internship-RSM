using ClinicaDental.API.Contracts;
using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace ClinicaDental.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Doctor},{UserRoles.Receptionist}")]
public class PatientsController(IPatientRepository patients) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok((await patients.GetAllAsync()).Select(PatientResponse.From));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id) =>
        await patients.GetByIdAsync(id) is { } patient ? Ok(PatientResponse.From(patient)) : NotFound();

    [HttpPost]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Receptionist}")]
    public async Task<IActionResult> Create([FromBody] PatientRequest request)
    {
        var email = NormalizeEmail(request.Email);
        if (await patients.EmailInUseAsync(email)) return Conflict(new { message = "A patient with this email already exists." });
        var patient = new Patient { Id = Guid.NewGuid() };
        Apply(patient, request, email);
        await patients.AddAsync(patient);
        await patients.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = patient.Id }, PatientResponse.From(patient));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Receptionist}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] PatientRequest request)
    {
        var patient = await patients.GetByIdAsync(id);
        if (patient is null) return NotFound();

        var email = NormalizeEmail(request.Email);
        if (await patients.EmailInUseAsync(email, exceptId: id)) return Conflict(new { message = "A patient with this email already exists." });
        if (request.IsActive is { } isActive && isActive != patient.IsActive)
        {
            if (!User.IsInRole(UserRoles.Admin)) return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only an administrator can activate or deactivate a patient." });
            if (await ChangeActiveAsync(patient, isActive) is { } blocked) return blocked;
        }
        Apply(patient, request, email);
        await patients.SaveChangesAsync();
        return NoContent();
    }

    // Deactivates instead of deleting, so the clinical and billing history is kept. The login goes inactive too.
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = UserRoles.Admin)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var patient = await patients.GetByIdAsync(id);
        if (patient is null) return NotFound();
        if (await ChangeActiveAsync(patient, false) is { } blocked) return blocked;
        await patients.SaveChangesAsync();
        return NoContent();
    }

    private async Task<IActionResult?> ChangeActiveAsync(Patient patient, bool isActive)
    {
        if (!isActive && await patients.HasUpcomingAppointmentsAsync(patient.Id))
            return Conflict(new { message = "This patient has upcoming pending or confirmed appointments. Cancel or reschedule them first." });
        await patients.SetActiveAsync(patient, isActive);
        return null;
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static void Apply(Patient patient, PatientRequest request, string email)
    {
        patient.FirstName = request.FirstName.Trim();
        patient.LastName = request.LastName.Trim();
        patient.Email = email;
        patient.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        patient.DateOfBirth = request.DateOfBirth;
    }
}
