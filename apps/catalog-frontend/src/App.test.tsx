// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { createCatalogBrowseRoomsClient } from './api/catalogClient';
import { configureBrowseRoomsClient } from './state/browseRoomsStore';
import { formatDateTime, formatPrice } from './ui/BrowseRoomsScreen';

const CATALOG_URL = 'http://catalog.test/';

/** Contract-valid `BrowseRoomsOutput` bodies for `GET /rooms`. */
const populatedBody = {
  rooms: {
    results: [
      {
        roomId: '6650f1a2b3c4d5e6f7a8b901',
        hotelId: 'hotel-lisbon-01',
        numberOfBeds: 2,
        availableFrom: '2026-10-01T14:00:00Z',
        availableTo: '2026-10-08T11:00:00Z',
        city: 'Lisbon',
        price: 149.99,
      },
      {
        roomId: '6650f1a2b3c4d5e6f7a8b902',
        hotelId: 'hotel-porto-07',
        numberOfBeds: 1,
        availableFrom: '2026-12-20T14:00:00Z',
        availableTo: '2027-01-02T11:00:00Z',
        city: 'Porto',
        price: 72.5,
      },
      {
        roomId: '6650f1a2b3c4d5e6f7a8b903',
        hotelId: 'hotel-faro-03',
        numberOfBeds: 4,
        availableFrom: '2027-03-01T14:00:00Z',
        availableTo: '2027-03-15T11:00:00Z',
        city: 'Faro',
        price: 210,
      },
    ],
    total: 3,
  },
};

const emptyBody = { rooms: { results: [], total: 0 } };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  configureBrowseRoomsClient(createCatalogBrowseRoomsClient(CATALOG_URL));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const roomRequests = () => fetchMock.mock.calls.filter(([url]) => url === 'http://catalog.test/rooms');

describe('Browse Rooms journey', () => {
  it('shows loading, then the returned total and rooms from GET /rooms', async () => {
    let respond!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (respond = resolve)));

    render(<App />);

    expect(screen.getByRole('status').textContent).toContain('Loading rooms');
    expect(roomRequests()).toHaveLength(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ headers: { Accept: 'application/json' } });

    respond(json(populatedBody));

    expect(await screen.findByText('3 rooms')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    const items = within(screen.getByRole('list', { name: 'Rooms' })).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    populatedBody.rooms.results.forEach((room, index) => {
      const card = within(items[index]);
      card.getByRole('heading', { name: `Room ${room.roomId}` });
      card.getByText(room.hotelId);
      card.getByText(room.city);
      card.getByText(formatPrice(room.price));
      card.getByText(String(room.numberOfBeds));
      card.getByText(formatDateTime(room.availableFrom));
      card.getByText(formatDateTime(room.availableTo));
    });
  });

  it('shows an empty state, not an error, for a successful response with total 0', async () => {
    fetchMock.mockResolvedValueOnce(json(emptyBody));

    render(<App />);

    expect(await screen.findByText('No rooms are available right now.')).toBeTruthy();
    expect(screen.getByText('0 rooms')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.queryByText(/could not be loaded/)).toBeNull();
  });

  it('shows failure feedback without rooms and retries with a new GET /rooms request', async () => {
    fetchMock.mockResolvedValueOnce(new Response('upstream error', { status: 503 }));
    fetchMock.mockResolvedValueOnce(json(populatedBody));

    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Rooms could not be loaded');
    expect(alert.textContent).not.toContain('503');
    expect(screen.queryByRole('list', { name: 'Rooms' })).toBeNull();
    expect(screen.queryByText(/\d+ rooms?$/)).toBeNull();

    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(roomRequests()).toHaveLength(2));
    expect(await screen.findByText('3 rooms')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('treats a network error as a request failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    render(<App />);

    expect((await screen.findByRole('alert')).textContent).toContain('Rooms could not be loaded');
    expect(screen.queryByText('No rooms are available right now.')).toBeNull();
  });
});
