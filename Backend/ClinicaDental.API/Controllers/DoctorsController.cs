using ClinicaDental.API.Contracts;
using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace ClinicaDental.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Doctor},{UserRoles.Receptionist}")]
public class DoctorsController(IDoctorRepository doctors) : ControllerBase
{
    // Public so the booking pages can list doctors. Visitors only see active doctors; staff see all.
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll() =>
        Ok((await doctors.GetAllAsync(activeOnly: !IsStaff())).Select(DoctorResponse.From));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id) =>
        await doctors.GetByIdAsync(id) is { } doctor ? Ok(DoctorResponse.From(doctor)) : NotFound();

    [HttpPost]
    [Authorize(Roles = UserRoles.Admin)]
    public async Task<IActionResult> Create([FromBody] DoctorRequest request)
    {
        var email = NormalizeEmail(request.Email);
        if (await doctors.EmailInUseAsync(email)) return Conflict(new { message = "A doctor with this email already exists." });
        var doctor = new Doctor { Id = Guid.NewGuid() };
        await ApplyAsync(doctor, request, email);
        await doctors.AddAsync(doctor);
        await doctors.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = doctor.Id }, DoctorResponse.From(doctor));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = UserRoles.Admin)]
    public async Task<IActionResult> Update(Guid id, [FromBody] DoctorRequest request)
    {
        var doctor = await doctors.GetByIdAsync(id);
        if (doctor is null) return NotFound();

        var email = NormalizeEmail(request.Email);
        if (await doctors.EmailInUseAsync(email, exceptId: id)) return Conflict(new { message = "A doctor with this email already exists." });
        if (request.IsActive is { } isActive && isActive != doctor.IsActive && await ChangeActiveAsync(doctor, isActive) is { } blocked) return blocked;
        await ApplyAsync(doctor, request, email);
        await doctors.SaveChangesAsync();
        return NoContent();
    }

    // Deactivates instead of deleting, so appointments, treatments and consultations keep their doctor.
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = UserRoles.Admin)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var doctor = await doctors.GetByIdAsync(id);
        if (doctor is null) return NotFound();
        if (await ChangeActiveAsync(doctor, false) is { } blocked) return blocked;
        await doctors.SaveChangesAsync();
        return NoContent();
    }

    private async Task<IActionResult?> ChangeActiveAsync(Doctor doctor, bool isActive)
    {
        if (!isActive && await doctors.HasUpcomingAppointmentsAsync(doctor.Id))
            return Conflict(new { message = "This doctor has upcoming pending or confirmed appointments. Cancel or reassign them first." });
        await doctors.SetActiveAsync(doctor, isActive);
        return null;
    }

    private bool IsStaff() => User.IsInRole(UserRoles.Admin) || User.IsInRole(UserRoles.Doctor) || User.IsInRole(UserRoles.Receptionist);

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private async Task ApplyAsync(Doctor doctor, DoctorRequest request, string email)
    {
        doctor.FirstName = request.FirstName.Trim();
        doctor.LastName = request.LastName.Trim();
        doctor.Email = email;
        doctor.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        var specialty = await doctors.GetOrAddSpecialtyAsync(request.Specialty);
        doctor.Specialty = specialty;
        doctor.SpecialtyId = specialty.Id;
    }
}
