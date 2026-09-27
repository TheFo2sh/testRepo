// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { configureSearchRoomsClient, createSearchRoomsClient } from '../state/searchRoomsStore';
import { formatDateTime, formatPrice } from './BrowseRoomsScreen';
import { SearchRoomsScreen, toIsoDateTime } from './SearchRoomsScreen';

/** Contract-valid `SearchRoomsOutput` bodies for `GET /rooms/search`. */
const seaViewBody = {
  rooms: {
    results: [
      {
        roomId: 'room-1',
        hotelId: 'hotel-5',
        numberOfBeds: 2,
        availableFrom: '2026-10-01T00:00:00Z',
        availableTo: '2026-10-15T00:00:00Z',
        city: 'Berlin',
        price: 150,
        description: 'Suite with a Sea View balcony',
      },
      {
        roomId: 'room-3',
        hotelId: 'hotel-4',
        numberOfBeds: 1,
        availableFrom: '2026-11-01T00:00:00Z',
        availableTo: '2026-11-30T00:00:00Z',
        city: 'Berlin',
        price: 100,
        description: 'Quiet room with a sea view terrace',
      },
    ],
    total: 2,
    query: { text: 'sea view' },
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

const requestedParams = (call = -1) => {
  const calls = fetchMock.mock.calls;
  const url = new URL(calls.at(call)![0] as string, 'http://frontend.test');
  expect(url.pathname).toBe('/rooms/search');
  return Object.fromEntries(url.searchParams);
};

beforeEach(() => {
  fetchMock = vi.fn();
  configureSearchRoomsClient(createSearchRoomsClient(fetchMock as unknown as typeof fetch));
});

afterEach(cleanup);

describe('SearchRoomsScreen', () => {
  it('searches "sea view" through the store and shows the API-filtered rooms and total', async () => {
    fetchMock.mockResolvedValue(json(seaViewBody));
    render(<SearchRoomsScreen />);
    expect(screen.getByText('Enter search criteria to find rooms.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Search text'), { target: { value: 'sea view' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByRole('status').textContent).toContain('Searching rooms');
    expect(await screen.findByText('2 rooms found')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestedParams()).toEqual({ text: 'sea view' });

    const items = within(screen.getByRole('list', { name: 'Search results' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    seaViewBody.rooms.results.forEach((room, index) => {
      const card = within(items[index]);
      card.getByRole('heading', { name: `Room ${room.roomId}` });
      card.getByText(room.hotelId);
      card.getByText(String(room.numberOfBeds));
      card.getByText(formatDateTime(room.availableFrom));
      card.getByText(formatDateTime(room.availableTo));
      card.getByText(room.city);
      card.getByText(formatPrice(room.price));
      card.getByText(room.description);
    });

    // A debounced text search must not fire again after the explicit submit.
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('runs a debounced search while typing without pressing Search', async () => {
    fetchMock.mockResolvedValue(json(seaViewBody));
    render(<SearchRoomsScreen />);

    fireEvent.change(screen.getByLabelText('Search text'), { target: { value: 'sea' } });
    fireEvent.change(screen.getByLabelText('Search text'), { target: { value: 'sea view' } });

    expect(await screen.findByText('2 rooms found')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestedParams()).toEqual({ text: 'sea view' });
  });

  it('sends every filter control value through the store as a contract query parameter', async () => {
    fetchMock.mockImplementation(async () => json({ rooms: { results: [], total: 0, query: { text: '' } } }));
    render(<SearchRoomsScreen />);

    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Berlin' } });
    fireEvent.change(screen.getByLabelText('Start at'), { target: { value: '2026-10-06T12:30' } });
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: 'P3D' } });
    fireEvent.change(screen.getByLabelText('Min price'), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText('Max price'), { target: { value: '150' } });
    fireEvent.mouseDown(screen.getByLabelText('Minimum stars'));
    fireEvent.click(await screen.findByRole('option', { name: '4+' }));

    await waitFor(() =>
      expect(requestedParams()).toEqual({
        city: 'Berlin',
        startAt: toIsoDateTime('2026-10-06T12:30'),
        duration: 'P3D',
        minPrice: '80',
        maxPrice: '150',
        minStars: '4',
      }),
    );
    expect(await screen.findByText('No rooms match your search.')).toBeTruthy();
    expect(screen.getByText('0 rooms found')).toBeTruthy();
  });

  it('does not send an incomplete duration and flags it', async () => {
    fetchMock.mockImplementation(async () => json({ rooms: { results: [], total: 0 } }));
    render(<SearchRoomsScreen />);

    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: 'P' } });

    expect(screen.getByText('Use an ISO-8601 duration such as P3D.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the returned rooms without filtering them again on the client', async () => {
    // The API is authoritative: rooms it returns are shown even if they don't look like a local match.
    fetchMock.mockResolvedValue(json(seaViewBody));
    render(<SearchRoomsScreen />);

    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Cairo' } });

    expect(await screen.findByText('2 rooms found')).toBeTruthy();
    expect(screen.getAllByText('Berlin')).toHaveLength(2);
  });

  it('shows an error with a retry that repeats the search', async () => {
    fetchMock.mockResolvedValueOnce(json({ title: 'boom' }, 500)).mockResolvedValueOnce(json(seaViewBody));
    render(<SearchRoomsScreen />);

    fireEvent.change(screen.getByLabelText('Search text'), { target: { value: 'sea view' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Rooms could not be searched');
    expect(screen.queryByRole('list', { name: 'Search results' })).toBeNull();

    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('2 rooms found')).toBeTruthy();
    expect(requestedParams()).toEqual({ text: 'sea view' });
  });
});
