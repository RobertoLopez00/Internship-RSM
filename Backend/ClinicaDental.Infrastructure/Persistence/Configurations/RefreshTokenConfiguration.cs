using ClinicaDental.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClinicaDental.Infrastructure.Persistence.Configurations;

public sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> entity)
    {
        entity.HasKey(t => t.Id);
        // Unique so a hash lookup during refresh (see AuthController.Refresh) resolves to at most one token.
        entity.HasIndex(t => t.TokenHash).IsUnique();
        entity.Property(t => t.TokenHash).IsRequired().HasMaxLength(128);
        // Supports RefreshTokenCleanupService, which deletes long-expired tokens.
        entity.HasIndex(t => t.ExpiresAt);
        // Cascade: deleting a user should clean up their refresh tokens too.
        entity.HasOne(t => t.User).WithMany(u => u.RefreshTokens).HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
        // NoAction: SQL Server rejects a second cascade path into the same table.
        entity.HasOne(t => t.ReplacedByToken).WithMany().HasForeignKey(t => t.ReplacedByTokenId).OnDelete(DeleteBehavior.NoAction);
    }
}
