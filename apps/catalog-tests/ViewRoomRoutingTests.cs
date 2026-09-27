using System.Net;

namespace Catalog.Tests;

public class ViewRoomRoutingTests(CatalogApiFactory factory) : IClassFixture<CatalogApiFactory>
{
    [Fact]
    public async Task View_room_route_is_mapped_and_anonymous()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/rooms/RM-204");

        Assert.NotEqual(HttpStatusCode.NotFound, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.MethodNotAllowed, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
