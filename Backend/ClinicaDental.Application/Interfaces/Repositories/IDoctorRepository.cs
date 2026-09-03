using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

public interface IDoctorRepository
{
    Task<IEnumerable<Doctor>> GetAllAsync();
    Task<Doctor?> GetByIdAsync(Guid id);
    Task AddAsync(Doctor doctor);
    Task UpdateAsync(Doctor doctor);
    Task DeleteAsync(Guid id);
}
