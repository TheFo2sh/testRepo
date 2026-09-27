using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Backoffice.Tests;

public class UpdateHotelInfoEndpointTests(BackofficeApiFactory factory) : IClassFixture<BackofficeApiFactory>, IAsyncLifetime
{
    private IMongoCollection<BsonDocument> Hotels => factory.Database.GetCollection<BsonDocument>("hotel_infos");

    private IMongoCollection<BsonDocument> Rooms => factory.Database.GetCollection<BsonDocument>("room_infos");

    public async Task InitializeAsync()
    {
        await Hotels.DeleteManyAsync(FilterDefinition<BsonDocument>.Empty);
        await Rooms.DeleteManyAsync(FilterDefinition<BsonDocument>.Empty);

        var seededAt = new DateTime(2026, 9, 1, 8, 0, 0, DateTimeKind.Utc);
        await Hotels.InsertManyAsync(
        [
            new BsonDocument
            {
                { "hotel_id", "H-101" },
                { "city", "Rotterdam" },
                { "stars", 4 },
                { "description", "Canal-side boutique hotel" },
                { "created_at", seededAt },
                { "updated_at", seededAt },
            },
            new BsonDocument
            {
                { "hotel_id", "H-202" },
                { "city", "Utrecht" },
                { "stars", 3 },
                { "description", "Station hotel" },
            },
        ]);
        await Rooms.InsertManyAsync(
        [
            new BsonDocument
            {
                { "room_id", "R-1" },
                { "hotel_id", "H-101" },
                { "number_of_beds", 2 },
                { "price", new Decimal128(120m) },
                { "description", "Double room" },
            },
            new BsonDocument
            {
                { "room_id", "R-2" },
                { "hotel_id", "H-101" },
                { "number_of_beds", 1 },
                { "price", new Decimal128(80m) },
                { "description", "Single room" },
            },
            new BsonDocument
            {
                { "room_id", "R-9" },
                { "hotel_id", "H-202" },
                { "number_of_beds", 3 },
                { "price", new Decimal128(150m) },
                { "description", "Family room" },
            },
        ]);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<(HttpStatusCode Status, JsonElement Body)> PutAsync(string hotelId, object body)
    {
        using var client = factory.CreateClient();
        using var response = await client.PutAsJsonAsync($"/hotel-infos/{hotelId}", body);
        var content = await response.Content.ReadAsStringAsync();
        return (response.StatusCode, JsonDocument.Parse(content).RootElement.Clone());
    }

    private async Task<BsonDocument> StoredHotelAsync(string hotelId) =>
        await Hotels.Find(new BsonDocument("hotel_id", hotelId)).SingleAsync();

    [Fact]
    public async Task Updating_the_city_of_H_101_returns_the_complete_updated_hotel_info()
    {
        var (status, body) = await PutAsync("H-101", new { city = "Amsterdam" });

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(["hotelInfo"], body.EnumerateObject().Select(p => p.Name).ToArray());

        var hotelInfo = body.GetProperty("hotelInfo");
        Assert.Equal("H-101", hotelInfo.GetProperty("hotelId").GetString());
        Assert.Equal("Amsterdam", hotelInfo.GetProperty("city").GetString());
        Assert.Equal(4, hotelInfo.GetProperty("stars").GetInt32());
        Assert.Equal("Canal-side boutique hotel", hotelInfo.GetProperty("description").GetString());
        Assert.Equal(
            ["R-1", "R-2"],
            hotelInfo.GetProperty("rooms").EnumerateArray().Select(r => r.GetProperty("roomId").GetString()!).ToArray());
    }

    [Fact]
    public async Task Updating_the_city_persists_it_and_records_hotel_info_updated()
    {
        await PutAsync("H-101", new { city = "  Amsterdam " });

        var stored = await StoredHotelAsync("H-101");
        Assert.Equal("Amsterdam", stored["city"].AsString);
        Assert.Equal(4, stored["stars"].ToInt32());
        Assert.Equal("Canal-side boutique hotel", stored["description"].AsString);
        Assert.Equal("Utrecht", (await StoredHotelAsync("H-202"))["city"].AsString);
        Assert.Equal(3, await Rooms.CountDocumentsAsync(FilterDefinition<BsonDocument>.Empty));

        Assert.Contains(
            factory.Logs.Entries,
            entry => entry.EventId.Name == "HotelInfo Updated"
                && Equals(entry.State["HotelId"], "H-101")
                && Equals(entry.State["City"], "Amsterdam"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Blank_city_is_rejected_with_422_and_leaves_the_hotel_unchanged(string city)
    {
        var (status, body) = await PutAsync("H-101", new { city });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, status);
        Assert.Equal(["hotelId", "reason"], body.EnumerateObject().Select(p => p.Name).ToArray());
        Assert.Equal("H-101", body.GetProperty("hotelId").GetString());
        Assert.Equal("city is required", body.GetProperty("reason").GetString());
        Assert.Equal("Rotterdam", (await StoredHotelAsync("H-101"))["city"].AsString);
    }

    [Fact]
    public async Task Missing_city_is_rejected_like_a_blank_city()
    {
        var (status, body) = await PutAsync("H-101", new { });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, status);
        Assert.Equal("city is required", body.GetProperty("reason").GetString());
    }
}
