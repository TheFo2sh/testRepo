using FastEndpoints;

namespace Backoffice.Features.UpdateHotelInfo;

public sealed class UpdateHotelInfoEndpoint(UpdateHotelInfoUseCase useCase)
    : Endpoint<UpdateHotelInfoRequest, UpdateHotelInfoResponse>
{
    public override void Configure()
    {
        Put("/hotel-infos/{hotelId}");
        AllowAnonymous();
        DontThrowIfValidationFails();
    }

    public override async Task HandleAsync(
        UpdateHotelInfoRequest request,
        CancellationToken cancellationToken)
    {
        if (ValidationFailed)
        {
            // The contract rejects with its own 422 body instead of FastEndpoints' validation payload.
            await HttpContext.Response.SendAsync(
                new UpdateHotelInfoRejectedBody(request.HotelId, ValidationFailures[0].ErrorMessage),
                StatusCodes.Status422UnprocessableEntity,
                cancellation: cancellationToken);
            return;
        }

        var response = await useCase.ExecuteAsync(request, cancellationToken);
        if (response is null)
        {
            await Send.NotFoundAsync(cancellationToken);
            return;
        }

        await Send.OkAsync(response, cancellationToken);
    }
}
