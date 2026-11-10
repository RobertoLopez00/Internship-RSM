using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaDental.API.Migrations
{
    /// <summary>
    /// Unique service names (case-insensitive under the default collation). Existing duplicates are renamed
    /// instead of failing at startup: the oldest keeps its name, the rest get " (2)", " (3)", ...
    /// </summary>
    public partial class UniqueServiceNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
WITH ranked AS (
    SELECT Id, Name, ROW_NUMBER() OVER (PARTITION BY LTRIM(RTRIM(Name)) ORDER BY CreatedAt, Id) AS rn
    FROM DentalServices)
UPDATE ranked
SET Name = LEFT(LTRIM(RTRIM(Name)), 120 - LEN(N' (' + CAST(rn AS nvarchar(10)) + N')')) + N' (' + CAST(rn AS nvarchar(10)) + N')'
WHERE rn > 1;");

            migrationBuilder.CreateIndex(
                name: "IX_DentalServices_Name",
                table: "DentalServices",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DentalServices_Name",
                table: "DentalServices");
        }
    }
}
