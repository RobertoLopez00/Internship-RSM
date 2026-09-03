using System.Net;
using System.Net.Mail;

namespace ClinicaDental.API.Services;

public interface IEmailSender { Task SendAsync(string recipient, string subject, string body, CancellationToken cancellationToken = default, bool isHtml = false); }

public sealed class SmtpEmailSender(IConfiguration configuration, ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public async Task SendAsync(string recipient, string subject, string body, CancellationToken cancellationToken = default, bool isHtml = false)
    {
        var settings = configuration.GetSection("Email");
        if (!settings.GetValue<bool>("Enabled")) { logger.LogInformation("Email disabled. Would send '{Subject}' to {Recipient}", subject, recipient); return; }
        using var client = new SmtpClient(settings["Host"], settings.GetValue<int>("Port")) { EnableSsl = settings.GetValue<bool>("UseSsl"), Credentials = new NetworkCredential(settings["Username"], settings["Password"]) };
        using var message = new MailMessage(settings["From"]!, recipient, subject, body) { IsBodyHtml = isHtml };
        await client.SendMailAsync(message, cancellationToken);
    }
}
