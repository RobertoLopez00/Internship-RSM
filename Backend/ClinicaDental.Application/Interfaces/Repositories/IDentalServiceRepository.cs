using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

public interface IDentalServiceRepository
{
    Task<List<DentalService>> GetAllAsync(bool activeOnly);
    Task<DentalService?> GetByIdAsync(Guid id);
    // Case-insensitive.
    Task<bool> NameInUseAsync(string name, Guid? exceptId = null);
    Task AddAsync(DentalService service);
    Task SaveChangesAsync();
}
