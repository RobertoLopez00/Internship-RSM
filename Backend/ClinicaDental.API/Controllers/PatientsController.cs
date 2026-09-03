using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace ClinicaDental.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Doctor},{UserRoles.Receptionist}")]
public class PatientsController : ControllerBase
{
    private readonly IPatientRepository _patientRepository;

    public PatientsController(IPatientRepository patientRepository)
    {
        _patientRepository = patientRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var patients = await _patientRepository.GetAllAsync();
        return Ok(patients);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var patient = await _patientRepository.GetByIdAsync(id);
        if (patient is null)
        {
            return NotFound();
        }

        return Ok(patient);
    }

    [HttpPost]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Receptionist}")]
    public async Task<IActionResult> Create([FromBody] Patient patient)
    {
        patient.Id = patient.Id == Guid.Empty ? Guid.NewGuid() : patient.Id;
        patient.CreatedAt = DateTime.UtcNow;
        await _patientRepository.AddAsync(patient);

        return CreatedAtAction(nameof(GetById), new { id = patient.Id }, patient);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Receptionist}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Patient patient)
    {
        var existing = await _patientRepository.GetByIdAsync(id);
        if (existing is null)
        {
            return NotFound();
        }

        patient.Id = id;
        patient.UpdatedAt = DateTime.UtcNow;
        await _patientRepository.UpdateAsync(patient);

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = UserRoles.Admin)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var existing = await _patientRepository.GetByIdAsync(id);
        if (existing is null)
        {
            return NotFound();
        }

        await _patientRepository.DeleteAsync(id);
        return NoContent();
    }
}
