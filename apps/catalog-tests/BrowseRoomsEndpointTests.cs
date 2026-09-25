using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Catalog.Tests;

public class BrowseRoomsEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Get_rooms_is_public_and_returns_rooms_root()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/rooms");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var rooms = json.RootElement.GetProperty("rooms");
        Assert.Equal(JsonValueKind.Array, rooms.GetProperty("results").ValueKind);
        Assert.Equal(JsonValueKind.Number, rooms.GetProperty("total").ValueKind);
    }
}
