// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { configureBrowseRoomsClient, type Rooms } from '../state/browseRoomsStore';
import { BrowseRoomsScreen, formatDateTime, formatPrice } from './BrowseRoomsScreen';

const rooms: Rooms = {
  results: [
    {
      roomId: 'room-1',
      hotelId: 'hotel-a',
      numberOfBeds: 2,
      availableFrom: '2026-10-01T12:00:00Z',
      availableTo: '2026-10-10T10:00:00Z',
      city: 'Lisbon',
      price: 129.5,
    },
    {
      roomId: 'room-2',
      hotelId: 'hotel-b',
      numberOfBeds: 3,
      availableFrom: '2026-11-01T12:00:00Z',
      availableTo: '2026-11-05T10:00:00Z',
      city: 'Porto',
      price: 80,
    },
  ],
  total: 2,
};

afterEach(cleanup);

describe('BrowseRoomsScreen', () => {
  it('loads on entry and shows a loading indicator until the request resolves', async () => {
    let resolve!: (value: Rooms) => void;
    const client = vi.fn(() => new Promise<Rooms>((res) => (resolve = res)));
    configureBrowseRoomsClient(client);

    render(<BrowseRoomsScreen />);

    expect(client).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toContain('Loading rooms');
    resolve(rooms);
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('shows the total and every returned room with its fields', async () => {
    configureBrowseRoomsClient(vi.fn().mockResolvedValue(rooms));
    render(<BrowseRoomsScreen />);

    expect(await screen.findByText('2 rooms')).toBeTruthy();
    const items = within(screen.getByRole('list', { name: 'Rooms' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    rooms.results.forEach((room, index) => {
      const card = within(items[index]);
      card.getByRole('heading', { name: `Room ${room.roomId}` });
      card.getByText(room.hotelId);
      card.getByText(room.city);
      card.getByText(formatPrice(room.price));
      card.getByText(String(room.numberOfBeds));
      card.getByText(formatDateTime(room.availableFrom));
      card.getByText(formatDateTime(room.availableTo));
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders an empty state, not an error, for a successful empty response', async () => {
    configureBrowseRoomsClient(vi.fn().mockResolvedValue({ results: [], total: 0 }));
    render(<BrowseRoomsScreen />);

    expect(await screen.findByText('No rooms are available right now.')).toBeTruthy();
    expect(screen.getByText('0 rooms')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.queryByRole('list', { name: 'Rooms' })).toBeNull();
  });

  it('renders an error with a retry control that starts a new request', async () => {
    const client = vi.fn().mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce(rooms);
    configureBrowseRoomsClient(client);
    render(<BrowseRoomsScreen />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Rooms could not be loaded');
    expect(screen.queryByRole('list', { name: 'Rooms' })).toBeNull();

    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(client).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('2 rooms')).toBeTruthy();
  });
});
