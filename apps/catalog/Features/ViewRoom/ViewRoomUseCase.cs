using FastEndpoints;

namespace Catalog.Features.ViewRoom;

/// <summary>Path parameter of GET /rooms/{roomId}, named as in the OpenAPI contract.</summary>
public sealed record ViewRoomRequest
{
    [BindFrom("roomId")]
    public string RoomId { get; init; } = string.Empty;
}

/// <summary>The contract's <c>ViewRoomOutput</c>: the room wrapped in a required <c>room</c> property.</summary>
public sealed record ViewRoomResponse(RoomDetailDto Room);

public sealed record RoomDetailDto(
    string RoomId,
    string HotelId,
    int NumberOfBeds,
    DateTime AvailableFrom,
    DateTime AvailableTo,
    string City,
    decimal Price,
    string Description);

public sealed class ViewRoomUseCase(IRoomDetailReadModel rooms)
{
    /// <returns>The room, or <c>null</c> when no room has the requested identifier.</returns>
    public async Task<ViewRoomResponse?> ExecuteAsync(
        ViewRoomRequest request,
        CancellationToken cancellationToken = default)
    {
        var room = await rooms.FindAsync(request.RoomId.Trim(), cancellationToken);
        return room is null ? null : new ViewRoomResponse(room);
    }
}
