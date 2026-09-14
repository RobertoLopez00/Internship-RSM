using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

public interface IUserRepository
{
    Task<List<User>> GetAllAsync();
    Task<User?> GetByIdAsync(Guid id);
    Task<bool> EmailExistsAsync(string email);
    Task AddAsync(User user);
    Task SaveChangesAsync();
}
