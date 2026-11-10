using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClinicaDental.Infrastructure.Persistence.Configurations;

public sealed class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
{
    public void Configure(EntityTypeBuilder<Appointment> entity)
    {
        entity.HasKey(a => a.Id);
        entity.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);
        entity.Property(a => a.Notes).IsRequired().HasMaxLength(500);
        entity.ToTable(t =>
        {
            t.HasCheckConstraint("CK_Appointments_Status", "[Status] IN ('Pending', 'Confirmed', 'Completed', 'Cancelled', 'NoShow')");
            t.HasCheckConstraint("CK_Appointments_EndsAt", "[EndsAt] > [AppointmentDate]");
        });

        // Last line of defense against double booking: two concurrent requests for the same doctor and
        // start time can't both be saved. Cancelled and no-show appointments free their slot.
        entity.HasIndex(a => new { a.DoctorId, a.AppointmentDate }).IsUnique()
            .HasDatabaseName("UX_Appointments_Doctor_Slot")
            .HasFilter("[Status] <> 'Cancelled' AND [Status] <> 'NoShow'");
        entity.HasIndex(a => new { a.PatientId, a.AppointmentDate });
        entity.HasIndex(a => a.AppointmentDate);

        entity.HasOne(a => a.Patient).WithMany(p => p.Appointments).HasForeignKey(a => a.PatientId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(a => a.Doctor).WithMany(d => d.Appointments).HasForeignKey(a => a.DoctorId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(a => a.Service).WithMany(s => s.Appointments).HasForeignKey(a => a.ServiceId).OnDelete(DeleteBehavior.Restrict);
    }
}
