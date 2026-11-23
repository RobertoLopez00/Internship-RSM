using ClinicaDental.Application.Interfaces.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicaDental.API.Controllers;

// Specialty names from the catalog, used to suggest values in the doctor form.
[ApiController, Route("api/specialties")]
public class SpecialtiesController(IDoctorRepository doctors) : ControllerBase
{
    [AllowAnonymous, HttpGet]
    public Task<List<string>> GetAll() => doctors.GetSpecialtyNamesAsync();
}
