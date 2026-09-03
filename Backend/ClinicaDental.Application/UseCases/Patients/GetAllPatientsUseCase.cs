using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;

namespace ClinicaDental.Application.UseCases.Patients;

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
