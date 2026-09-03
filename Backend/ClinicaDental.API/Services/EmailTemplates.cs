namespace ClinicaDental.API.Services;

public static class EmailTemplates
{
    private const string BrandDark = "#12314a";
    private const string BrandMuted = "#60788a";
    private const string BrandBorder = "#cadbe6";
    private const string BrandBg = "#f3fbff";
    private const string GradientStart = "#0ea5e9";
    private const string GradientEnd = "#14b8a6";

    public static string AppointmentConfirmation(string patientName, string doctorName, string appointmentDate, string? notes) => Layout(
        heading: "Appointment confirmed",
        intro: $"Hi {Escape(patientName)}, your appointment has been booked.",
        rows:
        [
            ("Date & time", appointmentDate),
            ("Doctor", $"Dr. {Escape(doctorName)}"),
        ],
        notes: notes,
        footerNote: "We'll send you a reminder 24 hours before your visit.");

    public static string AppointmentReminder(string patientName, string doctorName, string appointmentDate) => Layout(
        heading: "Appointment reminder",
        intro: $"Hi {Escape(patientName)}, this is a reminder of your upcoming appointment.",
        rows:
        [
            ("Date & time", appointmentDate),
            ("Doctor", $"Dr. {Escape(doctorName)}"),
        ],
        notes: null,
        footerNote: "See you soon! If you need to reschedule, please contact the clinic.");

    private static string Layout(string heading, string intro, (string Label, string Value)[] rows, string? notes, string footerNote)
    {
        var rowsHtml = string.Join("", rows.Select(r => $"""
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid {BrandBorder};color:{BrandMuted};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;width:140px;">{Escape(r.Label)}</td>
              <td style="padding:10px 0;border-bottom:1px solid {BrandBorder};color:{BrandDark};font-size:15px;font-weight:600;">{Escape(r.Value)}</td>
            </tr>
            """));

        var notesHtml = string.IsNullOrWhiteSpace(notes) ? "" : $"""
            <tr>
              <td style="padding:10px 0;color:{BrandMuted};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;width:140px;">Notes</td>
              <td style="padding:10px 0;color:{BrandDark};font-size:15px;">{Escape(notes)}</td>
            </tr>
            """;

        return $"""
            <!doctype html>
            <html lang="en">
            <body style="margin:0;padding:0;background:{BrandBg};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{BrandBg};padding:32px 16px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(18,49,74,0.08);">
                      <tr>
                        <td style="background:linear-gradient(135deg,{GradientStart},{GradientEnd});padding:28px 32px;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:36px;height:36px;background:rgba(255,255,255,0.25);border-radius:10px;text-align:center;vertical-align:middle;color:#ffffff;font-weight:800;font-size:18px;font-family:Arial,sans-serif;">D</td>
                              <td style="padding-left:10px;color:#ffffff;font-weight:700;font-size:18px;">DentalCare</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:32px;">
                          <h1 style="margin:0 0 8px;color:{BrandDark};font-size:22px;">{Escape(heading)}</h1>
                          <p style="margin:0 0 24px;color:{BrandMuted};font-size:15px;line-height:1.5;">{intro}</p>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            {rowsHtml}
                            {notesHtml}
                          </table>
                          <p style="margin:24px 0 0;color:{BrandMuted};font-size:13px;line-height:1.5;">{Escape(footerNote)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px 32px;background:{BrandBg};border-top:1px solid {BrandBorder};">
                          <p style="margin:0;color:{BrandMuted};font-size:12px;">DentalCare · This is an automated message, please do not reply.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;
    }

    private static string Escape(string value) => System.Net.WebUtility.HtmlEncode(value);
}
