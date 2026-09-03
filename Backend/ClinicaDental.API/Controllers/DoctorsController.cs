using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace ClinicaDental.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Doctor},{UserRoles.Receptionist}")]
public class DoctorsController : ControllerBase
{
    private readonly IDoctorRepository _doctorRepository;

    public DoctorsController(IDoctorRepository doctorRepository)
    {
        _doctorRepository = doctorRepository;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var doctors = await _doctorRepository.GetAllAsync();
        return Ok(doctors);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var doctor = await _doctorRepository.GetByIdAsync(id);
        if (doctor is null)
        {
            return NotFound();
        }

        return Ok(doctor);
    }

    [HttpPost]
    [Authorize(Roles = UserRoles.Admin)]
    public async Task<IActionResult> Create([FromBody] Doctor doctor)
    {
        doctor.Id = doctor.Id == Guid.Empty ? Guid.NewGuid() : doctor.Id;
        doctor.CreatedAt = DateTime.UtcNow;
        await _doctorRepository.AddAsync(doctor);

        return CreatedAtAction(nameof(GetById), new { id = doctor.Id }, doctor);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = UserRoles.Admin)]
    public async Task<IActionResult> Update(Guid id, [FromBody] Doctor doctor)
    {
        var existing = await _doctorRepository.GetByIdAsync(id);
        if (existing is null)
        {
            return NotFound();
        }

        doctor.Id = id;
        doctor.UpdatedAt = DateTime.UtcNow;
        await _doctorRepository.UpdateAsync(doctor);

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = UserRoles.Admin)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var existing = await _doctorRepository.GetByIdAsync(id);
        if (existing is null)
        {
            return NotFound();
        }

        await _doctorRepository.DeleteAsync(id);
        return NoContent();
    }
}
