using ClinicaDental.Application.Common;
using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.Infrastructure.Persistence;

public class AppointmentRepository(AppDbContext context) : IAppointmentRepository
{
    private IQueryable<Appointment> WithDetails => context.Appointments.AsNoTracking()
        .Include(a => a.Patient).Include(a => a.Doctor).ThenInclude(d => d!.Specialty).Include(a => a.Service);

    public async Task<PagedResult<Appointment>> ListAsync(Guid? patientId, PageRequest? page)
    {
        var query = WithDetails.Where(a => patientId == null || a.PatientId == patientId);
        var total = await query.CountAsync();
        var ordered = query.OrderByDescending(a => a.AppointmentDate).ThenBy(a => a.Id);
        var items = page is null ? await ordered.ToListAsync() : await ordered.Skip(page.Skip).Take(page.PageSize).ToListAsync();
        return new PagedResult<Appointment>(items, total);
    }

    public Task<Appointment?> GetDetailsAsync(Guid id) => WithDetails.FirstOrDefaultAsync(a => a.Id == id);

    public Task<Appointment?> GetByIdAsync(Guid id) => context.Appointments.FirstOrDefaultAsync(a => a.Id == id);

    public Task<bool> DoctorBusyAsync(Guid doctorId, DateTime start, DateTime end, Guid? exceptId) =>
        context.Appointments.AnyAsync(x => x.DoctorId == doctorId && x.Id != exceptId
            && x.Status != AppointmentStatus.Cancelled && x.Status != AppointmentStatus.NoShow
            && x.AppointmentDate < end && x.EndsAt > start);

    public Task<bool> PatientBusyAsync(Guid patientId, DateTime start, DateTime end, Guid? exceptId) =>
        context.Appointments.AnyAsync(x => x.PatientId == patientId && x.Id != exceptId
            && x.Status != AppointmentStatus.Cancelled && x.Status != AppointmentStatus.NoShow
            && x.AppointmentDate < end && x.EndsAt > start);

    public async Task AddAsync(Appointment appointment) => await context.Appointments.AddAsync(appointment);

    public async Task DeleteAsync(Appointment appointment)
    {
        context.Appointments.Remove(appointment);
        await context.SaveChangesAsync();
    }

    public Task SaveChangesAsync() => context.SaveChangesAsync();
}
