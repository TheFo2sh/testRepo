namespace Backoffice.Features.UpdateHotelInfo;

public sealed record UpdateHotelInfoRequest
{
    /// <summary>Bound from the required <c>{hotelId}</c> route parameter.</summary>
    public string HotelId { get; init; } = string.Empty;

    /// <summary>Bound from the JSON request body.</summary>
    public string? City { get; init; }
}

/// <summary>The contract's success body: the complete updated HotelInfo wrapped in <c>hotelInfo</c>.</summary>
public sealed record UpdateHotelInfoResponse(HotelInfoDto HotelInfo);

/// <summary>The contract's <c>UpdateHotelInfoHotelInfoUpdateRejectedBody</c>, sent with HTTP 422.</summary>
public sealed record UpdateHotelInfoRejectedBody(string HotelId, string Reason);

public sealed record HotelInfoDto(
    string HotelId,
    IReadOnlyList<RoomInfoDto> Rooms,
    string City,
    int Stars,
    string Description);

public sealed record RoomInfoDto(
    string RoomId,
    int? NumberOfBeds,
    decimal? Price,
    string Description);

public sealed class UpdateHotelInfoUseCase(IHotelInfoStore hotelInfos, ILogger<UpdateHotelInfoUseCase> logger)
{
    public static readonly EventId HotelInfoUpdated = new(1101, "HotelInfo Updated");

    /// <returns>The updated HotelInfo, or <c>null</c> when no hotel has the requested identifier.</returns>
    public async Task<UpdateHotelInfoResponse?> ExecuteAsync(
        UpdateHotelInfoRequest request,
        CancellationToken cancellationToken = default)
    {
        var hotelId = request.HotelId.Trim();
        var city = request.City!.Trim();

        var hotelInfo = await hotelInfos.UpdateCityAsync(hotelId, city, cancellationToken);
        if (hotelInfo is null)
        {
            return null;
        }

        logger.LogInformation(
            HotelInfoUpdated,
            "HotelInfo Updated: {HotelId} city set to {City}",
            hotelInfo.HotelId,
            hotelInfo.City);

        return new UpdateHotelInfoResponse(hotelInfo);
    }
}
