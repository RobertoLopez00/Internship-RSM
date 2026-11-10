using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

public interface IPatientRepository
{
    Task<List<Patient>> GetAllAsync();
    Task<Patient?> GetByIdAsync(Guid id);
    Task<bool> EmailInUseAsync(string email, Guid? exceptId = null);
    // Pending or confirmed appointments that haven't started yet.
    Task<bool> HasUpcomingAppointmentsAsync(Guid id);
    Task AddAsync(Patient patient);
    // Changes the profile and its login together. Doesn't save.
    Task SetActiveAsync(Patient patient, bool isActive);
    Task SaveChangesAsync();
}
