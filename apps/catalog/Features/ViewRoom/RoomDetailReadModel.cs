using MongoDB.Bson;
using MongoDB.Driver;

namespace Catalog.Features.ViewRoom;

public interface IRoomDetailReadModel
{
    Task<RoomDetailDto?> FindAsync(string roomId, CancellationToken cancellationToken);
}

/// <summary>
/// Reads one room from the MainDatabase <c>search.rooms</c> collection by its persisted <c>room_id</c>.
/// </summary>
public sealed class MongoRoomDetailReadModel(IMongoDatabase database) : IRoomDetailReadModel
{
    public const string CollectionName = "rooms";

    private readonly IMongoCollection<BsonDocument> _rooms = database.GetCollection<BsonDocument>(CollectionName);

    public async Task<RoomDetailDto?> FindAsync(string roomId, CancellationToken cancellationToken)
    {
        var document = await _rooms
            .Find(new BsonDocument("room_id", roomId))
            .FirstOrDefaultAsync(cancellationToken);

        return document is null ? null : ToRoom(document);
    }

    private static RoomDetailDto ToRoom(BsonDocument document) => new(
        RoomId: AsId(document["room_id"]),
        HotelId: AsId(document["hotel_id"]),
        NumberOfBeds: document["number_of_beds"].ToInt32(),
        AvailableFrom: document["available_from"].ToUniversalTime(),
        AvailableTo: document["available_to"].ToUniversalTime(),
        City: document["city"].AsString,
        Price: document["price"].ToDecimal(),
        Description: document.TryGetValue("description", out var description) && description.IsString
            ? description.AsString
            : string.Empty);

    private static string AsId(BsonValue value) => value.IsString ? value.AsString : value.ToString()!;
}
