using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.API.Services;

// Turns database constraint violations into 409 Conflict with a readable message. The application checks
// these rules first; this covers the races where two requests pass the check at the same time.
// Anything else is not handled here and stays a 500.
public sealed class DbUpdateExceptionHandler(ILogger<DbUpdateExceptionHandler> logger) : IExceptionHandler
{
    // Index or column names as SQL Server (index name) and SQLite (table.column) report them.
    private static readonly (string[] Keys, string Message)[] KnownConstraints =
    [
        (["UX_Appointments_Doctor_Slot", "Appointments.DoctorId"], "The doctor already has an appointment at that time."),
        (["IX_Patients_Email", "Patients.Email"], "A patient with this email already exists."),
        (["IX_Doctors_Email", "Doctors.Email"], "A doctor with this email already exists."),
        (["IX_Users_Email", "Users.Email"], "This email is already registered."),
        (["IX_Users_PatientId", "Users.PatientId", "IX_Users_DoctorId", "Users.DoctorId"], "That profile is already linked to another login."),
        (["IX_DentalServices_Name", "DentalServices.Name"], "A service with this name already exists."),
        (["IX_Specialties_Name", "Specialties.Name"], "That specialty already exists."),
        (["IX_Consultations_AppointmentId", "Consultations.AppointmentId"], "That appointment already has a consultation."),
        (["IX_DentalRecords_PatientId", "DentalRecords.PatientId"], "This patient already has a dental record."),
    ];

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        string? message = exception switch
        {
            DbUpdateConcurrencyException => "Someone else changed this information at the same time. Please refresh and try again.",
            DbUpdateException db => DescribeConstraintViolation(db),
            _ => null,
        };
        if (message is null) return false;

        logger.LogWarning(exception, "Database rule rejected the request: {Message}", message);
        httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
        await httpContext.Response.WriteAsJsonAsync(new { message }, cancellationToken);
        return true;
    }

    private static string? DescribeConstraintViolation(DbUpdateException exception)
    {
        var inner = exception.InnerException;
        var text = inner?.Message ?? string.Empty;
        var isConstraint = inner switch
        {
            SqlException sql => sql.Number is 2601 or 2627 or 547,
            // SQLite (tests): SQLITE_CONSTRAINT = 19. Read by reflection so the API doesn't depend on the SQLite package.
            not null when inner.GetType().Name == "SqliteException" => inner.GetType().GetProperty("SqliteErrorCode")?.GetValue(inner) is 19,
            _ => false,
        };
        if (!isConstraint) return null;

        foreach (var (keys, message) in KnownConstraints)
            if (keys.Any(k => text.Contains(k, StringComparison.OrdinalIgnoreCase))) return message;

        if (text.Contains("FOREIGN KEY", StringComparison.OrdinalIgnoreCase) || text.Contains("REFERENCE", StringComparison.OrdinalIgnoreCase))
            return "This record is linked to other data, so it can't be changed or removed that way.";
        return "The change breaks a data rule and was not saved. Please check the values and try again.";
    }
}
