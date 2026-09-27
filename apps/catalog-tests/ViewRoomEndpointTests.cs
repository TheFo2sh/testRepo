using System.Net;
using System.Text.Json;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Catalog.Tests;

public class ViewRoomEndpointTests(CatalogApiFactory factory) : IClassFixture<CatalogApiFactory>, IAsyncLifetime
{
    private static readonly DateTime AvailableFrom = new(2026, 10, 1, 14, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime AvailableTo = new(2026, 10, 31, 11, 0, 0, DateTimeKind.Utc);

    public async Task InitializeAsync()
    {
        var rooms = factory.Database.GetCollection<BsonDocument>("rooms");
        if (await rooms.CountDocumentsAsync(FilterDefinition<BsonDocument>.Empty) > 0)
        {
            return;
        }

        await rooms.InsertManyAsync(
        [
            new BsonDocument
            {
                { "room_id", "RM-204" },
                { "hotel_id", "HT-17" },
                { "number_of_beds", 2 },
                { "available_from", AvailableFrom },
                { "available_to", AvailableTo },
                { "city", "Porto" },
                { "price", new Decimal128(129.95m) },
                { "description", "Double room with a river view balcony" },
                { "created_at", AvailableFrom },
                { "updated_at", AvailableFrom },
            },
            new BsonDocument
            {
                { "room_id", "RM-205" },
                { "hotel_id", "HT-17" },
                { "number_of_beds", 1 },
                { "available_from", AvailableFrom },
                { "available_to", AvailableTo },
                { "city", "Porto" },
                { "price", new Decimal128(80m) },
                { "description", "" },
            },
        ]);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<(HttpStatusCode Status, string Content)> GetAsync(string path)
    {
        using var client = factory.CreateClient();
        using var response = await client.GetAsync(path);
        return (response.StatusCode, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Get_RM_204_returns_the_room_wrapped_in_view_room_output()
    {
        var (status, content) = await GetAsync("/rooms/RM-204");

        Assert.True(status == HttpStatusCode.OK, content);
        var output = JsonDocument.Parse(content).RootElement;
        Assert.Equal(["room"], output.EnumerateObject().Select(p => p.Name).ToArray());

        var room = output.GetProperty("room");
        Assert.Equal(
            ["roomId", "hotelId", "numberOfBeds", "availableFrom", "availableTo", "city", "price", "description"],
            room.EnumerateObject().Select(p => p.Name).ToArray());
        Assert.Equal("RM-204", room.GetProperty("roomId").GetString());
        Assert.Equal("HT-17", room.GetProperty("hotelId").GetString());
        Assert.Equal(2, room.GetProperty("numberOfBeds").GetInt32());
        Assert.Equal(new DateTimeOffset(AvailableFrom), room.GetProperty("availableFrom").GetDateTimeOffset());
        Assert.Equal(new DateTimeOffset(AvailableTo), room.GetProperty("availableTo").GetDateTimeOffset());
        Assert.Equal("Porto", room.GetProperty("city").GetString());
        Assert.Equal(129.95m, room.GetProperty("price").GetDecimal());
        Assert.Equal("Double room with a river view balcony", room.GetProperty("description").GetString());
    }

    [Fact]
    public async Task Availability_is_serialized_as_utc_date_time()
    {
        var (_, content) = await GetAsync("/rooms/RM-204");

        var room = JsonDocument.Parse(content).RootElement.GetProperty("room");
        Assert.Equal("2026-10-01T14:00:00Z", room.GetProperty("availableFrom").GetString());
        Assert.Equal("2026-10-31T11:00:00Z", room.GetProperty("availableTo").GetString());
    }

    [Fact]
    public async Task Legacy_room_with_backfilled_empty_description_still_returns_a_description_string()
    {
        var (status, content) = await GetAsync("/rooms/RM-205");

        Assert.Equal(HttpStatusCode.OK, status);
        var room = JsonDocument.Parse(content).RootElement.GetProperty("room");
        Assert.Equal("RM-205", room.GetProperty("roomId").GetString());
        Assert.Equal("", room.GetProperty("description").GetString());
    }

    [Fact]
    public async Task Whitespace_room_id_is_rejected()
    {
        var (status, content) = await GetAsync("/rooms/%20");

        Assert.Equal(HttpStatusCode.BadRequest, status);
        Assert.Contains("roomId", content);
    }

    [Fact]
    public async Task Search_route_is_not_captured_by_the_room_id_route()
    {
        var (status, content) = await GetAsync("/rooms/search");

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.True(JsonDocument.Parse(content).RootElement.TryGetProperty("rooms", out _));
    }
}
