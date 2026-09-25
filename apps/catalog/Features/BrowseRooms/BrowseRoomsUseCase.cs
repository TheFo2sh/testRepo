namespace Catalog.Features.BrowseRooms;

public sealed record BrowseRoomsRequest;

public sealed record BrowseRoomsResponse(RoomsResult Rooms);

public sealed record RoomsResult(IReadOnlyList<RoomDto> Results, int Total);

public sealed record RoomDto(
    string RoomId,
    string HotelId,
    int NumberOfBeds,
    DateTime AvailableFrom,
    DateTime AvailableTo,
    string City,
    decimal Price);

public sealed class BrowseRoomsUseCase
{
    public Task<BrowseRoomsResponse> ExecuteAsync(
        BrowseRoomsRequest request,
        CancellationToken cancellationToken = default)
    {
        IReadOnlyList<RoomDto> results = [];
        return Task.FromResult(new BrowseRoomsResponse(new RoomsResult(results, results.Count)));
    }
}
