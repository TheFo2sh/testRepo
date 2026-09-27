using MongoDB.Bson;
using MongoDB.Driver;

namespace Backoffice.Features.UpdateHotelInfo;

public interface IHotelInfoStore
{
    /// <summary>Sets the hotel's city and returns the updated HotelInfo, or <c>null</c> when no hotel matches.</summary>
    Task<HotelInfoDto?> UpdateCityAsync(string hotelId, string city, CancellationToken cancellationToken);
}

/// <summary>
/// Writes HotelInfo to the MainDatabase <c>hotels</c> model: <c>hotel_infos</c> holds the hotel,
/// and its dependent <c>room_infos</c> are associated by <c>hotel_id</c>.
/// </summary>
public sealed class MongoHotelInfoStore(IMongoDatabase database) : IHotelInfoStore
{
    public const string HotelInfosCollection = "hotel_infos";
    public const string RoomInfosCollection = "room_infos";

    private readonly IMongoCollection<BsonDocument> _hotels = database.GetCollection<BsonDocument>(HotelInfosCollection);
    private readonly IMongoCollection<BsonDocument> _rooms = database.GetCollection<BsonDocument>(RoomInfosCollection);

    public async Task<HotelInfoDto?> UpdateCityAsync(string hotelId, string city, CancellationToken cancellationToken)
    {
        var hotel = await _hotels.FindOneAndUpdateAsync(
            new BsonDocument("hotel_id", hotelId),
            Builders<BsonDocument>.Update
                .Set("city", city)
                .Set("updated_at", DateTime.UtcNow),
            new FindOneAndUpdateOptions<BsonDocument> { ReturnDocument = ReturnDocument.After },
            cancellationToken);

        if (hotel is null)
        {
            return null;
        }

        var rooms = await _rooms
            .Find(new BsonDocument("hotel_id", hotelId))
            .Sort(Builders<BsonDocument>.Sort.Ascending("room_id"))
            .ToListAsync(cancellationToken);

        return new HotelInfoDto(
            HotelId: AsId(hotel["hotel_id"]),
            Rooms: rooms.Select(ToRoom).ToList(),
            City: hotel["city"].AsString,
            Stars: hotel.TryGetValue("stars", out var stars) && stars.IsNumeric ? stars.ToInt32() : 0,
            Description: AsText(hotel, "description"));
    }

    private static RoomInfoDto ToRoom(BsonDocument document) => new(
        RoomId: AsId(document["room_id"]),
        NumberOfBeds: document.TryGetValue("number_of_beds", out var beds) && beds.IsNumeric ? beds.ToInt32() : null,
        Price: document.TryGetValue("price", out var price) && price.IsNumeric ? price.ToDecimal() : null,
        Description: AsText(document, "description"));

    private static string AsText(BsonDocument document, string field) =>
        document.TryGetValue(field, out var value) && value.IsString ? value.AsString : string.Empty;

    private static string AsId(BsonValue value) => value.IsString ? value.AsString : value.ToString()!;
}
