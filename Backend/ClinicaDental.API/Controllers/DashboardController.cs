using ClinicaDental.Domain.Entities;
using ClinicaDental.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.API.Controllers;

[Authorize(Roles = $"{UserRoles.Admin},{UserRoles.Receptionist}"), ApiController, Route("api/dashboard")]
public class DashboardController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<object>> Get()
    {
        var today = DateTime.UtcNow.Date;
        var byStatus = await context.Appointments.AsNoTracking().GroupBy(x => x.Status).Select(x => new { status = x.Key, count = x.Count() }).ToListAsync();
        var paid = await context.Payments.AsNoTracking().SumAsync(x => (decimal?)x.Amount) ?? 0m;
        var billed = await context.Treatments.AsNoTracking().SumAsync(x => (decimal?)x.Cost) ?? 0m;
        return Ok(new { patients = await context.Patients.CountAsync(x => x.IsActive), appointmentsToday = await context.Appointments.CountAsync(x => x.AppointmentDate >= today && x.AppointmentDate < today.AddDays(1)), appointmentsByStatus = byStatus, activeTreatments = await context.Treatments.CountAsync(x => x.Status == TreatmentStatuses.InProgress), income = paid, outstandingBalance = billed - paid });
    }
}
