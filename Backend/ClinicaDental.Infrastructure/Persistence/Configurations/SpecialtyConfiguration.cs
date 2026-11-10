using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClinicaDental.Infrastructure.Persistence.Configurations;

public sealed class SpecialtyConfiguration : IEntityTypeConfiguration<Specialty>
{
    public void Configure(EntityTypeBuilder<Specialty> entity)
    {
        entity.HasKey(s => s.Id);
        entity.Property(s => s.Name).IsRequired().HasMaxLength(80);
        // SQL Server's default collation is case-insensitive, so "orthodontics" and "Orthodontics" collide.
        entity.HasIndex(s => s.Name).IsUnique();
    }
}
