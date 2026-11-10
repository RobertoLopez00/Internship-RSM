using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.Infrastructure.Persistence;

public class AppointmentRepository(AppDbContext context) : IAppointmentRepository
{
    public async Task<IEnumerable<Appointment>> GetAllAsync() => await context.Appointments.AsNoTracking().ToListAsync();

    // Tracked (no AsNoTracking) because callers use this for updates and expect EF to detect changes.
    public Task<Appointment?> GetByIdAsync(Guid id) => context.Appointments.FirstOrDefaultAsync(a => a.Id == id);

    public async Task AddAsync(Appointment appointment) => await context.Appointments.AddAsync(appointment);

    public async Task DeleteAsync(Appointment appointment)
    {
        context.Appointments.Remove(appointment);
        await context.SaveChangesAsync();
    }

    public Task SaveChangesAsync() => context.SaveChangesAsync();
}
