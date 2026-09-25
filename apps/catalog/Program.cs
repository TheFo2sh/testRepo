using Catalog.Features.BrowseRooms;
using FastEndpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddFastEndpoints();
builder.Services.AddScoped<BrowseRoomsUseCase>();

var app = builder.Build();

app.UseFastEndpoints();

app.Run();

public partial class Program;
