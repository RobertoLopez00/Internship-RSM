using ClinicaDental.API.Contracts;
using ClinicaDental.API.Services;
using ClinicaDental.Domain.Entities;
using ClinicaDental.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.API.Controllers;

[ApiController, Route("api/auth")]
public class AuthController(AppDbContext context, IJwtTokenService tokens, IConfiguration configuration) : ControllerBase
{
    private readonly PasswordHasher<User> _passwordHasher = new();

    [AllowAnonymous, HttpPost("login")]
    public async Task<ActionResult<object>> Login(LoginRequest request)
    {
        var user = await context.Users.SingleOrDefaultAsync(x => x.Email == request.Email.Trim().ToLower());
        if (user is null || !user.IsActive || _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
            return Unauthorized(new { message = "Invalid credentials." });
        return Ok(await IssueTokens(user));
    }

    [AllowAnonymous, HttpPost("register-patient")]
    public async Task<ActionResult<object>> RegisterPatient(RegisterPatientRequest request)
    {
        var email = request.Email.Trim().ToLower();
        if (await context.Users.AnyAsync(x => x.Email == email)) return Conflict(new { message = "This email is already registered." });
        var patient = new Patient { Id = Guid.NewGuid(), FirstName = request.FirstName.Trim(), LastName = request.LastName.Trim(), Email = email, Phone = request.Phone?.Trim() ?? "", DateOfBirth = request.DateOfBirth ?? DateTime.UtcNow };
        var user = new User { Id = Guid.NewGuid(), Email = email, Role = UserRoles.Patient, DisplayName = $"{patient.FirstName} {patient.LastName}", PatientId = patient.Id };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
        context.AddRange(patient, user);
        await context.SaveChangesAsync();
        return Ok(await IssueTokens(user));
    }

    [AllowAnonymous, HttpPost("refresh")]
    public async Task<ActionResult<object>> Refresh(RefreshRequest request)
    {
        var hash = tokens.HashToken(request.RefreshToken);
        var stored = await context.RefreshTokens.Include(x => x.User).SingleOrDefaultAsync(x => x.TokenHash == hash);
        if (stored is null || stored.RevokedAt is not null || stored.ExpiresAt <= DateTime.UtcNow || stored.User is null || !stored.User.IsActive)
            return Unauthorized(new { message = "Your session expired. Please sign in again." });
        stored.RevokedAt = DateTime.UtcNow;
        var next = await IssueTokens(stored.User);
        stored.ReplacedByTokenHash = tokens.HashToken((string)next.refreshToken);
        await context.SaveChangesAsync();
        return Ok(next);
    }

    [Authorize, HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequest request)
    {
        var stored = await context.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == tokens.HashToken(request.RefreshToken));
        if (stored is not null) { stored.RevokedAt = DateTime.UtcNow; await context.SaveChangesAsync(); }
        return NoContent();
    }

    [Authorize, HttpGet("me")]
    public async Task<ActionResult<object>> Me()
    {
        var id = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var user = id is null ? null : await context.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Id == Guid.Parse(id));
        return user is null ? Unauthorized() : Ok(new { user.Id, user.Email, user.Role, user.DisplayName, user.PatientId, user.DoctorId });
    }

    private async Task<dynamic> IssueTokens(User user)
    {
        var rawRefresh = tokens.CreateRefreshToken();
        context.RefreshTokens.Add(new RefreshToken { Id = Guid.NewGuid(), UserId = user.Id, TokenHash = tokens.HashToken(rawRefresh), ExpiresAt = DateTime.UtcNow.AddDays(configuration.GetValue<int?>("Jwt:RefreshTokenDays") ?? 7) });
        await context.SaveChangesAsync();
        return new { accessToken = tokens.CreateAccessToken(user), refreshToken = rawRefresh, user = new { user.Id, user.Email, user.Role, user.DisplayName, user.PatientId, user.DoctorId } };
    }
}
