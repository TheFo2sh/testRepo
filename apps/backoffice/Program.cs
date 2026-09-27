using Backoffice.Features.UpdateHotelInfo;
using FastEndpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddFastEndpoints();
builder.Services.AddScoped<UpdateHotelInfoUseCase>();

var app = builder.Build();

app.UseFastEndpoints();

app.Run();

public partial class Program;
