using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClinicaDental.Infrastructure.Persistence.Configurations;

public sealed class DoctorConfiguration : IEntityTypeConfiguration<Doctor>
{
    public void Configure(EntityTypeBuilder<Doctor> entity)
    {
        entity.HasKey(d => d.Id);
        entity.Property(d => d.FirstName).IsRequired().HasMaxLength(100);
        entity.Property(d => d.LastName).IsRequired().HasMaxLength(100);
        entity.Property(d => d.Email).IsRequired().HasMaxLength(150);
        entity.Property(d => d.Phone).HasMaxLength(30);
        entity.HasIndex(d => d.Email).IsUnique();
        entity.Property(d => d.ScheduleStamp).IsConcurrencyToken();
        entity.HasOne(d => d.Specialty).WithMany(s => s.Doctors).HasForeignKey(d => d.SpecialtyId).OnDelete(DeleteBehavior.Restrict);
        entity.Ignore(d => d.FullName);
    }
}
