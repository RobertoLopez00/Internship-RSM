using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClinicaDental.Infrastructure.Persistence.Configurations;

public sealed class PatientConfiguration : IEntityTypeConfiguration<Patient>
{
    public void Configure(EntityTypeBuilder<Patient> entity)
    {
        entity.HasKey(p => p.Id);
        entity.Property(p => p.FirstName).IsRequired().HasMaxLength(100);
        entity.Property(p => p.LastName).IsRequired().HasMaxLength(100);
        entity.Property(p => p.Email).IsRequired().HasMaxLength(150);
        entity.Property(p => p.Phone).HasMaxLength(30);
        entity.Property(p => p.DateOfBirth).HasColumnType("date");
        entity.HasIndex(p => p.Email).IsUnique();
        entity.Property(p => p.ScheduleStamp).IsConcurrencyToken();
        entity.Ignore(p => p.FullName);
    }
}
