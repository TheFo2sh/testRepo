using FastEndpoints;

namespace Backoffice.Features.UpdateHotelInfo;

public sealed class UpdateHotelInfoEndpoint(UpdateHotelInfoUseCase useCase)
    : Endpoint<UpdateHotelInfoRequest, UpdateHotelInfoResponse>
{
    public override void Configure()
    {
        Put("/hotel-infos/{hotelId}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(
        UpdateHotelInfoRequest request,
        CancellationToken cancellationToken)
    {
        var response = await useCase.ExecuteAsync(request, cancellationToken);
        await Send.OkAsync(response, cancellationToken);
    }
}