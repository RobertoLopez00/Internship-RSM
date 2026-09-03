using ClinicaDental.Domain.Entities;
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
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<DentalService> Services => Set<DentalService>();
    public DbSet<DentalRecord> DentalRecords => Set<DentalRecord>();
    public DbSet<Consultation> Consultations => Set<Consultation>();
    public DbSet<Treatment> Treatments => Set<Treatment>();
    public DbSet<Payment> Payments => Set<Payment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(p => p.LastName).IsRequired().HasMaxLength(100);
            entity.Property(p => p.Email).IsRequired().HasMaxLength(150);
            entity.Property(p => p.Phone).HasMaxLength(30);
        });

        modelBuilder.Entity<Doctor>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.Property(d => d.Name).IsRequired().HasMaxLength(100);
            entity.Property(d => d.LastName).IsRequired().HasMaxLength(100);
            entity.Property(d => d.Specialty).IsRequired().HasMaxLength(80);
            entity.Property(d => d.Email).HasMaxLength(150);
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Status).IsRequired().HasMaxLength(50);
            entity.Property(a => a.Notes).HasMaxLength(500);
            entity.HasIndex(a => a.PatientId);
            entity.HasIndex(a => a.DoctorId);
            entity.HasIndex(a => new { a.DoctorId, a.AppointmentDate });
            entity.HasOne(a => a.Patient).WithMany(p => p.Appointments).HasForeignKey(a => a.PatientId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(a => a.Doctor).WithMany(d => d.Appointments).HasForeignKey(a => a.DoctorId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(a => a.Service).WithMany(s => s.Appointments).HasForeignKey(a => a.ServiceId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).IsRequired().HasMaxLength(150);
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Role).IsRequired().HasMaxLength(30);
            entity.Property(u => u.DisplayName).IsRequired().HasMaxLength(200);
            entity.HasOne(u => u.Patient).WithOne(p => p.User).HasForeignKey<User>(u => u.PatientId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(u => u.Doctor).WithOne(d => d.User).HasForeignKey<User>(u => u.DoctorId).OnDelete(DeleteBehavior.SetNull);
        });
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.HasIndex(t => t.TokenHash).IsUnique();
            entity.Property(t => t.TokenHash).IsRequired().HasMaxLength(128);
            entity.HasOne(t => t.User).WithMany(u => u.RefreshTokens).HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<DentalService>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Name).IsRequired().HasMaxLength(120);
            entity.Property(s => s.Description).HasMaxLength(1000);
            entity.Property(s => s.BasePrice).HasPrecision(18, 2);
        });
        modelBuilder.Entity<DentalRecord>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.HasIndex(r => r.PatientId).IsUnique();
            entity.HasOne(r => r.Patient).WithOne(p => p.DentalRecord).HasForeignKey<DentalRecord>(r => r.PatientId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<Consultation>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Notes).IsRequired().HasMaxLength(4000);
            entity.HasOne(c => c.DentalRecord).WithMany(r => r.Consultations).HasForeignKey(c => c.DentalRecordId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(c => c.Doctor).WithMany().HasForeignKey(c => c.DoctorId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<Treatment>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Name).IsRequired().HasMaxLength(200);
            entity.Property(t => t.Status).IsRequired().HasMaxLength(30);
            entity.Property(t => t.Cost).HasPrecision(18, 2);
            entity.HasOne(t => t.Patient).WithMany(p => p.Treatments).HasForeignKey(t => t.PatientId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(t => t.Doctor).WithMany(d => d.Treatments).HasForeignKey(t => t.DoctorId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Amount).HasPrecision(18, 2);
            entity.HasOne(p => p.Treatment).WithMany(t => t.Payments).HasForeignKey(p => p.TreatmentId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
