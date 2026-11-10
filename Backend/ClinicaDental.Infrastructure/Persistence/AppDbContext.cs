using ClinicaDental.Domain.Entities;
using ClinicaDental.Infrastructure.Persistence.Conventions;
using ClinicaDental.Infrastructure.Persistence.Interceptors;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext() { }

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<Specialty> Specialties => Set<Specialty>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<DentalService> Services => Set<DentalService>();
    public DbSet<DentalRecord> DentalRecords => Set<DentalRecord>();
    public DbSet<Consultation> Consultations => Set<Consultation>();
    public DbSet<Treatment> Treatments => Set<Treatment>();
    public DbSet<Payment> Payments => Set<Payment>();

    // Registered here rather than in Program.cs so it also runs when tests swap the provider for SQLite.
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.AddInterceptors(AuditInterceptor.Instance);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<decimal>().HavePrecision(18, 2);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // SQLite (tests) compares text case-sensitively; SQL Server's default collation does not.
        // NOCASE keeps the unique catalog names behaving the same in both.
        if (Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite")
        {
            modelBuilder.Entity<Specialty>().Property(s => s.Name).UseCollation("NOCASE");
            modelBuilder.Entity<DentalService>().Property(s => s.Name).UseCollation("NOCASE");
        }
    }
}
