using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.Infrastructure.Persistence;

public class DentalServiceRepository : IDentalServiceRepository
{
    private readonly AppDbContext _context;

    public DentalServiceRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<DentalService>> GetAllAsync()
    {
        return await _context.Services.AsNoTracking().OrderBy(x => x.Name).ToListAsync();
    }

    // Tracked (no AsNoTracking) because callers use this for updates/deletes and expect EF to detect changes.
    public async Task<DentalService?> GetByIdAsync(Guid id)
    {
        return await _context.Services.FindAsync(id);
    }

    public async Task AddAsync(DentalService service)
    {
        await _context.Services.AddAsync(service);
        await _context.SaveChangesAsync();
    }

    public Task DeleteAsync(DentalService service)
    {
        _context.Services.Remove(service);
        return _context.SaveChangesAsync();
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}
