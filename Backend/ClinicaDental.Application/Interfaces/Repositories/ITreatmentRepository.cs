using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

public interface ITreatmentRepository
{
    Task<List<Treatment>> GetAllAsync();
    Task<Treatment?> GetByIdAsync(Guid id);
    Task<Treatment?> GetByIdWithPaymentsAsync(Guid id);
    Task AddAsync(Treatment treatment);
    Task AddPaymentAsync(Payment payment);
    Task SaveChangesAsync();
}
