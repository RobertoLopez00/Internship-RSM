using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

public interface IPatientRepository
{
    Task<IEnumerable<Patient>> GetAllAsync();
    Task<Patient?> GetByIdAsync(Guid id);
    Task AddAsync(Patient patient);
    Task UpdateAsync(Patient patient);
    Task DeleteAsync(Guid id);
}
