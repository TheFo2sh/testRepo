using System.Net;
using System.Text.Json;
using MongoDB.Bson;

namespace Catalog.Tests;

public class BrowseRoomsEndpointTests(CatalogApiFactory factory) : IClassFixture<CatalogApiFactory>
{
    [Fact]
    public async Task Get_rooms_returns_every_stored_room_with_contract_fields_and_total()
    {
        var rooms = factory.Database.GetCollection<BsonDocument>("rooms");
        await rooms.InsertManyAsync(
        [
            new BsonDocument
            {
                { "room_id", "room-1" },
                { "hotel_id", "hotel-1" },
                { "number_of_beds", 2 },
                { "available_from", new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc) },
                { "available_to", new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc) },
                { "city", "Berlin" },
                { "price", new Decimal128(129.99m) },
            },
            new BsonDocument
            {
                { "room_id", "room-2" },
                { "hotel_id", "hotel-2" },
                { "number_of_beds", 1 },
                { "available_from", new DateTime(2026, 11, 1, 12, 0, 0, DateTimeKind.Utc) },
                { "available_to", new DateTime(2026, 11, 3, 12, 0, 0, DateTimeKind.Utc) },
                { "city", "Cairo" },
                { "price", new Decimal128(75m) },
            },
        ]);
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/rooms");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var body = json.RootElement.GetProperty("rooms");
        var results = body.GetProperty("results").EnumerateArray().OrderBy(r => r.GetProperty("roomId").GetString()).ToList();
        Assert.Equal(2, results.Count);
        Assert.Equal(results.Count, body.GetProperty("total").GetInt32());

        var first = results[0];
        Assert.Equal("room-1", first.GetProperty("roomId").GetString());
        Assert.Equal("hotel-1", first.GetProperty("hotelId").GetString());
        Assert.Equal(2, first.GetProperty("numberOfBeds").GetInt32());
        Assert.Equal(new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.Zero), first.GetProperty("availableFrom").GetDateTimeOffset());
        Assert.Equal(new DateTimeOffset(2026, 10, 15, 0, 0, 0, TimeSpan.Zero), first.GetProperty("availableTo").GetDateTimeOffset());
        Assert.Equal("Berlin", first.GetProperty("city").GetString());
        Assert.Equal(JsonValueKind.Number, first.GetProperty("price").ValueKind);
        Assert.Equal(129.99m, first.GetProperty("price").GetDecimal());
    }
}
