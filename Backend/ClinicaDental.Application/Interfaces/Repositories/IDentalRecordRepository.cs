using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.Interfaces.Repositories;

public interface IDentalRecordRepository
{
    Task<DentalRecord?> GetWithConsultationsAsync(Guid patientId);
    Task<DentalRecord?> GetByPatientIdAsync(Guid patientId);
    Task AddAsync(DentalRecord record);
    Task AddConsultationAsync(Consultation consultation);
    Task SaveChangesAsync();
}
