using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.Infrastructure.Persistence;

public class TreatmentRepository : ITreatmentRepository
{
    private readonly AppDbContext _context;

    public TreatmentRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Treatment>> GetAllAsync()
    {
        return await _context.Treatments.AsNoTracking().Include(x => x.Payments).Include(x => x.Patient).Include(x => x.Doctor).OrderByDescending(x => x.StartDate).ToListAsync();
    }

    // Tracked (no AsNoTracking) because callers use this for updates and expect EF to detect changes.
    public async Task<Treatment?> GetByIdAsync(Guid id)
    {
        return await _context.Treatments.FindAsync(id);
    }

    public async Task<Treatment?> GetByIdWithPaymentsAsync(Guid id)
    {
        return await _context.Treatments.Include(x => x.Payments).SingleOrDefaultAsync(x => x.Id == id);
    }

    public async Task AddAsync(Treatment treatment)
    {
        await _context.Treatments.AddAsync(treatment);
        await _context.SaveChangesAsync();
    }

    public async Task AddPaymentAsync(Payment payment)
    {
        await _context.Payments.AddAsync(payment);
        await _context.SaveChangesAsync();
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}
