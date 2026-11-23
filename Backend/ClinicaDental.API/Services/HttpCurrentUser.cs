using System.Security.Claims;
using ClinicaDental.Application.Interfaces;

namespace ClinicaDental.API.Services;

// Reads the user id from the validated JWT of the current request.
public sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public Guid? UserId =>
        Guid.TryParse(accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
}
