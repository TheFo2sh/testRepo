using System.Net;

namespace Catalog.Tests;

public class SearchRoomsRoutingTests(CatalogApiFactory factory) : IClassFixture<CatalogApiFactory>
{
    [Fact]
    public async Task Search_route_is_mapped_and_anonymous()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/rooms/search");

        Assert.NotEqual(HttpStatusCode.NotFound, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.MethodNotAllowed, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("startAt=not-a-date")]
    [InlineData("minPrice=abc")]
    [InlineData("maxPrice=abc")]
    [InlineData("minStars=abc")]
    public async Task Typed_query_parameters_reject_values_of_the_wrong_type(string query)
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync($"/rooms/search?{query}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(query.Split('=')[0], await response.Content.ReadAsStringAsync());
    }
}
