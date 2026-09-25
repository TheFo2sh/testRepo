using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Options;

namespace Catalog.Tests;

public class CatalogHostTests(CatalogApiFactory factory) : IClassFixture<CatalogApiFactory>
{
    [Fact]
    public async Task Host_starts_and_serves_requests()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/");

        Assert.NotNull(response);
    }

    [Fact]
    public void Host_fails_clearly_without_main_database_connection_string()
    {
        using var unconfigured = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder => builder.UseSetting("ConnectionStrings:MainDatabase", ""));

        var error = Assert.Throws<OptionsValidationException>(() => unconfigured.CreateClient());

        Assert.Contains("ConnectionStrings:MainDatabase", error.Message);
    }
}
