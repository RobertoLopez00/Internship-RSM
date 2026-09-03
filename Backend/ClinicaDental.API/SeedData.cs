using ClinicaDental.Domain.Entities;
using ClinicaDental.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;

namespace ClinicaDental.API;

public static class SeedData
{
    public static void SeedSampleData(AppDbContext db)
    {
        if (db.Services.Any()) return;

        var now = DateTime.UtcNow;

        var services = new List<DentalService>
        {
            new() { Id = Guid.NewGuid(), Name = "Dental Cleaning", Description = "Routine cleaning and checkup", BasePrice = 50, DurationMinutes = 30, IsActive = true },
            new() { Id = Guid.NewGuid(), Name = "Orthodontics Consultation", Description = "Initial braces/aligners assessment", BasePrice = 80, DurationMinutes = 45, IsActive = true },
            new() { Id = Guid.NewGuid(), Name = "Teeth Whitening", Description = "In-office whitening treatment", BasePrice = 150, DurationMinutes = 60, IsActive = true },
            new() { Id = Guid.NewGuid(), Name = "Dental Implant Consultation", Description = "Implant evaluation and planning", BasePrice = 100, DurationMinutes = 45, IsActive = true },
            new() { Id = Guid.NewGuid(), Name = "Pediatric Checkup", Description = "Routine checkup for children", BasePrice = 40, DurationMinutes = 30, IsActive = true },
        };

        var doctors = new List<Doctor>
        {
            new() { Id = Guid.NewGuid(), Name = "Sofia", LastName = "Martinez", Specialty = "General Dentistry", Phone = "555-1001", Email = "sofia.martinez@dentalcare.com", IsActive = true },
            new() { Id = Guid.NewGuid(), Name = "Daniel", LastName = "Rivera", Specialty = "Orthodontics", Phone = "555-1002", Email = "daniel.rivera@dentalcare.com", IsActive = true },
            new() { Id = Guid.NewGuid(), Name = "Valeria", LastName = "Gomez", Specialty = "Implantology", Phone = "555-1003", Email = "valeria.gomez@dentalcare.com", IsActive = true },
        };

        var patients = new List<Patient>
        {
            new() { Id = Guid.NewGuid(), FirstName = "Juan", LastName = "Perez", Email = "juan.perez@example.com", Phone = "555-2001", DateOfBirth = new DateTime(1990, 3, 15, 0, 0, 0, DateTimeKind.Utc), IsActive = true },
            new() { Id = Guid.NewGuid(), FirstName = "Maria", LastName = "Lopez", Email = "maria.lopez@example.com", Phone = "555-2002", DateOfBirth = new DateTime(1985, 7, 22, 0, 0, 0, DateTimeKind.Utc), IsActive = true },
            new() { Id = Guid.NewGuid(), FirstName = "Carlos", LastName = "Diaz", Email = "carlos.diaz@example.com", Phone = "555-2003", DateOfBirth = new DateTime(1998, 11, 2, 0, 0, 0, DateTimeKind.Utc), IsActive = true },
            new() { Id = Guid.NewGuid(), FirstName = "Laura", LastName = "Fernandez", Email = "laura.fernandez@example.com", Phone = "555-2004", DateOfBirth = new DateTime(2001, 1, 30, 0, 0, 0, DateTimeKind.Utc), IsActive = true },
        };

        db.Services.AddRange(services);
        db.Doctors.AddRange(doctors);
        db.Patients.AddRange(patients);

        var appointments = new List<Appointment>
        {
            new() { Id = Guid.NewGuid(), PatientId = patients[0].Id, DoctorId = doctors[0].Id, ServiceId = services[0].Id, AppointmentDate = now.AddDays(1).Date.AddHours(10), Status = AppointmentStatuses.Confirmed, Notes = "First visit", CreatedAt = now },
            new() { Id = Guid.NewGuid(), PatientId = patients[1].Id, DoctorId = doctors[1].Id, ServiceId = services[1].Id, AppointmentDate = now.AddDays(2).Date.AddHours(14), Status = AppointmentStatuses.Pending, Notes = "Braces consultation", CreatedAt = now },
            new() { Id = Guid.NewGuid(), PatientId = patients[2].Id, DoctorId = doctors[2].Id, ServiceId = services[3].Id, AppointmentDate = now.AddDays(3).Date.AddHours(9), Status = AppointmentStatuses.Pending, Notes = "", CreatedAt = now },
            new() { Id = Guid.NewGuid(), PatientId = patients[3].Id, DoctorId = doctors[0].Id, ServiceId = services[4].Id, AppointmentDate = now.AddDays(1).Date.AddHours(16), Status = AppointmentStatuses.Confirmed, Notes = "Annual checkup", CreatedAt = now },
            new() { Id = Guid.NewGuid(), PatientId = patients[0].Id, DoctorId = doctors[1].Id, ServiceId = services[2].Id, AppointmentDate = now.AddDays(5).Date.AddHours(11), Status = AppointmentStatuses.Completed, Notes = "Done", CreatedAt = now },
        };
        db.Appointments.AddRange(appointments);

        var orthoTreatment = new Treatment { Id = Guid.NewGuid(), PatientId = patients[0].Id, DoctorId = doctors[1].Id, Name = "Full Orthodontic Treatment", Status = TreatmentStatuses.InProgress, StartDate = now.AddDays(-30), EndDate = null, Cost = 1800, Observations = "18-month plan" };
        var implantTreatment = new Treatment { Id = Guid.NewGuid(), PatientId = patients[1].Id, DoctorId = doctors[2].Id, Name = "Dental Implant - Lower Molar", Status = TreatmentStatuses.Planned, StartDate = now, EndDate = null, Cost = 1200, Observations = "" };
        var rootCanalTreatment = new Treatment { Id = Guid.NewGuid(), PatientId = patients[2].Id, DoctorId = doctors[0].Id, Name = "Root Canal", Status = TreatmentStatuses.Completed, StartDate = now.AddDays(-10), EndDate = now.AddDays(-3), Cost = 400, Observations = "Upper right molar" };
        db.Treatments.AddRange(orthoTreatment, implantTreatment, rootCanalTreatment);

        db.Payments.AddRange(
            new Payment { Id = Guid.NewGuid(), TreatmentId = orthoTreatment.Id, Amount = 900, PaidAt = now, Method = "Credit card", Notes = "First installment" },
            new Payment { Id = Guid.NewGuid(), TreatmentId = rootCanalTreatment.Id, Amount = 400, PaidAt = now, Method = "Cash", Notes = "Paid in full" }
        );

        var dentalRecord = new DentalRecord { Id = Guid.NewGuid(), PatientId = patients[0].Id, MedicalHistory = "No significant history", Allergies = "Penicillin", Medications = "None", Observations = "Cooperative patient", UpdatedAt = now };
        db.DentalRecords.Add(dentalRecord);
        db.Consultations.Add(new Consultation { Id = Guid.NewGuid(), DentalRecordId = dentalRecord.Id, DoctorId = doctors[0].Id, ConsultationDate = now.AddDays(-5).Date.AddHours(10), Notes = "Routine cleaning performed, no issues found.", Diagnosis = "No caries" });

        var hasher = new PasswordHasher<User>();
        var doctorUser = new User { Id = Guid.NewGuid(), Email = "doctor@dentalcare.com", Role = UserRoles.Doctor, DisplayName = "Dr. Sofia Martinez", DoctorId = doctors[0].Id };
        doctorUser.PasswordHash = hasher.HashPassword(doctorUser, "Doctor123!");
        var receptionistUser = new User { Id = Guid.NewGuid(), Email = "receptionist@dentalcare.com", Role = UserRoles.Receptionist, DisplayName = "Front Desk" };
        receptionistUser.PasswordHash = hasher.HashPassword(receptionistUser, "Receptionist123!");
        db.Users.AddRange(doctorUser, receptionistUser);

        db.SaveChanges();
    }
}
