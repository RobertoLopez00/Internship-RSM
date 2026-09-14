using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.Infrastructure.Persistence;

public class DentalRecordRepository : IDentalRecordRepository
{
    private readonly AppDbContext _context;

    public DentalRecordRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DentalRecord?> GetWithConsultationsAsync(Guid patientId)
    {
        return await _context.DentalRecords.AsNoTracking().Include(x => x.Consultations).ThenInclude(x => x.Doctor).SingleOrDefaultAsync(x => x.PatientId == patientId);
    }

    // Tracked (no AsNoTracking) because callers use this for updates and expect EF to detect changes.
    public async Task<DentalRecord?> GetByPatientIdAsync(Guid patientId)
    {
        return await _context.DentalRecords.SingleOrDefaultAsync(x => x.PatientId == patientId);
    }

    public async Task AddAsync(DentalRecord record)
    {
        await _context.DentalRecords.AddAsync(record);
    }

    public async Task AddConsultationAsync(Consultation consultation)
    {
        await _context.Consultations.AddAsync(consultation);
        await _context.SaveChangesAsync();
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}
