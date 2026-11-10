using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

public interface IDoctorRepository
{
    // Includes Specialty.
    Task<List<Doctor>> GetAllAsync(bool activeOnly);
    // Tracked, includes Specialty.
    Task<Doctor?> GetByIdAsync(Guid id);
    Task<bool> EmailInUseAsync(string email, Guid? exceptId = null);
    Task<bool> HasUpcomingAppointmentsAsync(Guid id);
    // Finds the specialty by name (case-insensitive) or adds it to the catalog. Doesn't save.
    Task<Specialty> GetOrAddSpecialtyAsync(string name);
    Task<List<string>> GetSpecialtyNamesAsync();
    Task AddAsync(Doctor doctor);
    // Changes the profile and its login together. Doesn't save.
    Task SetActiveAsync(Doctor doctor, bool isActive);
    Task SaveChangesAsync();
}
