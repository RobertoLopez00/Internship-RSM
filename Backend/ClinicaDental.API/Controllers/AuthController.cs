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

    // Users with their profile, which GetDisplayName needs.
    private IQueryable<User> UsersWithProfile => context.Users.Include(x => x.Patient).Include(x => x.Doctor);

    [AllowAnonymous, HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await UsersWithProfile.SingleOrDefaultAsync(x => x.Email == request.Email.Trim().ToLower());
        if (user is null || !user.IsActive || _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
            return Unauthorized(new { message = "Invalid credentials." });
        var (response, _) = IssueTokens(user);
        await context.SaveChangesAsync();
        return Ok(response);
    }

    [AllowAnonymous, HttpPost("register-patient")]
    public async Task<ActionResult<AuthResponse>> RegisterPatient(RegisterPatientRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await context.Users.AnyAsync(x => x.Email == email)) return Conflict(new { message = "This email is already registered." });
        // Never link to an existing record automatically: knowing someone's email must not be enough to take
        // over their clinical history. An admin links the login from Users instead.
        if (await context.Patients.AnyAsync(x => x.Email == email))
            return Conflict(new { message = "The clinic already has a patient record with this email. Please contact the clinic so they can give you access to it." });
        var patient = new Patient { Id = Guid.NewGuid(), FirstName = request.FirstName.Trim(), LastName = request.LastName.Trim(), Email = email, Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(), DateOfBirth = request.DateOfBirth };
        var user = new User { Id = Guid.NewGuid(), Email = email, Role = UserRoles.Patient, PatientId = patient.Id, Patient = patient };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
        context.AddRange(patient, user);
        var (response, _) = IssueTokens(user);
        await context.SaveChangesAsync();
        return Ok(response);
    }

    [AllowAnonymous, HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request)
    {
        // Refresh tokens are stored only as a hash, never in plaintext, so lookup re-hashes the incoming token.
        var hash = tokens.HashToken(request.RefreshToken);
        var stored = await context.RefreshTokens.Include(x => x.User).ThenInclude(x => x!.Patient).Include(x => x.User).ThenInclude(x => x!.Doctor).SingleOrDefaultAsync(x => x.TokenHash == hash);
        if (stored is null || stored.RevokedAt is not null || stored.ExpiresAt <= DateTime.UtcNow || stored.User is null || !stored.User.IsActive)
            return Unauthorized(new { message = "Your session expired. Please sign in again." });
        // Rotation: revoke the used token and link it to its replacement, so a stolen/replayed
        // refresh token can be detected (its replacement chain lets us trace reuse).
        stored.RevokedAt = DateTime.UtcNow;
        var (response, next) = IssueTokens(stored.User);
        stored.ReplacedByToken = next;
        await context.SaveChangesAsync();
        return Ok(response);
    }

    [Authorize, HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequest request)
    {
        var stored = await context.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == tokens.HashToken(request.RefreshToken));
        if (stored is not null) { stored.RevokedAt = DateTime.UtcNow; await context.SaveChangesAsync(); }
        return NoContent();
    }

    [Authorize, HttpGet("me")]
    public async Task<ActionResult<SessionUser>> Me()
    {
        var id = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var user = id is null ? null : await UsersWithProfile.AsNoTracking().SingleOrDefaultAsync(x => x.Id == Guid.Parse(id));
        return user is null ? Unauthorized() : Ok(SessionUser.From(user));
    }

    // Issues a short-lived access token plus a long-lived refresh token; only the refresh token's
    // hash is persisted, and the raw value is returned to the client exactly once. The caller saves.
    private (AuthResponse Response, RefreshToken Stored) IssueTokens(User user)
    {
        var rawRefresh = tokens.CreateRefreshToken();
        var stored = new RefreshToken { Id = Guid.NewGuid(), UserId = user.Id, TokenHash = tokens.HashToken(rawRefresh), ExpiresAt = DateTime.UtcNow.AddDays(configuration.GetValue<int?>("Jwt:RefreshTokenDays") ?? 7) };
        context.RefreshTokens.Add(stored);
        return (new AuthResponse(tokens.CreateAccessToken(user), rawRefresh, SessionUser.From(user)), stored);
    }
}
