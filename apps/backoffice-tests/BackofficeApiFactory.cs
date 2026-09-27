using System.Collections.Concurrent;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Backoffice.Tests;

/// <summary>
/// Hosts Backoffice against an isolated, throwaway MongoDB database so tests never touch MainDatabase data,
/// and captures log entries so recorded application events can be asserted.
/// The server defaults to a local MongoDB; override with BACKOFFICE_TEST_MONGO_URL.
/// </summary>
public sealed class BackofficeApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private static readonly string ServerUrl =
        Environment.GetEnvironmentVariable("BACKOFFICE_TEST_MONGO_URL") ?? "mongodb://localhost:27017";

    public string DatabaseName { get; } = $"backoffice_tests_{Guid.NewGuid():N}";

    public IMongoDatabase Database => Services.GetRequiredService<IMongoDatabase>();

    public CapturedLogs Logs { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:MainDatabase", $"{ServerUrl.TrimEnd('/')}/{DatabaseName}");
        builder.ConfigureLogging(logging => logging.AddProvider(Logs));
    }

    public Task InitializeAsync() => Task.CompletedTask;

    public new async Task DisposeAsync()
    {
        await Services.GetRequiredService<IMongoClient>().DropDatabaseAsync(DatabaseName);
        await base.DisposeAsync();
    }
}

public sealed record CapturedLog(string Category, EventId EventId, IReadOnlyDictionary<string, object?> State);

public sealed class CapturedLogs : ILoggerProvider
{
    private readonly ConcurrentQueue<CapturedLog> _entries = new();

    public IReadOnlyCollection<CapturedLog> Entries => _entries.ToArray();

    public ILogger CreateLogger(string categoryName) => new Logger(categoryName, _entries);

    public void Dispose()
    {
    }

    private sealed class Logger(string category, ConcurrentQueue<CapturedLog> entries) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            var values = state as IEnumerable<KeyValuePair<string, object?>> ?? [];
            entries.Enqueue(new CapturedLog(category, eventId, values.ToDictionary(pair => pair.Key, pair => pair.Value)));
        }
    }
}
