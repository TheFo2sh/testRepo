using Microsoft.AspNetCore.Mvc.Testing;

namespace Catalog.Tests;

public class CatalogHostTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Host_starts_and_serves_requests()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/");

        Assert.NotNull(response);
    }
}
