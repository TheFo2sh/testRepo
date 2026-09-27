using System.Text.RegularExpressions;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Catalog.Features.SearchRooms;

public interface IRoomSearchReadModel
{
    Task<IReadOnlyList<SearchRoomDto>> SearchAsync(RoomSearchCriteria criteria, CancellationToken cancellationToken);
}

/// <summary>
/// Searches the MainDatabase <c>search.rooms</c> collection, joining <c>search.hotels</c> by
/// <c>hotel_id</c> when a hotel star threshold is requested. Results are ordered by <c>room_id</c>.
/// </summary>
public sealed class MongoRoomSearchReadModel(IMongoDatabase database) : IRoomSearchReadModel
{
    public const string RoomsCollectionName = "rooms";
    public const string HotelsCollectionName = "hotels";

    private readonly IMongoCollection<BsonDocument> _rooms = database.GetCollection<BsonDocument>(RoomsCollectionName);

    public async Task<IReadOnlyList<SearchRoomDto>> SearchAsync(
        RoomSearchCriteria criteria,
        CancellationToken cancellationToken)
    {
        var documents = await _rooms
            .Aggregate<BsonDocument>(BuildPipeline(criteria), cancellationToken: cancellationToken)
            .ToListAsync(cancellationToken);

        return documents.Select(ToRoom).ToList();
    }

    internal static PipelineDefinition<BsonDocument, BsonDocument> BuildPipeline(RoomSearchCriteria criteria)
    {
        var stages = new List<BsonDocument>();
        var roomFilters = new List<BsonDocument>();

        if (criteria.Text is { } text)
        {
            roomFilters.Add(new BsonDocument("description", new BsonRegularExpression(PhrasePattern(text), "i")));
        }

        if (criteria.City is { } city)
        {
            roomFilters.Add(new BsonDocument("city", new BsonRegularExpression($"^{Regex.Escape(city)}$", "i")));
        }

        if (criteria.MinPrice is { } minPrice)
        {
            roomFilters.Add(new BsonDocument("price", new BsonDocument("$gte", new BsonDecimal128(minPrice))));
        }

        if (criteria.MaxPrice is { } maxPrice)
        {
            roomFilters.Add(new BsonDocument("price", new BsonDocument("$lte", new BsonDecimal128(maxPrice))));
        }

        switch (criteria.StartAt, criteria.Duration)
        {
            case ({ } startAt, { } duration):
                roomFilters.Add(new BsonDocument("available_from", new BsonDocument("$lte", startAt)));
                roomFilters.Add(new BsonDocument("available_to", new BsonDocument("$gte", startAt.Add(duration))));
                break;
            case ({ } startAt, null):
                roomFilters.Add(new BsonDocument("available_from", new BsonDocument("$lte", startAt)));
                roomFilters.Add(new BsonDocument("available_to", new BsonDocument("$gte", startAt)));
                break;
            case (null, { } duration):
                roomFilters.Add(new BsonDocument("$expr", new BsonDocument("$gte", new BsonArray
                {
                    new BsonDocument("$subtract", new BsonArray { "$available_to", "$available_from" }),
                    (long)duration.TotalMilliseconds,
                })));
                break;
        }

        if (roomFilters.Count > 0)
        {
            stages.Add(new BsonDocument("$match", new BsonDocument("$and", new BsonArray(roomFilters))));
        }

        if (criteria.MinStars is { } minStars)
        {
            stages.Add(new BsonDocument("$lookup", new BsonDocument
            {
                { "from", HotelsCollectionName },
                { "localField", "hotel_id" },
                { "foreignField", "hotel_id" },
                { "as", "hotel" },
            }));
            stages.Add(new BsonDocument("$match", new BsonDocument("hotel.stars", new BsonDocument("$gte", minStars))));
            stages.Add(new BsonDocument("$project", new BsonDocument("hotel", 0)));
        }

        stages.Add(new BsonDocument("$sort", new BsonDocument("room_id", 1)));

        return PipelineDefinition<BsonDocument, BsonDocument>.Create(stages);
    }

    /// <summary>Matches the words of <paramref name="text"/> in order, separated by any whitespace.</summary>
    private static string PhrasePattern(string text) =>
        string.Join(@"\s+", text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Select(Regex.Escape));

    private static SearchRoomDto ToRoom(BsonDocument document) => new(
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
