using ClinicaDental.Application.Common;
using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

public interface ITreatmentRepository
{
    // Newest first, with Patient, Doctor and Payments loaded. Without a page, returns every treatment.
    Task<PagedResult<Treatment>> ListAsync(PageRequest? page);
    // Not tracked, with Patient, Doctor and Payments loaded.
    Task<Treatment?> GetDetailsAsync(Guid id);
    Task<Treatment?> GetByIdAsync(Guid id);
    // Tracked, includes Payments.
    Task<Treatment?> GetByIdWithPaymentsAsync(Guid id);
    Task AddAsync(Treatment treatment);
    // Doesn't save, so the payment and the treatment's new concurrency stamp go out together.
    Task AddPaymentAsync(Payment payment);
    Task SaveChangesAsync();
}
