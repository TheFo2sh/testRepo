namespace Backoffice.Features.UpdateHotelInfo;

public sealed record UpdateHotelInfoRequest
{
    /// <summary>Bound from the required <c>{hotelId}</c> route parameter.</summary>
    public string HotelId { get; init; } = string.Empty;

    /// <summary>Bound from the JSON request body.</summary>
    public string? City { get; init; }
}

public sealed record UpdateHotelInfoResponse;

public sealed class UpdateHotelInfoUseCase
{
    public Task<UpdateHotelInfoResponse> ExecuteAsync(
        UpdateHotelInfoRequest request,
        CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }
}