using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace Catalog.Infrastructure;

public sealed class MainDatabaseOptions
{
    public const string ConnectionStringName = "MainDatabase";

    public string? ConnectionString { get; set; }
}

public static class MainDatabaseServiceCollectionExtensions
{
    /// <summary>
    /// Registers the MongoDB client and database for MainDatabase, bound from
    /// <c>ConnectionStrings:MainDatabase</c>. Startup fails if it is absent or names no database.
    /// </summary>
    public static IServiceCollection AddMainDatabase(this IServiceCollection services)
    {
        services.AddOptions<MainDatabaseOptions>()
            .Configure<IConfiguration>((options, configuration) =>
                options.ConnectionString = configuration.GetConnectionString(MainDatabaseOptions.ConnectionStringName))
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.ConnectionString),
                $"ConnectionStrings:{MainDatabaseOptions.ConnectionStringName} is required.")
            .Validate(
                options => string.IsNullOrWhiteSpace(options.ConnectionString)
                    || !string.IsNullOrWhiteSpace(MongoUrl.Create(options.ConnectionString).DatabaseName),
                $"ConnectionStrings:{MainDatabaseOptions.ConnectionStringName} must name a database.")
            .ValidateOnStart();

        services.AddSingleton<IMongoClient>(sp =>
            new MongoClient(sp.GetRequiredService<IOptions<MainDatabaseOptions>>().Value.ConnectionString));

        services.AddSingleton(sp =>
        {
            var url = MongoUrl.Create(sp.GetRequiredService<IOptions<MainDatabaseOptions>>().Value.ConnectionString);
            return sp.GetRequiredService<IMongoClient>().GetDatabase(url.DatabaseName);
        });

        return services;
    }
}
