import { describe, expect, it, vi } from 'vitest';
import { createCatalogClient, joinUrl } from './catalogClient';
import { createConfiguredCatalogClient } from './catalogApi';

const validBody = {
  rooms: {
    results: [
      {
        roomId: 'room-1',
        hotelId: 'hotel-1',
        numberOfBeds: 2,
        availableFrom: '2026-10-01T00:00:00Z',
        availableTo: '2026-10-15T00:00:00Z',
        city: 'Berlin',
        price: 129.99,
      },
    ],
    total: 1,
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('joinUrl', () => {
  it.each([
    ['http://api.test', 'http://api.test/rooms'],
    ['http://api.test/', 'http://api.test/rooms'],
    ['http://api.test/catalog', 'http://api.test/catalog/rooms'],
    ['http://api.test/catalog//', 'http://api.test/catalog/rooms'],
  ])('joins %s with /rooms', (base, expected) => {
    expect(joinUrl(base, '/rooms')).toBe(expected);
    expect(joinUrl(base, 'rooms')).toBe(expected);
  });
});

describe('createCatalogClient.browseRooms', () => {
  it('issues a single GET to {baseUrl}/rooms and maps rooms.results and rooms.total', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(validBody));
    const client = createCatalogClient({ baseUrl: 'http://api.test/', fetch: fetchMock });

    const result = await client.browseRooms();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test/rooms');
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual({ Accept: 'application/json' });
    expect(result).toEqual({ ok: true, data: validBody });
  });

  it('keeps an optional rooms.query string', async () => {
    const body = { rooms: { ...validBody.rooms, query: 'Berlin' } };
    const client = createCatalogClient({ baseUrl: 'http://api.test', fetch: async () => jsonResponse(body) });

    expect(await client.browseRooms()).toEqual({ ok: true, data: body });
  });

  it('maps an empty catalog', async () => {
    const body = { rooms: { results: [], total: 0 } };
    const client = createCatalogClient({ baseUrl: 'http://api.test', fetch: async () => jsonResponse(body) });

    expect(await client.browseRooms()).toEqual({ ok: true, data: body });
  });

  it('surfaces a network failure as a safe client error', async () => {
    const client = createCatalogClient({
      baseUrl: 'http://api.test',
      fetch: async () => {
        throw new TypeError('Failed to fetch: secret internals');
      },
    });

    const result = await client.browseRooms();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('network');
      expect(result.error.message).not.toContain('secret');
      expect(result.error).not.toBeInstanceOf(Error);
    }
  });

  it.each([400, 404, 500, 503])('surfaces HTTP %i as a safe client error', async (status) => {
    const client = createCatalogClient({
      baseUrl: 'http://api.test',
      fetch: async () => jsonResponse({ detail: 'stack trace' }, status),
    });

    const result = await client.browseRooms();

    expect(result).toEqual({
      ok: false,
      error: { kind: 'http', status, message: expect.any(String) },
    });
    if (!result.ok) expect(result.error.message).not.toContain('stack trace');
  });

  it.each([
    ['non-JSON body', 'not json'],
    ['missing rooms', JSON.stringify({})],
    ['results not an array', JSON.stringify({ rooms: { results: {}, total: 0 } })],
    ['missing total', JSON.stringify({ rooms: { results: [] } })],
    ['non-integer total', JSON.stringify({ rooms: { results: [], total: 1.5 } })],
    ['room missing price', JSON.stringify({ rooms: { results: [{ ...validBody.rooms.results[0], price: undefined }], total: 1 } })],
    ['price as string', JSON.stringify({ rooms: { results: [{ ...validBody.rooms.results[0], price: '12' }], total: 1 } })],
    ['invalid date', JSON.stringify({ rooms: { results: [{ ...validBody.rooms.results[0], availableFrom: 'nope' }], total: 1 } })],
    ['non-string query', JSON.stringify({ rooms: { results: [], total: 0, query: 5 } })],
  ])('surfaces a malformed payload (%s) as a safe client error', async (_name, raw) => {
    const client = createCatalogClient({ baseUrl: 'http://api.test', fetch: async () => new Response(raw, { status: 200 }) });

    const result = await client.browseRooms();

    expect(result).toEqual({ ok: false, error: { kind: 'invalid-response', message: expect.any(String) } });
  });
});

describe('createConfiguredCatalogClient', () => {
  it('reads the Catalog base URL from appsettings.json and calls {baseUrl}/rooms', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
      String(input) === '/appsettings.json'
        ? jsonResponse({ CatalogApi: { BaseUrl: 'http://configured.test:5086/' } })
        : jsonResponse(validBody),
    );

    const client = await createConfiguredCatalogClient(fetchMock as typeof fetch);
    const result = await client.browseRooms();

    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      '/appsettings.json',
      'http://configured.test:5086/rooms',
    ]);
    expect(result.ok).toBe(true);
  });

  it('rejects appsettings without a CatalogApi.BaseUrl', async () => {
    await expect(createConfiguredCatalogClient(async () => jsonResponse({}))).rejects.toThrow('CatalogApi.BaseUrl');
  });
});
