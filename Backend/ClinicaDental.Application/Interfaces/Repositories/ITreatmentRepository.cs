using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

public interface ITreatmentRepository
{
    Task<List<Treatment>> GetAllAsync();
    Task<Treatment?> GetByIdAsync(Guid id);
    // Tracked, includes Payments.
    Task<Treatment?> GetByIdWithPaymentsAsync(Guid id);
    Task AddAsync(Treatment treatment);
    // Doesn't save, so the payment and the treatment's new concurrency stamp go out together.
    Task AddPaymentAsync(Payment payment);
    Task SaveChangesAsync();
}
