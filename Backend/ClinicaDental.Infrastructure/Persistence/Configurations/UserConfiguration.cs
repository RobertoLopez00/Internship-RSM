using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClinicaDental.Infrastructure.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> entity)
    {
        entity.HasKey(u => u.Id);
        // Email is the login identifier, so it must be unique at the DB level (not just app-checked).
        entity.HasIndex(u => u.Email).IsUnique();
        entity.Property(u => u.Email).IsRequired().HasMaxLength(150);
        entity.Property(u => u.PasswordHash).IsRequired();
        entity.Property(u => u.Role).IsRequired().HasMaxLength(30);
        entity.Property(u => u.DisplayName).HasMaxLength(200);
        entity.ToTable(t =>
        {
            t.HasCheckConstraint("CK_Users_Role", "[Role] IN ('Admin', 'Doctor', 'Receptionist', 'Patient')");
            // The link must match the role: a Patient login points to a patient, a Doctor login to a
            // doctor, and staff logins to neither.
            t.HasCheckConstraint("CK_Users_RoleLink",
                "([Role] = 'Patient' AND [PatientId] IS NOT NULL AND [DoctorId] IS NULL) OR " +
                "([Role] = 'Doctor' AND [DoctorId] IS NOT NULL AND [PatientId] IS NULL) OR " +
                "([Role] IN ('Admin', 'Receptionist') AND [PatientId] IS NULL AND [DoctorId] IS NULL)");
            // Patients and doctors take their name from the profile, so it is never copied here.
            t.HasCheckConstraint("CK_Users_DisplayName",
                "([Role] IN ('Admin', 'Receptionist') AND [DisplayName] IS NOT NULL) OR " +
                "([Role] IN ('Patient', 'Doctor') AND [DisplayName] IS NULL)");
        });
        // Restrict: a profile with a login can't be deleted out from under it. Profiles are deactivated instead.
        entity.HasOne(u => u.Patient).WithOne(p => p.User).HasForeignKey<User>(u => u.PatientId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(u => u.Doctor).WithOne(d => d.User).HasForeignKey<User>(u => u.DoctorId).OnDelete(DeleteBehavior.Restrict);
    }
}
