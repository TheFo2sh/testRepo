using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;

namespace Catalog.Tests;

/// <summary>
/// Hosts Catalog against an isolated, throwaway MongoDB database so tests never touch MainDatabase data.
/// The server defaults to a local MongoDB; override with CATALOG_TEST_MONGO_URL.
/// </summary>
public sealed class CatalogApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private static readonly string ServerUrl =
        Environment.GetEnvironmentVariable("CATALOG_TEST_MONGO_URL") ?? "mongodb://localhost:27017";

    public string DatabaseName { get; } = $"catalog_tests_{Guid.NewGuid():N}";

    public IMongoDatabase Database => Services.GetRequiredService<IMongoDatabase>();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:MainDatabase", $"{ServerUrl.TrimEnd('/')}/{DatabaseName}");
    }

    public Task InitializeAsync() => Task.CompletedTask;

    public new async Task DisposeAsync()
    {
        await Services.GetRequiredService<IMongoClient>().DropDatabaseAsync(DatabaseName);
        await base.DisposeAsync();
    }
}
