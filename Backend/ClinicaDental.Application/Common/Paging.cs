namespace ClinicaDental.Application.Common;

// Optional paging for list endpoints. Page is 1-based; PageSize is capped so one request can't load a whole table.
public sealed record PageRequest(int Page, int PageSize)
{
    public const int MaxPageSize = 200;

    public static PageRequest? From(int? page, int? pageSize) =>
        page is null && pageSize is null ? null : new PageRequest(Math.Max(page ?? 1, 1), Math.Clamp(pageSize ?? 50, 1, MaxPageSize));

    public int Skip => (Page - 1) * PageSize;
}

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Total);
