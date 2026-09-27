import { describe, expect, it, vi } from 'vitest';
import { createUpdateHotelInfoClient } from './backofficeClient';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('createUpdateHotelInfoClient', () => {
  it('URL-encodes the hotel ID under the configured base URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ hotelInfo: { hotelId: 'H/1', rooms: [], city: 'X', stars: 1, description: '' } }));
    const client = createUpdateHotelInfoClient('http://backoffice.test', fetchMock as unknown as typeof fetch);

    const result = await client('H/1', 'X');

    expect(fetchMock.mock.calls[0][0]).toBe('http://backoffice.test/hotel-infos/H%2F1');
    expect(result.kind).toBe('updated');
  });

  it('returns the 422 rejection reason', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ hotelId: 'H-101', reason: 'city is required' }, 422));
    const client = createUpdateHotelInfoClient('', fetchMock as unknown as typeof fetch);

    expect(await client('H-101', '')).toEqual({ kind: 'rejected', hotelId: 'H-101', reason: 'city is required' });
  });

  it('throws on other failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
    const client = createUpdateHotelInfoClient('', fetchMock as unknown as typeof fetch);

    await expect(client('H-404', 'X')).rejects.toThrow('HTTP 404');
  });
});
