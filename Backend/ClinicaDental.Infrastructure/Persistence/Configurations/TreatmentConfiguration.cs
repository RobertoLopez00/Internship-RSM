using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClinicaDental.Infrastructure.Persistence.Configurations;

public sealed class TreatmentConfiguration : IEntityTypeConfiguration<Treatment>
{
    public void Configure(EntityTypeBuilder<Treatment> entity)
    {
        entity.ToTable(t =>
        {
            t.HasCheckConstraint("CK_Treatments_Status", "[Status] IN ('Planned', 'InProgress', 'Completed', 'Cancelled')");
            t.HasCheckConstraint("CK_Treatments_Cost", "[Cost] >= 0");
            t.HasCheckConstraint("CK_Treatments_Dates", "[EndDate] IS NULL OR [EndDate] >= [StartDate]");
        });
        entity.HasKey(t => t.Id);
        entity.Property(t => t.Name).IsRequired().HasMaxLength(200);
        entity.Property(t => t.Status).HasConversion<string>().HasMaxLength(30);
        entity.Property(t => t.ConcurrencyStamp).IsConcurrencyToken();
        entity.Property(t => t.Observations).HasMaxLength(4000);
        entity.HasOne(t => t.Patient).WithMany(p => p.Treatments).HasForeignKey(t => t.PatientId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(t => t.Doctor).WithMany(d => d.Treatments).HasForeignKey(t => t.DoctorId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> entity)
    {
        entity.ToTable(t =>
        {
            t.HasCheckConstraint("CK_Payments_Amount", "[Amount] > 0");
            t.HasCheckConstraint("CK_Payments_Method", "[Method] IN ('Cash', 'CreditCard', 'DebitCard', 'BankTransfer', 'Insurance', 'Other')");
        });
        entity.HasKey(p => p.Id);
        entity.Property(p => p.Method).IsRequired().HasMaxLength(30);
        entity.Property(p => p.Notes).HasMaxLength(1000);
        // Restrict: financial history is never deleted as a side effect.
        entity.HasOne(p => p.Treatment).WithMany(t => t.Payments).HasForeignKey(p => p.TreatmentId).OnDelete(DeleteBehavior.Restrict);
    }
}
