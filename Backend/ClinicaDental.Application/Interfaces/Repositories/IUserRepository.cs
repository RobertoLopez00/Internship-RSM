using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

public interface IUserRepository
{
    // Includes Patient and Doctor so the display name can be computed.
    Task<List<User>> GetAllAsync();
    Task<User?> GetByIdAsync(Guid id);
    Task<bool> EmailExistsAsync(string email);
    // True when another login already points to this patient or doctor profile.
    Task<bool> ProfileLinkedAsync(Guid? patientId, Guid? doctorId, Guid? exceptUserId = null);
    Task AddAsync(User user);
    Task SaveChangesAsync();
}
