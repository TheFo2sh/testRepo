using Catalog.Features.BrowseRooms;
using Catalog.Features.SearchRooms;
using Catalog.Infrastructure;
using FastEndpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddFastEndpoints();
builder.Services.AddMainDatabase();
builder.Services.AddScoped<IRoomsReadModel, MongoRoomsReadModel>();
builder.Services.AddScoped<BrowseRoomsUseCase>();
builder.Services.AddScoped<SearchRoomsUseCase>();

var app = builder.Build();

app.UseFastEndpoints();

app.Run();

public partial class Program;
