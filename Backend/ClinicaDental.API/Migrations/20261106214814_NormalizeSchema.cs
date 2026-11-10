using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaDental.API.Migrations
{
    /// <summary>
    /// Normalizes the schema and converts the existing data. Written by hand from what EF scaffolded,
    /// because most steps have to move data before the new constraints can be created.
    /// Each Sql() call runs as its own batch, so a batch never references a column added in the same batch.
    /// See docs/DB_NORMALIZATION.md, "Qué hace la migración con los datos existentes".
    /// </summary>
    public partial class NormalizeSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ---- 0. Legacy status labels ----------------------------------------------------------
            // Older builds and the README used Spanish labels. Map them; anything else stops the migration.
            migrationBuilder.Sql(@"
UPDATE Appointments SET Status = CASE LTRIM(RTRIM(Status))
    WHEN N'Pendiente' THEN N'Pending'
    WHEN N'Confirmada' THEN N'Confirmed'
    WHEN N'Completada' THEN N'Completed'
    WHEN N'Cancelada' THEN N'Cancelled'
    WHEN N'No asistió' THEN N'No-show'
    WHEN N'No asistio' THEN N'No-show'
    WHEN N'NoShow' THEN N'No-show'
    ELSE LTRIM(RTRIM(Status)) END;
UPDATE Treatments SET Status = CASE LTRIM(RTRIM(Status))
    WHEN N'Planificado' THEN N'Planned'
    WHEN N'En curso' THEN N'In progress'
    WHEN N'InProgress' THEN N'In progress'
    WHEN N'Completado' THEN N'Completed'
    WHEN N'Cancelado' THEN N'Cancelled'
    ELSE LTRIM(RTRIM(Status)) END;");
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM Appointments WHERE Status NOT IN (N'Pending', N'Confirmed', N'Completed', N'Cancelled', N'No-show'))
    THROW 50001, 'NormalizeSchema: some appointments have an unknown status. Fix them by hand and run the migration again.', 1;
IF EXISTS (SELECT 1 FROM Treatments WHERE Status NOT IN (N'Planned', N'In progress', N'Completed', N'Cancelled'))
    THROW 50002, 'NormalizeSchema: some treatments have an unknown status. Fix them by hand and run the migration again.', 1;");

            // ---- 1. Double bookings ---------------------------------------------------------------
            // Which of two active appointments to cancel is a business decision, so stop with a clear message.
            migrationBuilder.Sql(@"
IF EXISTS (
    SELECT 1 FROM Appointments
    WHERE Status NOT IN (N'Cancelled', N'No-show')
    GROUP BY DoctorId, AppointmentDate
    HAVING COUNT(*) > 1)
    THROW 50003, 'NormalizeSchema: a doctor has two active appointments at the same time. Cancel one of them (SELECT DoctorId, AppointmentDate FROM Appointments WHERE Status NOT IN (''Cancelled'', ''No-show'') GROUP BY DoctorId, AppointmentDate HAVING COUNT(*) > 1) and run the migration again.', 1;");

            // ---- Drop the constraints and indexes that are replaced below -------------------------
            migrationBuilder.DropForeignKey(name: "FK_Appointments_Services_ServiceId", table: "Appointments");
            migrationBuilder.DropForeignKey(name: "FK_Consultations_DentalRecords_DentalRecordId", table: "Consultations");
            migrationBuilder.DropForeignKey(name: "FK_DentalRecords_Patients_PatientId", table: "DentalRecords");
            migrationBuilder.DropForeignKey(name: "FK_Payments_Treatments_TreatmentId", table: "Payments");
            migrationBuilder.DropForeignKey(name: "FK_Users_Doctors_DoctorId", table: "Users");
            migrationBuilder.DropForeignKey(name: "FK_Users_Patients_PatientId", table: "Users");
            migrationBuilder.DropIndex(name: "IX_Appointments_DoctorId", table: "Appointments");
            migrationBuilder.DropIndex(name: "IX_Appointments_DoctorId_AppointmentDate", table: "Appointments");
            migrationBuilder.DropIndex(name: "IX_Appointments_PatientId", table: "Appointments");

            // ---- Services -> DentalServices ------------------------------------------------------
            migrationBuilder.DropPrimaryKey(name: "PK_Services", table: "Services");
            migrationBuilder.RenameTable(name: "Services", newName: "DentalServices");
            migrationBuilder.AddPrimaryKey(name: "PK_DentalServices", table: "DentalServices", column: "Id");

            // ---- 2. Specialties ------------------------------------------------------------------
            migrationBuilder.CreateTable(
                name: "Specialties",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table => table.PrimaryKey("PK_Specialties", x => x.Id));

            migrationBuilder.RenameColumn(name: "Name", table: "Doctors", newName: "FirstName");
            migrationBuilder.AddColumn<Guid>(name: "SpecialtyId", table: "Doctors", type: "uniqueidentifier", nullable: true);

            // The default collation is case-insensitive, so DISTINCT and the join treat "orthodontics" and
            // "Orthodontics " as the same specialty. Empty values become General Dentistry.
            migrationBuilder.Sql(@"
INSERT INTO Specialties (Id, Name, CreatedAt)
SELECT NEWID(), s.Name, s.CreatedAt
FROM (
    SELECT CASE WHEN LTRIM(RTRIM(Specialty)) = N'' THEN N'General Dentistry' ELSE LTRIM(RTRIM(Specialty)) END AS Name,
           MIN(CreatedAt) AS CreatedAt
    FROM Doctors
    GROUP BY CASE WHEN LTRIM(RTRIM(Specialty)) = N'' THEN N'General Dentistry' ELSE LTRIM(RTRIM(Specialty)) END
) s;");
            migrationBuilder.Sql(@"
UPDATE d SET SpecialtyId = s.Id
FROM Doctors d
JOIN Specialties s ON s.Name = CASE WHEN LTRIM(RTRIM(d.Specialty)) = N'' THEN N'General Dentistry' ELSE LTRIM(RTRIM(d.Specialty)) END;");
            migrationBuilder.AlterColumn<Guid>(name: "SpecialtyId", table: "Doctors", type: "uniqueidentifier", nullable: false, oldClrType: typeof(Guid), oldType: "uniqueidentifier", oldNullable: true);
            migrationBuilder.DropColumn(name: "Specialty", table: "Doctors");

            // ---- 3. Refresh token chain: hash copy -> FK --------------------------------------------
            migrationBuilder.AddColumn<Guid>(name: "ReplacedByTokenId", table: "RefreshTokens", type: "uniqueidentifier", nullable: true);
            migrationBuilder.Sql(@"
UPDATE r SET ReplacedByTokenId = n.Id
FROM RefreshTokens r
JOIN RefreshTokens n ON n.TokenHash = r.ReplacedByTokenHash;");
            migrationBuilder.DropColumn(name: "ReplacedByTokenHash", table: "RefreshTokens");

            // ---- 4. Users --------------------------------------------------------------------------
            // Patient/Doctor logins whose profile was deleted under the old ON DELETE SET NULL can't sign in
            // to anything. Their refresh tokens go with them (cascade).
            migrationBuilder.Sql(@"
DELETE FROM Users WHERE (Role = N'Patient' AND PatientId IS NULL) OR (Role = N'Doctor' AND DoctorId IS NULL);
UPDATE Users SET PatientId = NULL WHERE Role <> N'Patient' AND PatientId IS NOT NULL;
UPDATE Users SET DoctorId = NULL WHERE Role <> N'Doctor' AND DoctorId IS NOT NULL;");
            migrationBuilder.AlterColumn<string>(name: "DisplayName", table: "Users", type: "nvarchar(200)", maxLength: 200, nullable: true, oldClrType: typeof(string), oldType: "nvarchar(200)", oldMaxLength: 200);
            migrationBuilder.Sql(@"
UPDATE Users SET DisplayName = NULL WHERE Role IN (N'Patient', N'Doctor');
UPDATE Users SET DisplayName = Email WHERE Role IN (N'Admin', N'Receptionist') AND (DisplayName IS NULL OR LTRIM(RTRIM(DisplayName)) = N'');");

            // ---- 5. Patients and doctors -----------------------------------------------------------
            // Old code stored "today" when the date of birth was unknown, either when the patient was
            // created or on a later edit. Nobody is born on or after the day they register.
            migrationBuilder.AlterColumn<DateTime>(name: "DateOfBirth", table: "Patients", type: "datetime2", nullable: true, oldClrType: typeof(DateTime), oldType: "datetime2");
            migrationBuilder.Sql(@"
UPDATE Patients SET DateOfBirth = NULL
WHERE CAST(DateOfBirth AS date) >= CAST(CreatedAt AS date)
   OR (UpdatedAt IS NOT NULL AND CAST(DateOfBirth AS date) = CAST(UpdatedAt AS date));");
            migrationBuilder.AlterColumn<DateOnly>(name: "DateOfBirth", table: "Patients", type: "date", nullable: true, oldClrType: typeof(DateTime), oldType: "datetime2", oldNullable: true);

            migrationBuilder.AlterColumn<string>(name: "Phone", table: "Patients", type: "nvarchar(30)", maxLength: 30, nullable: true, oldClrType: typeof(string), oldType: "nvarchar(30)", oldMaxLength: 30);
            migrationBuilder.AlterColumn<string>(name: "Phone", table: "Doctors", type: "nvarchar(max)", nullable: true, oldClrType: typeof(string), oldType: "nvarchar(max)");
            migrationBuilder.Sql(@"
UPDATE Patients SET Phone = NULLIF(LTRIM(RTRIM(Phone)), N''), Email = LOWER(LTRIM(RTRIM(Email)));
UPDATE Doctors SET Phone = LEFT(NULLIF(LTRIM(RTRIM(Phone)), N''), 30), Email = LOWER(LTRIM(RTRIM(Email)));
UPDATE Patients SET Email = N'unknown-' + LOWER(CONVERT(nvarchar(36), Id)) + N'@invalid.local' WHERE Email = N'';
UPDATE Doctors SET Email = N'unknown-' + LOWER(CONVERT(nvarchar(36), Id)) + N'@invalid.local' WHERE Email = N'';");
            migrationBuilder.AlterColumn<string>(name: "Phone", table: "Doctors", type: "nvarchar(30)", maxLength: 30, nullable: true, oldClrType: typeof(string), oldType: "nvarchar(max)", oldNullable: true);

            // ---- 6. Duplicate emails ----------------------------------------------------------------
            // Keep the email on the profile that has a login, otherwise on the oldest one. The others get
            // "+dup-<first 8 chars of id>" before the @. Profiles are never merged or deleted here.
            migrationBuilder.Sql(@"
WITH ranked AS (
    SELECT p.Id, p.Email,
           ROW_NUMBER() OVER (PARTITION BY p.Email
                              ORDER BY CASE WHEN EXISTS (SELECT 1 FROM Users u WHERE u.PatientId = p.Id) THEN 0 ELSE 1 END, p.CreatedAt, p.Id) AS rn
    FROM Patients p)
UPDATE ranked
SET Email = CASE WHEN CHARINDEX(N'@', Email) > 0
                 THEN STUFF(Email, CHARINDEX(N'@', Email), 0, N'+dup-' + LOWER(LEFT(CONVERT(nvarchar(36), Id), 8)))
                 ELSE Email + N'+dup-' + LOWER(LEFT(CONVERT(nvarchar(36), Id), 8)) END
WHERE rn > 1;");
            migrationBuilder.Sql(@"
WITH ranked AS (
    SELECT d.Id, d.Email,
           ROW_NUMBER() OVER (PARTITION BY d.Email
                              ORDER BY CASE WHEN EXISTS (SELECT 1 FROM Users u WHERE u.DoctorId = d.Id) THEN 0 ELSE 1 END, d.CreatedAt, d.Id) AS rn
    FROM Doctors d)
UPDATE ranked
SET Email = CASE WHEN CHARINDEX(N'@', Email) > 0
                 THEN STUFF(Email, CHARINDEX(N'@', Email), 0, N'+dup-' + LOWER(LEFT(CONVERT(nvarchar(36), Id), 8)))
                 ELSE Email + N'+dup-' + LOWER(LEFT(CONVERT(nvarchar(36), Id), 8)) END
WHERE rn > 1;");

            // ---- 7. Payment methods -----------------------------------------------------------------
            // The original text goes to Notes before it is mapped to the closed list.
            migrationBuilder.Sql(@"
UPDATE Payments SET Notes = LEFT(
    CASE WHEN Notes IS NULL OR LTRIM(RTRIM(Notes)) = N'' THEN N'Original method: ' + LTRIM(RTRIM(Method))
         ELSE Notes + N' (Original method: ' + LTRIM(RTRIM(Method)) + N')' END, 1000)
WHERE Method IS NOT NULL AND LTRIM(RTRIM(Method)) <> N''
  AND LTRIM(RTRIM(Method)) COLLATE Latin1_General_CS_AS NOT IN (N'Cash', N'CreditCard', N'DebitCard', N'BankTransfer', N'Insurance', N'Other');");
            migrationBuilder.Sql(@"
UPDATE Payments SET Method = CASE
    WHEN LOWER(LTRIM(RTRIM(Method))) IN (N'cash', N'efectivo', N'contado') THEN N'Cash'
    WHEN LOWER(LTRIM(RTRIM(Method))) IN (N'credit card', N'creditcard', N'credit', N'tarjeta de credito', N'tarjeta de crédito', N'tarjeta credito', N'tarjeta crédito', N'credito', N'crédito', N'visa', N'mastercard', N'amex') THEN N'CreditCard'
    WHEN LOWER(LTRIM(RTRIM(Method))) IN (N'debit card', N'debitcard', N'debit', N'tarjeta de debito', N'tarjeta de débito', N'tarjeta debito', N'tarjeta débito', N'debito', N'débito') THEN N'DebitCard'
    WHEN LOWER(LTRIM(RTRIM(Method))) IN (N'bank transfer', N'banktransfer', N'transfer', N'wire transfer', N'transferencia', N'transferencia bancaria', N'spei', N'deposito', N'depósito') THEN N'BankTransfer'
    WHEN LOWER(LTRIM(RTRIM(Method))) IN (N'insurance', N'seguro', N'seguro medico', N'seguro médico', N'aseguradora') THEN N'Insurance'
    ELSE N'Other' END;");
            migrationBuilder.AlterColumn<string>(name: "Method", table: "Payments", type: "nvarchar(30)", maxLength: 30, nullable: false, oldClrType: typeof(string), oldType: "nvarchar(max)", oldNullable: true);
            migrationBuilder.AlterColumn<string>(name: "Notes", table: "Payments", type: "nvarchar(1000)", maxLength: 1000, nullable: true, oldClrType: typeof(string), oldType: "nvarchar(max)", oldNullable: true);

            // ---- 8. Treatments with the dates swapped ---------------------------------------------
            // The right-hand side reads the old values, so this swaps both columns.
            migrationBuilder.Sql("UPDATE Treatments SET StartDate = EndDate, EndDate = StartDate WHERE EndDate < StartDate;");

            // ---- 9. Audit columns, filled with the best date available ------------------------------
            var epoch = new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified);
            migrationBuilder.AddColumn<DateTime>(name: "CreatedAt", table: "DentalServices", type: "datetime2", nullable: false, defaultValue: epoch);
            migrationBuilder.AddColumn<DateTime>(name: "UpdatedAt", table: "DentalServices", type: "datetime2", nullable: true);
            migrationBuilder.AddColumn<DateTime>(name: "CreatedAt", table: "DentalRecords", type: "datetime2", nullable: false, defaultValue: epoch);
            migrationBuilder.AlterColumn<DateTime>(name: "UpdatedAt", table: "DentalRecords", type: "datetime2", nullable: true, oldClrType: typeof(DateTime), oldType: "datetime2");
            migrationBuilder.AddColumn<DateTime>(name: "CreatedAt", table: "Consultations", type: "datetime2", nullable: false, defaultValue: epoch);
            migrationBuilder.AddColumn<DateTime>(name: "UpdatedAt", table: "Consultations", type: "datetime2", nullable: true);
            migrationBuilder.AddColumn<DateTime>(name: "CreatedAt", table: "Treatments", type: "datetime2", nullable: false, defaultValue: epoch);
            migrationBuilder.AddColumn<DateTime>(name: "UpdatedAt", table: "Treatments", type: "datetime2", nullable: true);
            migrationBuilder.AddColumn<DateTime>(name: "CreatedAt", table: "Payments", type: "datetime2", nullable: false, defaultValue: epoch);
            migrationBuilder.AddColumn<DateTime>(name: "UpdatedAt", table: "Payments", type: "datetime2", nullable: true);
            migrationBuilder.Sql(@"
UPDATE s SET CreatedAt = COALESCE((SELECT MIN(a.CreatedAt) FROM Appointments a WHERE a.ServiceId = s.Id), SYSUTCDATETIME())
FROM DentalServices s;
UPDATE r SET CreatedAt = COALESCE(
    (SELECT MIN(c.ConsultationDate) FROM Consultations c WHERE c.DentalRecordId = r.Id AND c.ConsultationDate < COALESCE(r.UpdatedAt, p.CreatedAt)),
    r.UpdatedAt, p.CreatedAt)
FROM DentalRecords r JOIN Patients p ON p.Id = r.PatientId;
UPDATE Consultations SET CreatedAt = ConsultationDate;
UPDATE Treatments SET CreatedAt = StartDate;
UPDATE Payments SET CreatedAt = PaidAt;");

            // ---- Column sizes ----------------------------------------------------------------------
            migrationBuilder.AlterColumn<string>(name: "Status", table: "Appointments", type: "nvarchar(20)", maxLength: 20, nullable: false, oldClrType: typeof(string), oldType: "nvarchar(50)", oldMaxLength: 50);
            migrationBuilder.AlterColumn<string>(name: "Observations", table: "Treatments", type: "nvarchar(4000)", maxLength: 4000, nullable: true, oldClrType: typeof(string), oldType: "nvarchar(max)", oldNullable: true);
            migrationBuilder.AlterColumn<string>(name: "Observations", table: "DentalRecords", type: "nvarchar(4000)", maxLength: 4000, nullable: true, oldClrType: typeof(string), oldType: "nvarchar(max)", oldNullable: true);
            migrationBuilder.AlterColumn<string>(name: "Medications", table: "DentalRecords", type: "nvarchar(4000)", maxLength: 4000, nullable: true, oldClrType: typeof(string), oldType: "nvarchar(max)", oldNullable: true);
            migrationBuilder.AlterColumn<string>(name: "MedicalHistory", table: "DentalRecords", type: "nvarchar(4000)", maxLength: 4000, nullable: true, oldClrType: typeof(string), oldType: "nvarchar(max)", oldNullable: true);
            migrationBuilder.AlterColumn<string>(name: "Allergies", table: "DentalRecords", type: "nvarchar(4000)", maxLength: 4000, nullable: true, oldClrType: typeof(string), oldType: "nvarchar(max)", oldNullable: true);
            migrationBuilder.AlterColumn<string>(name: "Diagnosis", table: "Consultations", type: "nvarchar(2000)", maxLength: 2000, nullable: true, oldClrType: typeof(string), oldType: "nvarchar(max)", oldNullable: true);

            // ---- 10. Constraints, indexes and foreign keys -----------------------------------------
            migrationBuilder.AddCheckConstraint(name: "CK_Users_Role", table: "Users", sql: "[Role] IN ('Admin', 'Doctor', 'Receptionist', 'Patient')");
            migrationBuilder.AddCheckConstraint(name: "CK_Users_RoleLink", table: "Users", sql: "([Role] = 'Patient' AND [PatientId] IS NOT NULL AND [DoctorId] IS NULL) OR ([Role] = 'Doctor' AND [DoctorId] IS NOT NULL AND [PatientId] IS NULL) OR ([Role] IN ('Admin', 'Receptionist') AND [PatientId] IS NULL AND [DoctorId] IS NULL)");
            migrationBuilder.AddCheckConstraint(name: "CK_Users_DisplayName", table: "Users", sql: "([Role] IN ('Admin', 'Receptionist') AND [DisplayName] IS NOT NULL) OR ([Role] IN ('Patient', 'Doctor') AND [DisplayName] IS NULL)");
            migrationBuilder.AddCheckConstraint(name: "CK_Treatments_Cost", table: "Treatments", sql: "[Cost] >= 0");
            migrationBuilder.AddCheckConstraint(name: "CK_Treatments_Dates", table: "Treatments", sql: "[EndDate] IS NULL OR [EndDate] >= [StartDate]");
            migrationBuilder.AddCheckConstraint(name: "CK_Treatments_Status", table: "Treatments", sql: "[Status] IN ('Planned', 'In progress', 'Completed', 'Cancelled')");
            migrationBuilder.AddCheckConstraint(name: "CK_Payments_Amount", table: "Payments", sql: "[Amount] > 0");
            migrationBuilder.AddCheckConstraint(name: "CK_Payments_Method", table: "Payments", sql: "[Method] IN ('Cash', 'CreditCard', 'DebitCard', 'BankTransfer', 'Insurance', 'Other')");
            migrationBuilder.AddCheckConstraint(name: "CK_Appointments_Status", table: "Appointments", sql: "[Status] IN ('Pending', 'Confirmed', 'Completed', 'Cancelled', 'No-show')");
            migrationBuilder.AddCheckConstraint(name: "CK_DentalServices_BasePrice", table: "DentalServices", sql: "[BasePrice] >= 0");
            migrationBuilder.AddCheckConstraint(name: "CK_DentalServices_Duration", table: "DentalServices", sql: "[DurationMinutes] BETWEEN 5 AND 480");

            migrationBuilder.CreateIndex(name: "IX_Specialties_Name", table: "Specialties", column: "Name", unique: true);
            migrationBuilder.CreateIndex(name: "IX_RefreshTokens_ExpiresAt", table: "RefreshTokens", column: "ExpiresAt");
            migrationBuilder.CreateIndex(name: "IX_RefreshTokens_ReplacedByTokenId", table: "RefreshTokens", column: "ReplacedByTokenId");
            migrationBuilder.CreateIndex(name: "IX_Patients_Email", table: "Patients", column: "Email", unique: true);
            migrationBuilder.CreateIndex(name: "IX_Doctors_Email", table: "Doctors", column: "Email", unique: true);
            migrationBuilder.CreateIndex(name: "IX_Doctors_SpecialtyId", table: "Doctors", column: "SpecialtyId");
            migrationBuilder.CreateIndex(name: "IX_Appointments_AppointmentDate", table: "Appointments", column: "AppointmentDate");
            migrationBuilder.CreateIndex(name: "IX_Appointments_PatientId_AppointmentDate", table: "Appointments", columns: new[] { "PatientId", "AppointmentDate" });
            migrationBuilder.CreateIndex(name: "UX_Appointments_Doctor_Slot", table: "Appointments", columns: new[] { "DoctorId", "AppointmentDate" }, unique: true, filter: "[Status] <> 'Cancelled' AND [Status] <> 'No-show'");

            migrationBuilder.AddForeignKey(name: "FK_Appointments_DentalServices_ServiceId", table: "Appointments", column: "ServiceId", principalTable: "DentalServices", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_Consultations_DentalRecords_DentalRecordId", table: "Consultations", column: "DentalRecordId", principalTable: "DentalRecords", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_DentalRecords_Patients_PatientId", table: "DentalRecords", column: "PatientId", principalTable: "Patients", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_Doctors_Specialties_SpecialtyId", table: "Doctors", column: "SpecialtyId", principalTable: "Specialties", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_Payments_Treatments_TreatmentId", table: "Payments", column: "TreatmentId", principalTable: "Treatments", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_RefreshTokens_RefreshTokens_ReplacedByTokenId", table: "RefreshTokens", column: "ReplacedByTokenId", principalTable: "RefreshTokens", principalColumn: "Id");
            migrationBuilder.AddForeignKey(name: "FK_Users_Doctors_DoctorId", table: "Users", column: "DoctorId", principalTable: "Doctors", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(name: "FK_Users_Patients_PatientId", table: "Users", column: "PatientId", principalTable: "Patients", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(name: "FK_Appointments_DentalServices_ServiceId", table: "Appointments");
            migrationBuilder.DropForeignKey(name: "FK_Consultations_DentalRecords_DentalRecordId", table: "Consultations");
            migrationBuilder.DropForeignKey(name: "FK_DentalRecords_Patients_PatientId", table: "DentalRecords");
            migrationBuilder.DropForeignKey(name: "FK_Doctors_Specialties_SpecialtyId", table: "Doctors");
            migrationBuilder.DropForeignKey(name: "FK_Payments_Treatments_TreatmentId", table: "Payments");
            migrationBuilder.DropForeignKey(name: "FK_RefreshTokens_RefreshTokens_ReplacedByTokenId", table: "RefreshTokens");
            migrationBuilder.DropForeignKey(name: "FK_Users_Doctors_DoctorId", table: "Users");
            migrationBuilder.DropForeignKey(name: "FK_Users_Patients_PatientId", table: "Users");

            migrationBuilder.DropCheckConstraint(name: "CK_Users_Role", table: "Users");
            migrationBuilder.DropCheckConstraint(name: "CK_Users_RoleLink", table: "Users");
            migrationBuilder.DropCheckConstraint(name: "CK_Users_DisplayName", table: "Users");
            migrationBuilder.DropCheckConstraint(name: "CK_Treatments_Cost", table: "Treatments");
            migrationBuilder.DropCheckConstraint(name: "CK_Treatments_Dates", table: "Treatments");
            migrationBuilder.DropCheckConstraint(name: "CK_Treatments_Status", table: "Treatments");
            migrationBuilder.DropCheckConstraint(name: "CK_Payments_Amount", table: "Payments");
            migrationBuilder.DropCheckConstraint(name: "CK_Payments_Method", table: "Payments");
            migrationBuilder.DropCheckConstraint(name: "CK_Appointments_Status", table: "Appointments");
            migrationBuilder.DropCheckConstraint(name: "CK_DentalServices_BasePrice", table: "DentalServices");
            migrationBuilder.DropCheckConstraint(name: "CK_DentalServices_Duration", table: "DentalServices");

            migrationBuilder.DropIndex(name: "IX_RefreshTokens_ExpiresAt", table: "RefreshTokens");
            migrationBuilder.DropIndex(name: "IX_RefreshTokens_ReplacedByTokenId", table: "RefreshTokens");
            migrationBuilder.DropIndex(name: "IX_Patients_Email", table: "Patients");
            migrationBuilder.DropIndex(name: "IX_Doctors_Email", table: "Doctors");
            migrationBuilder.DropIndex(name: "IX_Doctors_SpecialtyId", table: "Doctors");
            migrationBuilder.DropIndex(name: "IX_Appointments_AppointmentDate", table: "Appointments");
            migrationBuilder.DropIndex(name: "IX_Appointments_PatientId_AppointmentDate", table: "Appointments");
            migrationBuilder.DropIndex(name: "UX_Appointments_Doctor_Slot", table: "Appointments");

            // Users: the old schema required a DisplayName on every login, copied from the profile.
            migrationBuilder.Sql(@"
UPDATE u SET DisplayName = LEFT(p.FirstName + N' ' + p.LastName, 200) FROM Users u JOIN Patients p ON p.Id = u.PatientId WHERE u.Role = N'Patient';
UPDATE u SET DisplayName = LEFT(N'Dr. ' + d.FirstName + N' ' + d.LastName, 200) FROM Users u JOIN Doctors d ON d.Id = u.DoctorId WHERE u.Role = N'Doctor';
UPDATE Users SET DisplayName = Email WHERE DisplayName IS NULL;");
            migrationBuilder.AlterColumn<string>(name: "DisplayName", table: "Users", type: "nvarchar(200)", maxLength: 200, nullable: false, oldClrType: typeof(string), oldType: "nvarchar(200)", oldMaxLength: 200, oldNullable: true);

            // Doctors: specialty back to text.
            migrationBuilder.AddColumn<string>(name: "Specialty", table: "Doctors", type: "nvarchar(80)", maxLength: 80, nullable: false, defaultValue: "");
            migrationBuilder.Sql("UPDATE d SET Specialty = s.Name FROM Doctors d JOIN Specialties s ON s.Id = d.SpecialtyId;");
            migrationBuilder.DropColumn(name: "SpecialtyId", table: "Doctors");
            migrationBuilder.DropTable(name: "Specialties");
            migrationBuilder.RenameColumn(name: "FirstName", table: "Doctors", newName: "Name");
            migrationBuilder.Sql("UPDATE Doctors SET Phone = N'' WHERE Phone IS NULL;");
            migrationBuilder.AlterColumn<string>(name: "Phone", table: "Doctors", type: "nvarchar(max)", nullable: false, oldClrType: typeof(string), oldType: "nvarchar(30)", oldMaxLength: 30, oldNullable: true);

            // Patients: the old schema required a phone and a date of birth.
            migrationBuilder.Sql("UPDATE Patients SET Phone = N'' WHERE Phone IS NULL;");
            migrationBuilder.AlterColumn<string>(name: "Phone", table: "Patients", type: "nvarchar(30)", maxLength: 30, nullable: false, oldClrType: typeof(string), oldType: "nvarchar(30)", oldMaxLength: 30, oldNullable: true);
            migrationBuilder.AlterColumn<DateTime>(name: "DateOfBirth", table: "Patients", type: "datetime2", nullable: true, oldClrType: typeof(DateOnly), oldType: "date", oldNullable: true);
            migrationBuilder.Sql("UPDATE Patients SET DateOfBirth = CreatedAt WHERE DateOfBirth IS NULL;");
            migrationBuilder.AlterColumn<DateTime>(name: "DateOfBirth", table: "Patients", type: "datetime2", nullable: false, oldClrType: typeof(DateTime), oldType: "datetime2", oldNullable: true);

            // Refresh tokens: chain back to a copy of the successor's hash.
            migrationBuilder.AddColumn<string>(name: "ReplacedByTokenHash", table: "RefreshTokens", type: "nvarchar(max)", nullable: true);
            migrationBuilder.Sql("UPDATE r SET ReplacedByTokenHash = n.TokenHash FROM RefreshTokens r JOIN RefreshTokens n ON n.Id = r.ReplacedByTokenId;");
            migrationBuilder.DropColumn(name: "ReplacedByTokenId", table: "RefreshTokens");

            // Audit columns that did not exist before.
            migrationBuilder.Sql("UPDATE DentalRecords SET UpdatedAt = CreatedAt WHERE UpdatedAt IS NULL;");
            migrationBuilder.AlterColumn<DateTime>(name: "UpdatedAt", table: "DentalRecords", type: "datetime2", nullable: false, oldClrType: typeof(DateTime), oldType: "datetime2", oldNullable: true);
            migrationBuilder.DropColumn(name: "CreatedAt", table: "DentalRecords");
            migrationBuilder.DropColumn(name: "CreatedAt", table: "DentalServices");
            migrationBuilder.DropColumn(name: "UpdatedAt", table: "DentalServices");
            migrationBuilder.DropColumn(name: "CreatedAt", table: "Consultations");
            migrationBuilder.DropColumn(name: "UpdatedAt", table: "Consultations");
            migrationBuilder.DropColumn(name: "CreatedAt", table: "Treatments");
            migrationBuilder.DropColumn(name: "UpdatedAt", table: "Treatments");
            migrationBuilder.DropColumn(name: "CreatedAt", table: "Payments");
            migrationBuilder.DropColumn(name: "UpdatedAt", table: "Payments");

            migrationBuilder.AlterColumn<string>(name: "Method", table: "Payments", type: "nvarchar(max)", nullable: true, oldClrType: typeof(string), oldType: "nvarchar(30)", oldMaxLength: 30);
            migrationBuilder.AlterColumn<string>(name: "Notes", table: "Payments", type: "nvarchar(max)", nullable: true, oldClrType: typeof(string), oldType: "nvarchar(1000)", oldMaxLength: 1000, oldNullable: true);
            migrationBuilder.AlterColumn<string>(name: "Status", table: "Appointments", type: "nvarchar(50)", maxLength: 50, nullable: false, oldClrType: typeof(string), oldType: "nvarchar(20)", oldMaxLength: 20);
            migrationBuilder.AlterColumn<string>(name: "Observations", table: "Treatments", type: "nvarchar(max)", nullable: true, oldClrType: typeof(string), oldType: "nvarchar(4000)", oldMaxLength: 4000, oldNullable: true);
            migrationBuilder.AlterColumn<string>(name: "Observations", table: "DentalRecords", type: "nvarchar(max)", nullable: true, oldClrType: typeof(string), oldType: "nvarchar(4000)", oldMaxLength: 4000, oldNullable: true);
            migrationBuilder.AlterColumn<string>(name: "Medications", table: "DentalRecords", type: "nvarchar(max)", nullable: true, oldClrType: typeof(string), oldType: "nvarchar(4000)", oldMaxLength: 4000, oldNullable: true);
            migrationBuilder.AlterColumn<string>(name: "MedicalHistory", table: "DentalRecords", type: "nvarchar(max)", nullable: true, oldClrType: typeof(string), oldType: "nvarchar(4000)", oldMaxLength: 4000, oldNullable: true);
            migrationBuilder.AlterColumn<string>(name: "Allergies", table: "DentalRecords", type: "nvarchar(max)", nullable: true, oldClrType: typeof(string), oldType: "nvarchar(4000)", oldMaxLength: 4000, oldNullable: true);
            migrationBuilder.AlterColumn<string>(name: "Diagnosis", table: "Consultations", type: "nvarchar(max)", nullable: true, oldClrType: typeof(string), oldType: "nvarchar(2000)", oldMaxLength: 2000, oldNullable: true);

            migrationBuilder.DropPrimaryKey(name: "PK_DentalServices", table: "DentalServices");
            migrationBuilder.RenameTable(name: "DentalServices", newName: "Services");
            migrationBuilder.AddPrimaryKey(name: "PK_Services", table: "Services", column: "Id");

            migrationBuilder.CreateIndex(name: "IX_Appointments_DoctorId", table: "Appointments", column: "DoctorId");
            migrationBuilder.CreateIndex(name: "IX_Appointments_DoctorId_AppointmentDate", table: "Appointments", columns: new[] { "DoctorId", "AppointmentDate" });
            migrationBuilder.CreateIndex(name: "IX_Appointments_PatientId", table: "Appointments", column: "PatientId");

            migrationBuilder.AddForeignKey(name: "FK_Appointments_Services_ServiceId", table: "Appointments", column: "ServiceId", principalTable: "Services", principalColumn: "Id", onDelete: ReferentialAction.SetNull);
            migrationBuilder.AddForeignKey(name: "FK_Consultations_DentalRecords_DentalRecordId", table: "Consultations", column: "DentalRecordId", principalTable: "DentalRecords", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            migrationBuilder.AddForeignKey(name: "FK_DentalRecords_Patients_PatientId", table: "DentalRecords", column: "PatientId", principalTable: "Patients", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            migrationBuilder.AddForeignKey(name: "FK_Payments_Treatments_TreatmentId", table: "Payments", column: "TreatmentId", principalTable: "Treatments", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            migrationBuilder.AddForeignKey(name: "FK_Users_Doctors_DoctorId", table: "Users", column: "DoctorId", principalTable: "Doctors", principalColumn: "Id", onDelete: ReferentialAction.SetNull);
            migrationBuilder.AddForeignKey(name: "FK_Users_Patients_PatientId", table: "Users", column: "PatientId", principalTable: "Patients", principalColumn: "Id", onDelete: ReferentialAction.SetNull);
        }
    }
}
