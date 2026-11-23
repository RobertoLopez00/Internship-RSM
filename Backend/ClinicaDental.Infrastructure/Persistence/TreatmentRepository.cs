using ClinicaDental.Application.Common;
using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.Infrastructure.Persistence;

public class TreatmentRepository(AppDbContext context) : ITreatmentRepository
{
    private IQueryable<Treatment> WithDetails => context.Treatments.AsNoTracking().Include(x => x.Payments).Include(x => x.Patient).Include(x => x.Doctor);

    public async Task<PagedResult<Treatment>> ListAsync(PageRequest? page)
    {
        var total = await context.Treatments.CountAsync();
        var ordered = WithDetails.OrderByDescending(x => x.StartDate).ThenBy(x => x.Id);
        var items = page is null ? await ordered.ToListAsync() : await ordered.Skip(page.Skip).Take(page.PageSize).ToListAsync();
        return new PagedResult<Treatment>(items, total);
    }

    public Task<Treatment?> GetDetailsAsync(Guid id) => WithDetails.SingleOrDefaultAsync(x => x.Id == id);

    // Tracked because callers edit the result.
    public async Task<Treatment?> GetByIdAsync(Guid id) => await context.Treatments.FindAsync(id);

    public Task<Treatment?> GetByIdWithPaymentsAsync(Guid id) =>
        context.Treatments.Include(x => x.Payments).SingleOrDefaultAsync(x => x.Id == id);

    public async Task AddAsync(Treatment treatment) => await context.Treatments.AddAsync(treatment);

    public async Task AddPaymentAsync(Payment payment) => await context.Payments.AddAsync(payment);

    public Task SaveChangesAsync() => context.SaveChangesAsync();
}
