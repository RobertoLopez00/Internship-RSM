using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.Infrastructure.Persistence;

public class PatientRepository : IPatientRepository
{
    private readonly AppDbContext _context;

    public PatientRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Patient>> GetAllAsync()
    {
        return await _context.Patients.AsNoTracking().ToListAsync();
    }

    public async Task<Patient?> GetByIdAsync(Guid id)
    {
        return await _context.Patients.FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task AddAsync(Patient patient)
    {
        await _context.Patients.AddAsync(patient);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Patient patient)
    {
        _context.Patients.Update(patient);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var patient = await _context.Patients.FindAsync(id);
        if (patient is not null)
        {
            _context.Patients.Remove(patient);
            await _context.SaveChangesAsync();
        }
    }
}
