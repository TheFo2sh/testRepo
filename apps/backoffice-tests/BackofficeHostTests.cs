using Microsoft.AspNetCore.Mvc.Testing;

namespace Backoffice.Tests;

public class BackofficeHostTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Host_starts_and_serves_requests()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/");

        Assert.NotNull(response);
    }
}
