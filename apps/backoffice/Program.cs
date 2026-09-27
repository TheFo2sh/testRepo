using Backoffice.Features.UpdateHotelInfo;
using Backoffice.Infrastructure;
using FastEndpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddFastEndpoints();
builder.Services.AddMainDatabase();
builder.Services.AddScoped<IHotelInfoStore, MongoHotelInfoStore>();
builder.Services.AddScoped<UpdateHotelInfoUseCase>();

var app = builder.Build();

app.UseFastEndpoints();

app.Run();

public partial class Program;
