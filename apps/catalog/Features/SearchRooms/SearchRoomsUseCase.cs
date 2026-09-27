using FastEndpoints;

namespace Catalog.Features.SearchRooms;

/// <summary>
/// Optional query parameters of GET /rooms/search, named as in the OpenAPI contract.
/// </summary>
public sealed record SearchRoomsRequest
{
    [QueryParam, BindFrom("text")]
    public string? Text { get; init; }

    [QueryParam, BindFrom("startAt")]
    public DateTime? StartAt { get; init; }

    /// <summary>Requested stay length in days.</summary>
    [QueryParam, BindFrom("duration")]
    public int? Duration { get; init; }

    [QueryParam, BindFrom("city")]
    public string? City { get; init; }

    [QueryParam, BindFrom("minPrice")]
    public decimal? MinPrice { get; init; }

    [QueryParam, BindFrom("maxPrice")]
    public decimal? MaxPrice { get; init; }

    [QueryParam, BindFrom("minStars")]
    public int? MinStars { get; init; }
}

public sealed record SearchRoomsResponse;

public sealed class SearchRoomsUseCase
{
    public Task<SearchRoomsResponse> ExecuteAsync(
        SearchRoomsRequest request,
        CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }
}