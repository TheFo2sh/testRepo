using System.Net;
using System.Net.Http.Json;
using Backoffice.Features.UpdateHotelInfo;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Backoffice.Tests;

public class UpdateHotelInfoRoutingTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public void Use_case_is_registered()
    {
        using var scope = factory.Services.CreateScope();

        Assert.NotNull(scope.ServiceProvider.GetService<UpdateHotelInfoUseCase>());
    }

    [Fact]
    public async Task Contract_route_is_mapped_without_api_prefix()
    {
        using var client = factory.CreateClient();

        using var contractRoute = await client.PutAsJsonAsync("/hotel-infos/H-101", new { city = "Lisbon" });
        using var defaultRoute = await client.PutAsJsonAsync("/api/update-hotel-info", new { city = "Lisbon" });

        Assert.NotEqual(HttpStatusCode.NotFound, contractRoute.StatusCode);
        Assert.NotEqual(HttpStatusCode.MethodNotAllowed, contractRoute.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, defaultRoute.StatusCode);
    }
}
