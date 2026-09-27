using FastEndpoints;
using FluentValidation;

namespace Catalog.Features.ViewRoom;

public sealed class ViewRoomValidator : Validator<ViewRoomRequest>
{
    public ViewRoomValidator()
    {
        RuleFor(request => request.RoomId)
            .Must(roomId => !string.IsNullOrWhiteSpace(roomId))
            .WithMessage("roomId is required.");
    }
}
