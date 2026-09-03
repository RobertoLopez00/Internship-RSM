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
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Name, user.DisplayName), new Claim(ClaimTypes.Role, user.Role)
        };
        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.UtcNow.AddMinutes(jwt.GetValue<int?>("AccessTokenMinutes") ?? 15);
        return new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(jwt["Issuer"], jwt["Audience"], claims, expires: expiry, signingCredentials: credentials));
    }
    public string CreateRefreshToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    public string HashToken(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
