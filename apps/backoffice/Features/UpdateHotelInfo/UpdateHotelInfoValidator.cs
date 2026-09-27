using FastEndpoints;
using FluentValidation;

namespace Backoffice.Features.UpdateHotelInfo;

public sealed class UpdateHotelInfoValidator : Validator<UpdateHotelInfoRequest>
{
    public const string CityRequired = "city is required";

    public UpdateHotelInfoValidator()
    {
        RuleFor(request => request.City)
            .Must(city => !string.IsNullOrWhiteSpace(city))
            .WithMessage(CityRequired);
    }
}
