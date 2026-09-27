using FastEndpoints;

namespace Catalog.Features.ViewRoom;

public sealed class ViewRoomEndpoint(ViewRoomUseCase useCase)
    : Endpoint<ViewRoomRequest, ViewRoomResponse>
{
    public override void Configure()
    {
        Get("/rooms/{roomId}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(
        ViewRoomRequest request,
        CancellationToken cancellationToken)
    {
        var response = await useCase.ExecuteAsync(request, cancellationToken);
        await Send.OkAsync(response, cancellationToken);
    }
}