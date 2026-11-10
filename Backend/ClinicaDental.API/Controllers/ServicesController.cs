using ClinicaDental.API.Contracts;
using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicaDental.API.Controllers;

[ApiController, Route("api/services")]
public class ServicesController(IDentalServiceRepository services) : ControllerBase
{
    private const string DuplicateNameMessage = "A service with this name already exists.";

    // Reads are anonymous so the public site can render the catalog. Visitors only see active services; staff see all.
    [AllowAnonymous, HttpGet] public Task<List<DentalService>> GetAll() => services.GetAllAsync(activeOnly: !IsStaff());

    [AllowAnonymous, HttpGet("{id:guid}")]
    public async Task<ActionResult<DentalService>> Get(Guid id) =>
        await services.GetByIdAsync(id) is { } service && (service.IsActive || IsStaff()) ? Ok(service) : NotFound();

    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Receptionist}"), HttpPost]
    public async Task<ActionResult<DentalService>> Create(ServiceRequest request)
    {
        if (await services.NameInUseAsync(request.Name.Trim())) return Conflict(new { message = DuplicateNameMessage });
        var service = new DentalService { Id = Guid.NewGuid() };
        Apply(service, request);
        await services.AddAsync(service);
        await services.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { service.Id }, service);
    }

    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Receptionist}"), HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, ServiceRequest request)
    {
        var service = await services.GetByIdAsync(id);
        if (service is null) return NotFound();
        if (await services.NameInUseAsync(request.Name.Trim(), exceptId: id)) return Conflict(new { message = DuplicateNameMessage });
        Apply(service, request);
        await services.SaveChangesAsync();
        return NoContent();
    }

    // Deactivates instead of deleting, so past appointments keep their service.
    [Authorize(Roles = UserRoles.Admin), HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var service = await services.GetByIdAsync(id);
        if (service is null) return NotFound();
        service.IsActive = false;
        await services.SaveChangesAsync();
        return NoContent();
    }

    private bool IsStaff() => User.IsInRole(UserRoles.Admin) || User.IsInRole(UserRoles.Doctor) || User.IsInRole(UserRoles.Receptionist);

    private static void Apply(DentalService entity, ServiceRequest request) { entity.Name = request.Name.Trim(); entity.Description = request.Description?.Trim(); entity.BasePrice = request.BasePrice; entity.DurationMinutes = request.DurationMinutes; entity.IsActive = request.IsActive; }
}
