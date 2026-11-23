using ClinicaDental.Application.Common;
using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

public interface IPatientRepository
{
    // Ordered by name. Without a page, returns every patient.
    Task<PagedResult<Patient>> ListAsync(PageRequest? page);
    // Tracked because callers edit the result.
    Task<Patient?> GetByIdAsync(Guid id);
    Task<bool> EmailInUseAsync(string email, Guid? exceptId = null);
    // Pending or confirmed appointments that haven't started yet.
    Task<bool> HasUpcomingAppointmentsAsync(Guid id);
    Task AddAsync(Patient patient);
    // Changes the profile and its login together. Doesn't save.
    Task SetActiveAsync(Patient patient, bool isActive);
    Task SaveChangesAsync();
}
