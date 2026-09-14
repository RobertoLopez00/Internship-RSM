using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.UseCases.Patients;

// Thin orchestration layer between controllers and the repository, following the use-case pattern so
// business rules (currently none beyond delegation) have a dedicated home separate from persistence and HTTP concerns.
public class GetAllPatientsUseCase
{
    private readonly IPatientRepository _patientRepository;

    public GetAllPatientsUseCase(IPatientRepository patientRepository)
    {
        _patientRepository = patientRepository;
    }

    public async Task<IEnumerable<Patient>> ExecuteAsync()
    {
        return await _patientRepository.GetAllAsync();
    }
}
