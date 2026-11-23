using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.Infrastructure.Persistence;

public class DentalServiceRepository(AppDbContext context) : IDentalServiceRepository
{
    public Task<List<DentalService>> GetAllAsync(bool activeOnly) =>
        context.Services.AsNoTracking().Where(s => !activeOnly || s.IsActive).OrderBy(s => s.Name).ToListAsync();

    // Tracked because callers edit the result.
    public async Task<DentalService?> GetByIdAsync(Guid id) => await context.Services.FindAsync(id);

    // The column collation makes this case-insensitive (SQL Server default, NOCASE in SQLite).
    public Task<bool> NameInUseAsync(string name, Guid? exceptId = null) =>
        context.Services.AnyAsync(s => s.Name == name && s.Id != exceptId);

    public async Task AddAsync(DentalService service) => await context.Services.AddAsync(service);

    public Task SaveChangesAsync() => context.SaveChangesAsync();
}
