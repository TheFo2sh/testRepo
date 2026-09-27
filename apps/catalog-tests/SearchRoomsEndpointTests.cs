using System.Net;
using System.Text.Json;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Catalog.Tests;

public class SearchRoomsEndpointTests(CatalogApiFactory factory) : IClassFixture<CatalogApiFactory>, IAsyncLifetime
{
    private sealed record FixtureRoom(
        string RoomId,
        string HotelId,
        int NumberOfBeds,
        DateTime AvailableFrom,
        DateTime AvailableTo,
        string City,
        decimal Price,
        string Description);

    private static DateTime Utc(int month, int day) => new(2026, month, day, 0, 0, 0, DateTimeKind.Utc);

    private static readonly (string HotelId, string City, int Stars)[] Hotels =
    [
        ("hotel-5", "Berlin", 5),
        ("hotel-3", "Cairo", 3),
        ("hotel-4", "Berlin", 4),
    ];

    // Inserted out of room_id order to check the deterministic ordering.
    private static readonly FixtureRoom[] Rooms =
    [
        new("room-5", "hotel-5", 4, Utc(10, 10), Utc(10, 20), "Cairo", 200m, "Sea view penthouse"),
        new("room-1", "hotel-5", 2, Utc(10, 1), Utc(10, 15), "Berlin", 150m, "Suite with a Sea View balcony"),
        new("room-2", "hotel-3", 2, Utc(10, 5), Utc(10, 7), "cairo", 80m, "Garden view twin room"),
        new("room-3", "hotel-4", 1, Utc(11, 1), Utc(11, 30), "Berlin", 100m, "Quiet room with a sea  view terrace"),
        new("room-4", "hotel-3", 3, Utc(10, 1), Utc(10, 3), "Alexandria", 60m, "Sea side, no view"),
    ];

    public async Task InitializeAsync()
    {
        var rooms = factory.Database.GetCollection<BsonDocument>("rooms");
        if (await rooms.CountDocumentsAsync(FilterDefinition<BsonDocument>.Empty) > 0)
        {
            return;
        }

        await factory.Database.GetCollection<BsonDocument>("hotels").InsertManyAsync(Hotels.Select(hotel => new BsonDocument
        {
            { "hotel_id", hotel.HotelId },
            { "city", hotel.City },
            { "stars", hotel.Stars },
        }));
        await rooms.InsertManyAsync(Rooms.Select(room => new BsonDocument
        {
            { "room_id", room.RoomId },
            { "hotel_id", room.HotelId },
            { "number_of_beds", room.NumberOfBeds },
            { "available_from", room.AvailableFrom },
            { "available_to", room.AvailableTo },
            { "city", room.City },
            { "price", new Decimal128(room.Price) },
            { "description", room.Description },
        }));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<JsonElement> SearchAsync(string query)
    {
        using var client = factory.CreateClient();
        using var response = await client.GetAsync($"/rooms/search?{query}");
        var content = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == HttpStatusCode.OK, content);
        return JsonDocument.Parse(content).RootElement.GetProperty("rooms").Clone();
    }

    private static string[] RoomIds(JsonElement rooms) =>
        rooms.GetProperty("results").EnumerateArray().Select(r => r.GetProperty("roomId").GetString()!).ToArray();

    [Fact]
    public async Task Text_sea_view_returns_only_rooms_whose_description_contains_the_phrase()
    {
        var rooms = await SearchAsync("text=sea%20view");

        Assert.Equal(["room-1", "room-3", "room-5"], RoomIds(rooms));
        Assert.Equal(3, rooms.GetProperty("total").GetInt32());
        Assert.Equal("sea view", rooms.GetProperty("query").GetProperty("text").GetString());
    }

    [Fact]
    public async Task Results_carry_every_contracted_room_property()
    {
        var rooms = await SearchAsync("text=sea%20view&city=Berlin&minStars=5");

        var room = Assert.Single(rooms.GetProperty("results").EnumerateArray());
        var expected = Rooms.Single(r => r.RoomId == "room-1");
        Assert.Equal(1, rooms.GetProperty("total").GetInt32());
        Assert.Equal(expected.RoomId, room.GetProperty("roomId").GetString());
        Assert.Equal(expected.HotelId, room.GetProperty("hotelId").GetString());
        Assert.Equal(expected.NumberOfBeds, room.GetProperty("numberOfBeds").GetInt32());
        Assert.Equal(new DateTimeOffset(expected.AvailableFrom), room.GetProperty("availableFrom").GetDateTimeOffset());
        Assert.Equal(new DateTimeOffset(expected.AvailableTo), room.GetProperty("availableTo").GetDateTimeOffset());
        Assert.Equal(expected.City, room.GetProperty("city").GetString());
        Assert.Equal(expected.Price, room.GetProperty("price").GetDecimal());
        Assert.Equal(expected.Description, room.GetProperty("description").GetString());
        Assert.False(room.TryGetProperty("hotel", out _));
        Assert.False(room.TryGetProperty("_id", out _));
    }

    [Theory]
    [InlineData("city=BERLIN", new[] { "room-1", "room-3" })]
    [InlineData("city=cairo", new[] { "room-2", "room-5" })]
    [InlineData("minPrice=100", new[] { "room-1", "room-3", "room-5" })]
    [InlineData("maxPrice=100", new[] { "room-2", "room-3", "room-4" })]
    [InlineData("minPrice=80&maxPrice=150", new[] { "room-1", "room-2", "room-3" })]
    [InlineData("minStars=4", new[] { "room-1", "room-3", "room-5" })]
    [InlineData("minStars=5", new[] { "room-1", "room-5" })]
    [InlineData("startAt=2026-10-06T00:00:00Z", new[] { "room-1", "room-2" })]
    [InlineData("startAt=2026-10-15T00:00:00Z", new[] { "room-1", "room-5" })]
    [InlineData("startAt=2026-10-06T00:00:00Z&duration=P3D", new[] { "room-1" })]
    [InlineData("startAt=2026-10-10T00:00:00Z&duration=P10D", new[] { "room-5" })]
    [InlineData("duration=P10D", new[] { "room-1", "room-3", "room-5" })]
    [InlineData("duration=P20D", new[] { "room-3" })]
    public async Task Each_filter_narrows_results(string query, string[] expected)
    {
        var rooms = await SearchAsync(query);

        Assert.Equal(expected, RoomIds(rooms));
        Assert.Equal(expected.Length, rooms.GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task Supplied_criteria_combine_with_and_semantics()
    {
        var rooms = await SearchAsync(
            "text=sea%20view&minStars=4&maxPrice=150&startAt=2026-10-02T00:00:00Z&duration=P7D");

        Assert.Equal(["room-1"], RoomIds(rooms));
        Assert.Equal(1, rooms.GetProperty("total").GetInt32());

        var none = await SearchAsync("text=sea%20view&city=Alexandria");
        Assert.Empty(RoomIds(none));
        Assert.Equal(0, none.GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task All_seven_filters_are_accepted_together()
    {
        const string query =
            "text=sea%20view&startAt=2026-11-05T00:00:00Z&duration=P7D&city=berlin&minPrice=90&maxPrice=120&minStars=4";

        var rooms = await SearchAsync(query);

        Assert.Equal(["room-3"], RoomIds(rooms));
        Assert.Equal(1, rooms.GetProperty("total").GetInt32());
        var echo = rooms.GetProperty("query");
        Assert.Equal(
            ["text", "startAt", "duration", "city", "minPrice", "maxPrice", "minStars"],
            echo.EnumerateObject().Select(p => p.Name).ToArray());

        // Tightening any one of the seven excludes the room, so each is applied in the combination.
        foreach (var (name, value) in new[]
                 {
                     ("text", "garden%20view"), ("startAt", "2026-10-20T00:00:00Z"), ("duration", "P30D"),
                     ("city", "Cairo"), ("minPrice", "110"), ("maxPrice", "95"), ("minStars", "5"),
                 })
        {
            var tightened = System.Text.RegularExpressions.Regex.Replace(query, $"{name}=[^&]*", $"{name}={value}");
            Assert.Equal(0, (await SearchAsync(tightened)).GetProperty("total").GetInt32());
        }
    }

    [Fact]
    public async Task No_criteria_returns_every_room_ordered_by_room_id_with_empty_text_echo()
    {
        var rooms = await SearchAsync("");

        Assert.Equal(["room-1", "room-2", "room-3", "room-4", "room-5"], RoomIds(rooms));
        Assert.Equal(5, rooms.GetProperty("total").GetInt32());
        var query = rooms.GetProperty("query");
        Assert.Equal("", query.GetProperty("text").GetString());
        Assert.Single(query.EnumerateObject());
    }

    [Fact]
    public async Task Query_echoes_supplied_criteria_and_empty_text_when_text_is_omitted()
    {
        var rooms = await SearchAsync("city=Paris&minPrice=10&maxPrice=20&minStars=3&startAt=2026-10-06T00:00:00Z&duration=P2D");

        Assert.Empty(RoomIds(rooms));
        Assert.Equal(0, rooms.GetProperty("total").GetInt32());
        var query = rooms.GetProperty("query");
        Assert.Equal("", query.GetProperty("text").GetString());
        Assert.Equal("Paris", query.GetProperty("city").GetString());
        Assert.Equal(10m, query.GetProperty("minPrice").GetDecimal());
        Assert.Equal(20m, query.GetProperty("maxPrice").GetDecimal());
        Assert.Equal(3, query.GetProperty("minStars").GetInt32());
        Assert.Equal(new DateTimeOffset(Utc(10, 6)), query.GetProperty("startAt").GetDateTimeOffset());
        Assert.Equal("P2D", query.GetProperty("duration").GetString());
    }

    [Theory]
    [InlineData("duration=3")]
    [InlineData("duration=-P1D")]
    [InlineData("minPrice=50&maxPrice=10")]
    [InlineData("minStars=6")]
    public async Task Invalid_criteria_are_rejected(string query)
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync($"/rooms/search?{query}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
