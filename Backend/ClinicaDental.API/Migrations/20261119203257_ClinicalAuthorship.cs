using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaDental.API.Migrations
{
    /// <inheritdoc />
    public partial class ClinicalAuthorship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "DentalRecords",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedByUserId",
                table: "DentalRecords",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "Consultations",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedByUserId",
                table: "Consultations",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DentalRecords_CreatedByUserId",
                table: "DentalRecords",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_DentalRecords_UpdatedByUserId",
                table: "DentalRecords",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Consultations_CreatedByUserId",
                table: "Consultations",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Consultations_UpdatedByUserId",
                table: "Consultations",
                column: "UpdatedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Consultations_Users_CreatedByUserId",
                table: "Consultations",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Consultations_Users_UpdatedByUserId",
                table: "Consultations",
                column: "UpdatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DentalRecords_Users_CreatedByUserId",
                table: "DentalRecords",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DentalRecords_Users_UpdatedByUserId",
                table: "DentalRecords",
                column: "UpdatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Consultations_Users_CreatedByUserId",
                table: "Consultations");

            migrationBuilder.DropForeignKey(
                name: "FK_Consultations_Users_UpdatedByUserId",
                table: "Consultations");

            migrationBuilder.DropForeignKey(
                name: "FK_DentalRecords_Users_CreatedByUserId",
                table: "DentalRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_DentalRecords_Users_UpdatedByUserId",
                table: "DentalRecords");

            migrationBuilder.DropIndex(
                name: "IX_DentalRecords_CreatedByUserId",
                table: "DentalRecords");

            migrationBuilder.DropIndex(
                name: "IX_DentalRecords_UpdatedByUserId",
                table: "DentalRecords");

            migrationBuilder.DropIndex(
                name: "IX_Consultations_CreatedByUserId",
                table: "Consultations");

            migrationBuilder.DropIndex(
                name: "IX_Consultations_UpdatedByUserId",
                table: "Consultations");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "DentalRecords");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "DentalRecords");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Consultations");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "Consultations");
        }
    }
}
