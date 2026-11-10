using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.Infrastructure.Persistence;

public class UserRepository(AppDbContext context) : IUserRepository
{
    public Task<List<User>> GetAllAsync() =>
        context.Users.AsNoTracking().Include(x => x.Patient).Include(x => x.Doctor).OrderBy(x => x.Email).ToListAsync();

    // Tracked because callers edit the result. Includes the profile for the display name.
    public Task<User?> GetByIdAsync(Guid id) =>
        context.Users.Include(x => x.Patient).Include(x => x.Doctor).FirstOrDefaultAsync(x => x.Id == id);

    public Task<bool> EmailExistsAsync(string email) => context.Users.AnyAsync(x => x.Email == email);

    public Task<bool> ProfileLinkedAsync(Guid? patientId, Guid? doctorId, Guid? exceptUserId = null) =>
        context.Users.AnyAsync(x => x.Id != exceptUserId
            && ((patientId != null && x.PatientId == patientId) || (doctorId != null && x.DoctorId == doctorId)));

    public async Task AddAsync(User user) => await context.Users.AddAsync(user);

    public Task SaveChangesAsync() => context.SaveChangesAsync();
}
