using FastEndpoints;

namespace Catalog.Features.BrowseRooms;

/// <summary>
/// GET /rooms has no parameters, and FastEndpoints' default binder rejects
/// request DTOs without public properties, so the empty request is created directly.
/// </summary>
public sealed class BrowseRoomsRequestBinder : IRequestBinder<BrowseRoomsRequest>
{
    public ValueTask<BrowseRoomsRequest> BindAsync(BinderContext ctx, CancellationToken ct)
        => ValueTask.FromResult(new BrowseRoomsRequest());
}
