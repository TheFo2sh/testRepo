using MongoDB.Bson;
using MongoDB.Driver;

namespace Catalog.Features.BrowseRooms;

public interface IRoomsReadModel
{
    Task<IReadOnlyList<RoomDto>> ReadAllAsync(CancellationToken cancellationToken);
}

/// <summary>
/// Reads the MainDatabase <c>search.rooms</c> read model, stored as the <c>rooms</c> collection.
/// </summary>
public sealed class MongoRoomsReadModel(IMongoDatabase database) : IRoomsReadModel
{
    public const string CollectionName = "rooms";

    private readonly IMongoCollection<BsonDocument> _rooms = database.GetCollection<BsonDocument>(CollectionName);

    public async Task<IReadOnlyList<RoomDto>> ReadAllAsync(CancellationToken cancellationToken)
    {
        var documents = await _rooms
            .Find(FilterDefinition<BsonDocument>.Empty)
            .ToListAsync(cancellationToken);

        return documents.Select(ToRoom).ToList();
    }

    private static RoomDto ToRoom(BsonDocument document) => new(
        RoomId: AsId(document["room_id"]),
        HotelId: AsId(document["hotel_id"]),
        NumberOfBeds: document["number_of_beds"].ToInt32(),
        AvailableFrom: document["available_from"].ToUniversalTime(),
        AvailableTo: document["available_to"].ToUniversalTime(),
        City: document["city"].AsString,
        Price: document["price"].ToDecimal());

    private static string AsId(BsonValue value) => value.IsString ? value.AsString : value.ToString()!;
}
