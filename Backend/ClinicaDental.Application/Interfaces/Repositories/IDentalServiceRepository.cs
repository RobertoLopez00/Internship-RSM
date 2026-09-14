using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

public interface IDentalServiceRepository
{
    Task<List<DentalService>> GetAllAsync();
    Task<DentalService?> GetByIdAsync(Guid id);
    Task AddAsync(DentalService service);
    Task DeleteAsync(DentalService service);
    Task SaveChangesAsync();
}
