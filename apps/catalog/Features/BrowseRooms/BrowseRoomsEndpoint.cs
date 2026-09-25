using FastEndpoints;

namespace Catalog.Features.BrowseRooms;

public sealed class BrowseRoomsEndpoint(BrowseRoomsUseCase useCase)
    : Endpoint<BrowseRoomsRequest, BrowseRoomsResponse>
{
    public override void Configure()
    {
        Get("/rooms");
        AllowAnonymous();
        RequestBinder(new BrowseRoomsRequestBinder());
    }

    public override async Task HandleAsync(
        BrowseRoomsRequest request,
        CancellationToken cancellationToken)
    {
        var response = await useCase.ExecuteAsync(request, cancellationToken);
        await Send.OkAsync(response, cancellationToken);
    }
}