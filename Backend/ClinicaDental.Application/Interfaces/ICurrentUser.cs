namespace ClinicaDental.Application.Interfaces;

// The signed-in user of the current request, or null outside a request (background services, seeding).
public interface ICurrentUser
{
    Guid? UserId { get; }
}
