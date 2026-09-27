namespace Catalog.Features.ViewRoom;

public sealed record ViewRoomRequest;

public sealed record ViewRoomResponse;

public sealed class ViewRoomUseCase
{
    public Task<ViewRoomResponse> ExecuteAsync(
        ViewRoomRequest request,
        CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }
}