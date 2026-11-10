using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.Infrastructure.Persistence;

public class PatientRepository(AppDbContext context) : IPatientRepository
{
    public Task<List<Patient>> GetAllAsync() =>
        context.Patients.AsNoTracking().OrderBy(p => p.LastName).ThenBy(p => p.FirstName).ToListAsync();

    // Tracked because callers edit the result.
    public Task<Patient?> GetByIdAsync(Guid id) => context.Patients.FirstOrDefaultAsync(p => p.Id == id);

    public Task<bool> EmailInUseAsync(string email, Guid? exceptId = null) =>
        context.Patients.AnyAsync(p => p.Email == email && p.Id != exceptId);

    public Task<bool> HasUpcomingAppointmentsAsync(Guid id)
    {
        var now = DateTime.UtcNow;
        return context.Appointments.AnyAsync(a => a.PatientId == id && a.AppointmentDate > now
            && (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed));
    }

    public async Task AddAsync(Patient patient) => await context.Patients.AddAsync(patient);

    public async Task SetActiveAsync(Patient patient, bool isActive)
    {
        patient.IsActive = isActive;
        var login = await context.Users.FirstOrDefaultAsync(u => u.PatientId == patient.Id);
        if (login is not null) login.IsActive = isActive;
    }

    public Task SaveChangesAsync() => context.SaveChangesAsync();
}
