using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using ClinicaDental.Domain.Entities;
using Microsoft.IdentityModel.Tokens;

namespace ClinicaDental.API.Services;

public interface IJwtTokenService
{
    string CreateAccessToken(User user);
    string CreateRefreshToken();
    string HashToken(string token);
}

public sealed class JwtTokenService(IConfiguration configuration) : IJwtTokenService
{
    private readonly IConfiguration _configuration = configuration;
    public string CreateAccessToken(User user)
    {
        var jwt = _configuration.GetSection("Jwt");
        var key = jwt["Key"] ?? throw new InvalidOperationException("JWT key is not configured.");
        // Both Sub/NameIdentifier and duplicate id claims are included because different parts of the
        // pipeline/framework read different claim types; Role drives [Authorize(Roles=...)] checks.
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Name, user.DisplayName), new Claim(ClaimTypes.Role, user.Role)
        };
        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        // Access tokens are intentionally short-lived (default 15 min); the refresh token is what
        // provides long-lived sessions, limiting the damage window if an access token leaks.
        var expiry = DateTime.UtcNow.AddMinutes(jwt.GetValue<int?>("AccessTokenMinutes") ?? 15);
        return new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(jwt["Issuer"], jwt["Audience"], claims, expires: expiry, signingCredentials: credentials));
    }
    // Cryptographically random, not a JWT — opaque token whose only job is to be unguessable.
    public string CreateRefreshToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    // Only the hash is ever stored in the DB, so a database leak doesn't expose usable refresh tokens.
    public string HashToken(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
