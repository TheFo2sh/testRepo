using Catalog.Features.BrowseRooms;
using Catalog.Infrastructure;
using FastEndpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddFastEndpoints();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
    .WithMethods("GET")
    .AllowAnyHeader()));
builder.Services.AddMainDatabase();
builder.Services.AddScoped<IRoomsReadModel, MongoRoomsReadModel>();
builder.Services.AddScoped<BrowseRoomsUseCase>();

var app = builder.Build();

app.UseCors();
app.UseFastEndpoints();

app.Run();

public partial class Program;
