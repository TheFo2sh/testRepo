using System.Text.Json.Serialization;
using System.Xml;
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

    /// <summary>Requested stay length as an ISO-8601 duration, for example <c>P3D</c>.</summary>
    [QueryParam, BindFrom("duration")]
    public string? Duration { get; init; }

    [QueryParam, BindFrom("city")]
    public string? City { get; init; }

    [QueryParam, BindFrom("minPrice")]
    public decimal? MinPrice { get; init; }

    [QueryParam, BindFrom("maxPrice")]
    public decimal? MaxPrice { get; init; }

    [QueryParam, BindFrom("minStars")]
    public int? MinStars { get; init; }

    internal static bool TryParseDuration(string? value, out TimeSpan duration)
    {
        duration = default;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        try
        {
            duration = XmlConvert.ToTimeSpan(value.Trim());
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }
}

public sealed record SearchRoomsResponse(SearchRoomsResult Rooms);

public sealed record SearchRoomsResult(IReadOnlyList<SearchRoomDto> Results, int Total, SearchRoomsQuery Query);

public sealed record SearchRoomDto(
    string RoomId,
    string HotelId,
    int NumberOfBeds,
    DateTime AvailableFrom,
    DateTime AvailableTo,
    string City,
    decimal Price,
    string Description);

/// <summary>
/// Echo of the applied criteria. <c>text</c> is required by the contract, so it is empty when omitted.
/// </summary>
public sealed record SearchRoomsQuery(
    string Text,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] DateTime? StartAt,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Duration,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? City,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? MinPrice,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? MaxPrice,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? MinStars);

/// <summary>Normalized search criteria; every supplied criterion must hold.</summary>
public sealed record RoomSearchCriteria(
    string? Text,
    DateTime? StartAt,
    TimeSpan? Duration,
    string? City,
    decimal? MinPrice,
    decimal? MaxPrice,
    int? MinStars);

public sealed class SearchRoomsUseCase(IRoomSearchReadModel rooms)
{
    public async Task<SearchRoomsResponse> ExecuteAsync(
        SearchRoomsRequest request,
        CancellationToken cancellationToken = default)
    {
        var text = string.IsNullOrWhiteSpace(request.Text) ? null : request.Text.Trim();
        var city = string.IsNullOrWhiteSpace(request.City) ? null : request.City.Trim();
        var startAt = request.StartAt is { } value ? AsUtc(value) : (DateTime?)null;
        TimeSpan? duration = SearchRoomsRequest.TryParseDuration(request.Duration, out var parsed) ? parsed : null;

        var criteria = new RoomSearchCriteria(
            text, startAt, duration, city, request.MinPrice, request.MaxPrice, request.MinStars);

        var results = await rooms.SearchAsync(criteria, cancellationToken);

        var query = new SearchRoomsQuery(
            text ?? string.Empty,
            startAt,
            duration is null ? null : request.Duration!.Trim(),
            city,
            request.MinPrice,
            request.MaxPrice,
            request.MinStars);

        return new SearchRoomsResponse(new SearchRoomsResult(results, results.Count, query));
    }

    private static DateTime AsUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
    };
}
