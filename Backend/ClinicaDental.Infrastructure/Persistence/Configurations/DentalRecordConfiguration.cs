using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClinicaDental.Infrastructure.Persistence.Configurations;

public sealed class DentalRecordConfiguration : IEntityTypeConfiguration<DentalRecord>
{
    public void Configure(EntityTypeBuilder<DentalRecord> entity)
    {
        entity.HasKey(r => r.Id);
        entity.Property(r => r.MedicalHistory).HasMaxLength(4000);
        entity.Property(r => r.Allergies).HasMaxLength(4000);
        entity.Property(r => r.Medications).HasMaxLength(4000);
        entity.Property(r => r.Observations).HasMaxLength(4000);
        // One dental record per patient (1:1), enforced via a unique index on the FK.
        entity.HasIndex(r => r.PatientId).IsUnique();
        entity.HasOne(r => r.Patient).WithOne(p => p.DentalRecord).HasForeignKey<DentalRecord>(r => r.PatientId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConsultationConfiguration : IEntityTypeConfiguration<Consultation>
{
    public void Configure(EntityTypeBuilder<Consultation> entity)
    {
        entity.HasKey(c => c.Id);
        entity.Property(c => c.Notes).IsRequired().HasMaxLength(4000);
        entity.Property(c => c.Diagnosis).HasMaxLength(2000);
        entity.HasOne(c => c.DentalRecord).WithMany(r => r.Consultations).HasForeignKey(c => c.DentalRecordId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(c => c.Doctor).WithMany().HasForeignKey(c => c.DoctorId).OnDelete(DeleteBehavior.Restrict);
        // Deleting the appointment only clears the link; the consultation stays in the record.
        entity.HasOne(c => c.Appointment).WithMany().HasForeignKey(c => c.AppointmentId).OnDelete(DeleteBehavior.SetNull);
        entity.HasIndex(c => c.AppointmentId).IsUnique().HasFilter("[AppointmentId] IS NOT NULL");
    }
}
