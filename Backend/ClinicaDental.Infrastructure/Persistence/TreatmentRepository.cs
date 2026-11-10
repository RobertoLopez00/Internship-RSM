using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.Infrastructure.Persistence;

public class TreatmentRepository(AppDbContext context) : ITreatmentRepository
{
    public Task<List<Treatment>> GetAllAsync() =>
        context.Treatments.AsNoTracking().Include(x => x.Payments).Include(x => x.Patient).Include(x => x.Doctor).OrderByDescending(x => x.StartDate).ToListAsync();

    // Tracked because callers edit the result.
    public async Task<Treatment?> GetByIdAsync(Guid id) => await context.Treatments.FindAsync(id);

    public Task<Treatment?> GetByIdWithPaymentsAsync(Guid id) =>
        context.Treatments.Include(x => x.Payments).SingleOrDefaultAsync(x => x.Id == id);

    public async Task AddAsync(Treatment treatment) => await context.Treatments.AddAsync(treatment);

    public async Task AddPaymentAsync(Payment payment) => await context.Payments.AddAsync(payment);

    public Task SaveChangesAsync() => context.SaveChangesAsync();
}
