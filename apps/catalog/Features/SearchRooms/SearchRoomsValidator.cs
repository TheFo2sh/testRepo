using FastEndpoints;
using FluentValidation;

namespace Catalog.Features.SearchRooms;

public sealed class SearchRoomsValidator : Validator<SearchRoomsRequest>
{
    public SearchRoomsValidator()
    {
        RuleFor(r => r.Duration)
            .Must(d => SearchRoomsRequest.TryParseDuration(d, out var duration) && duration > TimeSpan.Zero)
            .When(r => !string.IsNullOrWhiteSpace(r.Duration))
            .WithMessage("duration must be a positive ISO-8601 duration, for example P3D.");

        RuleFor(r => r.MinPrice).GreaterThanOrEqualTo(0).When(r => r.MinPrice is not null);

        RuleFor(r => r.MaxPrice)
            .GreaterThanOrEqualTo(0).When(r => r.MaxPrice is not null)
            .GreaterThanOrEqualTo(r => r.MinPrice!.Value).When(r => r.MaxPrice is not null && r.MinPrice is not null)
            .WithMessage("maxPrice must not be less than minPrice.");

        RuleFor(r => r.MinStars).InclusiveBetween(0, 5).When(r => r.MinStars is not null);
    }
}
