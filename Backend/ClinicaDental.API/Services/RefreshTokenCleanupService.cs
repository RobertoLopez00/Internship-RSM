using ClinicaDental.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicaDental.API.Services;

// Deletes refresh tokens that expired more than 30 days ago, once a day. Recently expired tokens are kept a
// while so reuse of a rotated token can still be traced through the ReplacedByTokenId chain.
public sealed class RefreshTokenCleanupService(IServiceScopeFactory scopes, ILogger<RefreshTokenCleanupService> logger) : BackgroundService
{
    private static readonly TimeSpan Retention = TimeSpan.FromDays(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromDays(1));
        do { await CleanUp(stoppingToken); } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task CleanUp(CancellationToken token)
    {
        try
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var cutoff = DateTime.UtcNow - Retention;
            // A kept token may point at one being deleted; clear that link first so the FK doesn't block the delete.
            await db.RefreshTokens
                .Where(t => t.ReplacedByToken != null && t.ReplacedByToken.ExpiresAt < cutoff && t.ExpiresAt >= cutoff)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.ReplacedByTokenId, (Guid?)null), token);
            var deleted = await db.RefreshTokens.Where(t => t.ExpiresAt < cutoff).ExecuteDeleteAsync(token);
            if (deleted > 0) logger.LogInformation("Deleted {Count} expired refresh tokens", deleted);
        }
        catch (OperationCanceledException) when (token.IsCancellationRequested) { }
        catch (Exception exception) { logger.LogError(exception, "Could not clean up expired refresh tokens"); }
    }
}
