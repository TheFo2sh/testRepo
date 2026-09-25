using System.Net;
using System.Text.Json;
using MongoDB.Bson;

namespace Catalog.Tests;

public class BrowseRoomsEndpointTests(CatalogApiFactory factory) : IClassFixture<CatalogApiFactory>
{
    private sealed record FixtureRoom(
        string RoomId,
        string HotelId,
        int NumberOfBeds,
        DateTime AvailableFrom,
        DateTime AvailableTo,
        string City,
        decimal Price);

    private static readonly FixtureRoom[] Fixtures =
    [
        new("room-1", "hotel-1", 2,
            new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc),
            "Berlin", 129.99m),
        new("room-2", "hotel-2", 1,
            new DateTime(2026, 11, 1, 12, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 11, 3, 12, 0, 0, DateTimeKind.Utc),
            "Cairo", 75.50m),
    ];

    [Fact]
    public async Task Anonymous_get_rooms_returns_every_stored_room_with_contract_fields_and_total()
    {
        var rooms = factory.Database.GetCollection<BsonDocument>("rooms");
        await rooms.InsertManyAsync(Fixtures.Select(room => new BsonDocument
        {
            { "room_id", room.RoomId },
            { "hotel_id", room.HotelId },
            { "number_of_beds", room.NumberOfBeds },
            { "available_from", room.AvailableFrom },
            { "available_to", room.AvailableTo },
            { "city", room.City },
            { "price", new Decimal128(room.Price) },
        }));
        using var client = factory.CreateClient();
        Assert.Null(client.DefaultRequestHeaders.Authorization);

        using var response = await client.GetAsync("/rooms");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var body = json.RootElement.GetProperty("rooms");
        var results = body.GetProperty("results").EnumerateArray()
            .OrderBy(r => r.GetProperty("roomId").GetString())
            .ToList();
        Assert.Equal(Fixtures.Length, results.Count);
        Assert.Equal(Fixtures.Length, body.GetProperty("total").GetInt32());

        foreach (var (expected, actual) in Fixtures.Zip(results))
        {
            Assert.Equal(expected.RoomId, actual.GetProperty("roomId").GetString());
            Assert.Equal(expected.HotelId, actual.GetProperty("hotelId").GetString());
            Assert.Equal(expected.NumberOfBeds, actual.GetProperty("numberOfBeds").GetInt32());
            Assert.Equal(new DateTimeOffset(expected.AvailableFrom), actual.GetProperty("availableFrom").GetDateTimeOffset());
            Assert.Equal(new DateTimeOffset(expected.AvailableTo), actual.GetProperty("availableTo").GetDateTimeOffset());
            Assert.Equal(expected.City, actual.GetProperty("city").GetString());
            Assert.Equal(JsonValueKind.Number, actual.GetProperty("price").ValueKind);
            Assert.Equal(expected.Price, actual.GetProperty("price").GetDecimal());
        }
    }
}
