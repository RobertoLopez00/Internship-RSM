using ClinicaDental.API.Contracts;
using ClinicaDental.Domain.Entities;
using ClinicaDental.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.API.Controllers;

[Authorize(Roles = UserRoles.Admin), ApiController, Route("api/users")]
public class UsersController(AppDbContext context) : ControllerBase
{
    private readonly PasswordHasher<User> _hasher = new();
    [HttpGet] public Task<List<object>> GetAll() => context.Users.AsNoTracking().OrderBy(x => x.Email).Select(x => (object)new { x.Id, x.Email, x.Role, x.DisplayName, x.IsActive, x.PatientId, x.DoctorId, x.CreatedAt }).ToListAsync();
    [HttpPost] public async Task<ActionResult<object>> Create(CreateUserRequest request)
    {
        var email = request.Email.Trim().ToLower();
        if (!UserRoles.All.Contains(request.Role)) return BadRequest(new { message = "Invalid role." });
        if (await context.Users.AnyAsync(x => x.Email == email)) return Conflict(new { message = "This email is already registered." });
        if (!await LinksAreValid(request.Role, request.PatientId, request.DoctorId)) return BadRequest(new { message = "The patient or doctor association is not valid for this role." });
        var user = new User { Id = Guid.NewGuid(), Email = email, Role = request.Role, DisplayName = request.DisplayName.Trim(), PatientId = request.PatientId, DoctorId = request.DoctorId };
        user.PasswordHash = _hasher.HashPassword(user, request.Password); context.Users.Add(user); await context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { user.Id }, new { user.Id, user.Email, user.Role, user.DisplayName });
    }
    [HttpPut("{id:guid}")] public async Task<IActionResult> Update(Guid id, UpdateUserRequest request)
    {
        var user = await context.Users.FindAsync(id); if (user is null) return NotFound();
        if (!UserRoles.All.Contains(request.Role) || !await LinksAreValid(request.Role, request.PatientId, request.DoctorId)) return BadRequest(new { message = "Invalid role or association." });
        user.Role = request.Role; user.DisplayName = request.DisplayName.Trim(); user.IsActive = request.IsActive; user.PatientId = request.PatientId; user.DoctorId = request.DoctorId; user.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync(); return NoContent();
    }
    [HttpDelete("{id:guid}")] public async Task<IActionResult> Deactivate(Guid id)
    {
        var user = await context.Users.FindAsync(id); if (user is null) return NotFound();
        user.IsActive = false; user.UpdatedAt = DateTime.UtcNow; await context.SaveChangesAsync(); return NoContent();
    }
    private async Task<bool> LinksAreValid(string role, Guid? patientId, Guid? doctorId) =>
        (role != UserRoles.Patient || patientId is not null && await context.Patients.AnyAsync(x => x.Id == patientId)) &&
        (role != UserRoles.Doctor || doctorId is not null && await context.Doctors.AnyAsync(x => x.Id == doctorId)) &&
        (role is UserRoles.Patient or UserRoles.Doctor || patientId is null && doctorId is null);
}
