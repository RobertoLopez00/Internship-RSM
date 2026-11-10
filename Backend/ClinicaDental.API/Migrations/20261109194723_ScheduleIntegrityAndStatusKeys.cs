using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaDental.API.Migrations
{
    /// <summary>
    /// Appointment end time (overlap rule), optimistic concurrency stamps for doctors and treatments,
    /// the optional consultation -> appointment link, and statuses stored as enum member names.
    /// See docs/DB_NORMALIZATION.md, "Segunda etapa".
    /// </summary>
    public partial class ScheduleIntegrityAndStatusKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Treatments_Status",
                table: "Treatments");

            migrationBuilder.DropIndex(
                name: "UX_Appointments_Doctor_Slot",
                table: "Appointments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Appointments_Status",
                table: "Appointments");

            // Statuses become enum member names.
            migrationBuilder.Sql(@"
UPDATE Appointments SET Status = N'NoShow' WHERE Status = N'No-show';
UPDATE Treatments SET Status = N'InProgress' WHERE Status = N'In progress';");

            migrationBuilder.AddColumn<Guid>(
                name: "ConcurrencyStamp",
                table: "Treatments",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "ScheduleStamp",
                table: "Doctors",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "AppointmentId",
                table: "Consultations",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EndsAt",
                table: "Appointments",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            // End = start + the service duration, or 30 minutes without a service (Appointment.DefaultDurationMinutes).
            migrationBuilder.Sql(@"
UPDATE a SET EndsAt = DATEADD(minute, COALESCE(s.DurationMinutes, 30), a.AppointmentDate)
FROM Appointments a
LEFT JOIN DentalServices s ON s.Id = a.ServiceId;");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Treatments_Status",
                table: "Treatments",
                sql: "[Status] IN ('Planned', 'InProgress', 'Completed', 'Cancelled')");

            migrationBuilder.CreateIndex(
                name: "IX_Consultations_AppointmentId",
                table: "Consultations",
                column: "AppointmentId",
                unique: true,
                filter: "[AppointmentId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "UX_Appointments_Doctor_Slot",
                table: "Appointments",
                columns: new[] { "DoctorId", "AppointmentDate" },
                unique: true,
                filter: "[Status] <> 'Cancelled' AND [Status] <> 'NoShow'");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Appointments_EndsAt",
                table: "Appointments",
                sql: "[EndsAt] > [AppointmentDate]");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Appointments_Status",
                table: "Appointments",
                sql: "[Status] IN ('Pending', 'Confirmed', 'Completed', 'Cancelled', 'NoShow')");

            migrationBuilder.AddForeignKey(
                name: "FK_Consultations_Appointments_AppointmentId",
                table: "Consultations",
                column: "AppointmentId",
                principalTable: "Appointments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Consultations_Appointments_AppointmentId",
                table: "Consultations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Treatments_Status",
                table: "Treatments");

            migrationBuilder.DropIndex(
                name: "IX_Consultations_AppointmentId",
                table: "Consultations");

            migrationBuilder.DropIndex(
                name: "UX_Appointments_Doctor_Slot",
                table: "Appointments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Appointments_EndsAt",
                table: "Appointments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Appointments_Status",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "ConcurrencyStamp",
                table: "Treatments");

            migrationBuilder.DropColumn(
                name: "ScheduleStamp",
                table: "Doctors");

            migrationBuilder.DropColumn(
                name: "AppointmentId",
                table: "Consultations");

            migrationBuilder.DropColumn(
                name: "EndsAt",
                table: "Appointments");

            migrationBuilder.Sql(@"
UPDATE Appointments SET Status = N'No-show' WHERE Status = N'NoShow';
UPDATE Treatments SET Status = N'In progress' WHERE Status = N'InProgress';");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Treatments_Status",
                table: "Treatments",
                sql: "[Status] IN ('Planned', 'In progress', 'Completed', 'Cancelled')");

            migrationBuilder.CreateIndex(
                name: "UX_Appointments_Doctor_Slot",
                table: "Appointments",
                columns: new[] { "DoctorId", "AppointmentDate" },
                unique: true,
                filter: "[Status] <> 'Cancelled' AND [Status] <> 'No-show'");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Appointments_Status",
                table: "Appointments",
                sql: "[Status] IN ('Pending', 'Confirmed', 'Completed', 'Cancelled', 'No-show')");
        }
    }
}
