using ClinicaDental.API.Contracts;
using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using ClinicaDental.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.API.Controllers;

[Authorize(Roles = UserRoles.Admin), ApiController, Route("api/users")]
public class UsersController(IUserRepository users, AppDbContext context) : ControllerBase
{
    private readonly PasswordHasher<User> _hasher = new();

    [HttpGet] public async Task<List<UserResponse>> GetAll() => (await users.GetAllAsync()).Select(UserResponse.From).ToList();

    [HttpPost] public async Task<ActionResult<UserResponse>> Create(CreateUserRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (!UserRoles.All.Contains(request.Role)) return BadRequest(new { message = "Invalid role." });
        if (await users.EmailExistsAsync(email)) return Conflict(new { message = "This email is already registered." });
        if (await Validate(request.Role, request.DisplayName, request.PatientId, request.DoctorId, userId: null) is { } invalid) return invalid;
        var user = new User { Id = Guid.NewGuid(), Email = email, Role = request.Role, DisplayName = DisplayNameFor(request.Role, request.DisplayName), PatientId = request.PatientId, DoctorId = request.DoctorId };
        user.PasswordHash = _hasher.HashPassword(user, request.Password);
        await users.AddAsync(user);
        await users.SaveChangesAsync();
        var created = await users.GetByIdAsync(user.Id);
        return CreatedAtAction(nameof(GetAll), new { user.Id }, UserResponse.From(created!));
    }

    [HttpPut("{id:guid}")] public async Task<IActionResult> Update(Guid id, UpdateUserRequest request)
    {
        var user = await users.GetByIdAsync(id); if (user is null) return NotFound();
        if (!UserRoles.All.Contains(request.Role)) return BadRequest(new { message = "Invalid role." });
        if (await Validate(request.Role, request.DisplayName, request.PatientId, request.DoctorId, userId: id) is { } invalid) return invalid;
        user.Role = request.Role; user.DisplayName = DisplayNameFor(request.Role, request.DisplayName); user.IsActive = request.IsActive; user.PatientId = request.PatientId; user.DoctorId = request.DoctorId;
        await users.SaveChangesAsync(); return NoContent();
    }

    [HttpDelete("{id:guid}")] public async Task<IActionResult> Deactivate(Guid id)
    {
        var user = await users.GetByIdAsync(id); if (user is null) return NotFound();
        user.IsActive = false; await users.SaveChangesAsync(); return NoContent();
    }

    // Only Admin and Receptionist logins store a name; for the others it comes from the linked profile.
    private static string? DisplayNameFor(string role, string? displayName) =>
        UserRoles.StoresDisplayName(role) ? displayName!.Trim() : null;

    // Enforces role/link consistency (also guarded by CK_Users_RoleLink): Patient role must link to an existing
    // Patient, Doctor role to an existing Doctor, and Admin/Receptionist to neither. A profile has one login at most.
    // Linking to a deactivated profile is allowed on purpose: it's how an admin restores access.
    private async Task<ActionResult?> Validate(string role, string? displayName, Guid? patientId, Guid? doctorId, Guid? userId)
    {
        if (UserRoles.StoresDisplayName(role) && string.IsNullOrWhiteSpace(displayName))
            return BadRequest(new { message = "A name is required for Admin and Receptionist users." });
        var linksValid =
            (role != UserRoles.Patient || patientId is not null && await context.Patients.AnyAsync(x => x.Id == patientId)) &&
            (role != UserRoles.Doctor || doctorId is not null && await context.Doctors.AnyAsync(x => x.Id == doctorId)) &&
            (role != UserRoles.Patient || doctorId is null) &&
            (role != UserRoles.Doctor || patientId is null) &&
            (role is UserRoles.Patient or UserRoles.Doctor || patientId is null && doctorId is null);
        if (!linksValid) return BadRequest(new { message = "The patient or doctor association is not valid for this role." });
        if (await users.ProfileLinkedAsync(patientId, doctorId, userId)) return Conflict(new { message = "That profile is already linked to another login." });
        return null;
    }
}
