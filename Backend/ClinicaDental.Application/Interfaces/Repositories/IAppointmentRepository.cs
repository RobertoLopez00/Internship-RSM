using ClinicaDental.Application.Common;
using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

// Abstracts persistence so use cases/controllers depend on this interface, not EF Core directly
// (Clean Architecture dependency inversion — Infrastructure implements, Application/API consume).
public interface IAppointmentRepository
{
    // Newest first, with Patient, Doctor and Service loaded. Without a page, returns every match.
    Task<PagedResult<Appointment>> ListAsync(Guid? patientId, PageRequest? page);
    // Not tracked, with Patient, Doctor and Service loaded.
    Task<Appointment?> GetDetailsAsync(Guid id);
    // Tracked (no AsNoTracking) because callers use this for updates and expect EF to detect changes.
    Task<Appointment?> GetByIdAsync(Guid id);
    // Cancelled and no-show appointments don't occupy time. Back-to-back appointments don't overlap.
    Task<bool> DoctorBusyAsync(Guid doctorId, DateTime start, DateTime end, Guid? exceptId);
    Task<bool> PatientBusyAsync(Guid patientId, DateTime start, DateTime end, Guid? exceptId);
    // Doesn't save, so the booking and the schedule stamps go out in one SaveChanges.
    Task AddAsync(Appointment appointment);
    Task DeleteAsync(Appointment appointment);
    Task SaveChangesAsync();
}
