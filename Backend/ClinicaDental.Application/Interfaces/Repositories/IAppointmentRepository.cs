using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

// Abstracts persistence so use cases/controllers depend on this interface, not EF Core directly
// (Clean Architecture dependency inversion — Infrastructure implements, Application/API consume).
public interface IAppointmentRepository
{
    Task<IEnumerable<Appointment>> GetAllAsync();
    Task<Appointment?> GetByIdAsync(Guid id);
    // Doesn't save, so the booking and the schedule stamps go out in one SaveChanges.
    Task AddAsync(Appointment appointment);
    Task DeleteAsync(Appointment appointment);
    Task SaveChangesAsync();
}
