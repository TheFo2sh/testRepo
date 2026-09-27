using FastEndpoints;

namespace Catalog.Features.SearchRooms;

public sealed class SearchRoomsEndpoint(SearchRoomsUseCase useCase)
    : Endpoint<SearchRoomsRequest, SearchRoomsResponse>
{
    public override void Configure()
    {
        Get("/rooms/search");
        AllowAnonymous();
    }

    public override async Task HandleAsync(
        SearchRoomsRequest request,
        CancellationToken cancellationToken)
    {
        var response = await useCase.ExecuteAsync(request, cancellationToken);
        await Send.OkAsync(response, cancellationToken);
    }
}