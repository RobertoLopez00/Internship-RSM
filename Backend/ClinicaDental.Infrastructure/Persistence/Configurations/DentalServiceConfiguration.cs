using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClinicaDental.Infrastructure.Persistence.Configurations;

public sealed class DentalServiceConfiguration : IEntityTypeConfiguration<DentalService>
{
    public void Configure(EntityTypeBuilder<DentalService> entity)
    {
        entity.ToTable("DentalServices", t =>
        {
            t.HasCheckConstraint("CK_DentalServices_BasePrice", "[BasePrice] >= 0");
            t.HasCheckConstraint("CK_DentalServices_Duration", "[DurationMinutes] BETWEEN 5 AND 480");
        });
        entity.HasKey(s => s.Id);
        entity.Property(s => s.Name).IsRequired().HasMaxLength(120);
        entity.Property(s => s.Description).HasMaxLength(1000);
        // Case-insensitive under SQL Server's default collation, like Specialties.Name.
        entity.HasIndex(s => s.Name).IsUnique();
    }
}
