using System.Text.RegularExpressions;
using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.Infrastructure.Persistence;

public class DoctorRepository(AppDbContext context) : IDoctorRepository
{
    public Task<List<Doctor>> GetAllAsync(bool activeOnly) =>
        context.Doctors.AsNoTracking().Include(d => d.Specialty)
            .Where(d => !activeOnly || d.IsActive)
            .OrderBy(d => d.LastName).ThenBy(d => d.FirstName)
            .ToListAsync();

    // Tracked because callers edit the result.
    public Task<Doctor?> GetByIdAsync(Guid id) => context.Doctors.Include(d => d.Specialty).FirstOrDefaultAsync(d => d.Id == id);

    public Task<bool> EmailInUseAsync(string email, Guid? exceptId = null) =>
        context.Doctors.AnyAsync(d => d.Email == email && d.Id != exceptId);

    public Task<bool> HasUpcomingAppointmentsAsync(Guid id)
    {
        var now = DateTime.UtcNow;
        return context.Appointments.AnyAsync(a => a.DoctorId == id && a.AppointmentDate > now
            && (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed));
    }

    public async Task<Specialty> GetOrAddSpecialtyAsync(string name)
    {
        var clean = Regex.Replace(name.Trim(), @"\s+", " ");
        // The column collation makes this comparison case-insensitive (SQL Server default, NOCASE in SQLite).
        var existing = context.Specialties.Local.FirstOrDefault(s => string.Equals(s.Name, clean, StringComparison.OrdinalIgnoreCase))
            ?? await context.Specialties.FirstOrDefaultAsync(s => s.Name == clean);
        if (existing is not null) return existing;
        var specialty = new Specialty { Id = Guid.NewGuid(), Name = clean };
        await context.Specialties.AddAsync(specialty);
        return specialty;
    }

    public Task<List<string>> GetSpecialtyNamesAsync() => context.Specialties.AsNoTracking().OrderBy(s => s.Name).Select(s => s.Name).ToListAsync();

    public async Task AddAsync(Doctor doctor) => await context.Doctors.AddAsync(doctor);

    public async Task SetActiveAsync(Doctor doctor, bool isActive)
    {
        doctor.IsActive = isActive;
        var login = await context.Users.FirstOrDefaultAsync(u => u.DoctorId == doctor.Id);
        if (login is not null) login.IsActive = isActive;
    }

    public Task SaveChangesAsync() => context.SaveChangesAsync();
}
