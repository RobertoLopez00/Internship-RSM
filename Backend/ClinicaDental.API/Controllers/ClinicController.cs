using ClinicaDental.API.Contracts;
using ClinicaDental.API.Services;
using ClinicaDental.Application.Clinic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicaDental.API.Controllers;

[ApiController, Route("api/clinic"), AllowAnonymous]
public class ClinicController(ClinicClock clock, IEmailSender emailSender, IConfiguration configuration, ILogger<ClinicController> logger) : ControllerBase
{
    // Lets the frontend show times in the clinic's zone and offer only the slots the API accepts.
    [HttpGet("settings")]
    public ClinicSettingsResponse Settings() =>
        new(clock.IanaId, clock.Options.OpenHour, clock.Options.CloseHour, clock.Options.ClosedDays, SlotMinutes: 30, clock.Options.Currency);

    // Emails the message to the clinic inbox with the visitor as Reply-To. Nothing is stored. A failed send is
    // reported (503) so the visitor knows to call instead of waiting for an answer that never comes.
    [HttpPost("contact"), EnableRateLimiting(RateLimitPolicies.Contact)]
    public async Task<IActionResult> Contact(ContactRequest request)
    {
        var inbox = clock.Options.ContactEmail is { Length: > 0 } configured ? configured : configuration["Email:From"];
        if (string.IsNullOrWhiteSpace(inbox)) return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "The contact form is not available right now. Please call the clinic." });
        try
        {
            var html = EmailTemplates.ContactMessage(request.Name.Trim(), request.Email.Trim(), request.Phone?.Trim(), request.Message.Trim());
            await emailSender.SendAsync(inbox, $"Website message from {request.Name.Trim()}", html, HttpContext.RequestAborted, isHtml: true, replyTo: request.Email.Trim());
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Could not deliver a contact form message");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "We couldn't send your message right now. Please try again later or call the clinic." });
        }
        return Accepted();
    }
}
