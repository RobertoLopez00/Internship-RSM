using ClinicaDental.API.Contracts;
using ClinicaDental.Application.Interfaces.Repositories;
using ClinicaDental.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicaDental.API.Controllers;

[ApiController, Route("api/services")]
public class ServicesController(IDentalServiceRepository services) : ControllerBase
{
    // Reads are anonymous so the public site can render the service catalog; writes require staff roles.
    [AllowAnonymous, HttpGet] public Task<List<DentalService>> GetAll() => services.GetAllAsync();
    [AllowAnonymous, HttpGet("{id:guid}")] public async Task<ActionResult<DentalService>> Get(Guid id) => await services.GetByIdAsync(id) is { } service ? Ok(service) : NotFound();
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Receptionist}"), HttpPost]
    public async Task<ActionResult<DentalService>> Create(ServiceRequest request) { var service = new DentalService { Id = Guid.NewGuid() }; Apply(service, request); await services.AddAsync(service); return CreatedAtAction(nameof(Get), new { service.Id }, service); }
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Receptionist}"), HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, ServiceRequest request) { var service = await services.GetByIdAsync(id); if (service is null) return NotFound(); Apply(service, request); await services.SaveChangesAsync(); return NoContent(); }
    [Authorize(Roles = UserRoles.Admin), HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) { var service = await services.GetByIdAsync(id); if (service is null) return NotFound(); await services.DeleteAsync(service); return NoContent(); }
    private static void Apply(DentalService entity, ServiceRequest request) { entity.Name = request.Name.Trim(); entity.Description = request.Description?.Trim(); entity.BasePrice = request.BasePrice; entity.DurationMinutes = request.DurationMinutes; entity.IsActive = request.IsActive; }
}
