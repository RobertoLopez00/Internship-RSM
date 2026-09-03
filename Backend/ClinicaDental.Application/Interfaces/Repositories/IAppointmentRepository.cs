using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

public interface IAppointmentRepository
{
    Task<IEnumerable<Appointment>> GetAllAsync();
    Task<Appointment?> GetByIdAsync(Guid id);
    Task AddAsync(Appointment appointment);
    Task UpdateAsync(Appointment appointment);
    Task DeleteAsync(Guid id);
}
