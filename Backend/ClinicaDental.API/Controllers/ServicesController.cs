using ClinicaDental.API.Contracts;
using ClinicaDental.Domain.Entities;
using ClinicaDental.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.API.Controllers;

[ApiController, Route("api/services")]
public class ServicesController(AppDbContext context) : ControllerBase
{
    [AllowAnonymous, HttpGet] public Task<List<DentalService>> GetAll() => context.Services.AsNoTracking().OrderBy(x => x.Name).ToListAsync();
    [AllowAnonymous, HttpGet("{id:guid}")] public async Task<ActionResult<DentalService>> Get(Guid id) => await context.Services.FindAsync(id) is { } service ? Ok(service) : NotFound();
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Receptionist}"), HttpPost]
    public async Task<ActionResult<DentalService>> Create(ServiceRequest request) { var service = new DentalService { Id = Guid.NewGuid() }; Apply(service, request); context.Services.Add(service); await context.SaveChangesAsync(); return CreatedAtAction(nameof(Get), new { service.Id }, service); }
    [Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Receptionist}"), HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, ServiceRequest request) { var service = await context.Services.FindAsync(id); if (service is null) return NotFound(); Apply(service, request); await context.SaveChangesAsync(); return NoContent(); }
    [Authorize(Roles = UserRoles.Admin), HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) { var service = await context.Services.FindAsync(id); if (service is null) return NotFound(); context.Services.Remove(service); await context.SaveChangesAsync(); return NoContent(); }
    private static void Apply(DentalService entity, ServiceRequest request) { entity.Name = request.Name.Trim(); entity.Description = request.Description?.Trim(); entity.BasePrice = request.BasePrice; entity.DurationMinutes = request.DurationMinutes; entity.IsActive = request.IsActive; }
}
