// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { configureViewRoomClient, createViewRoomClient, type RoomDetail } from '../state/viewRoomStore';
import { RoomCard, formatDateTime, formatPrice } from './BrowseRoomsScreen';
import { ViewRoomDialog } from './ViewRoomDialog';

const rm204: RoomDetail = {
  roomId: 'RM-204',
  hotelId: 'HT-17',
  numberOfBeds: 2,
  availableFrom: '2026-10-01T14:00:00Z',
  availableTo: '2026-10-31T11:00:00Z',
  city: 'Porto',
  price: 129.95,
  description: 'Double room with a river view balcony',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  configureViewRoomClient(createViewRoomClient(fetchMock as unknown as typeof fetch));
});

afterEach(cleanup);

function renderCardAndDialog(room: Omit<RoomDetail, 'description'> = rm204) {
  render(
    <>
      <RoomCard room={room} />
      <ViewRoomDialog />
    </>,
  );
}

const openRoom = (roomId = 'RM-204') =>
  fireEvent.click(screen.getByRole('button', { name: `View details of room ${roomId}` }));

describe('ViewRoomDialog', () => {
  it('opening a room card loads GET /rooms/RM-204 through the state and shows every room field', async () => {
    let respond!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (respond = resolve)));
    renderCardAndDialog();

    openRoom();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/rooms/RM-204');
    const dialog = screen.getByRole('dialog', { name: 'Room RM-204' });
    expect(within(dialog).getByRole('status').textContent).toContain('Loading room details');

    respond(json({ room: rm204 }));

    const details = within(await within(dialog).findByLabelText('Room details'));
    expect(within(dialog).queryByRole('status')).toBeNull();
    details.getByText('RM-204');
    details.getByText('HT-17');
    details.getByText('2');
    details.getByText(formatDateTime(rm204.availableFrom));
    details.getByText(formatDateTime(rm204.availableTo));
    details.getByText('Porto');
    details.getByText(formatPrice(rm204.price));
    details.getByText('Double room with a river view balcony');
    for (const label of ['Room', 'Hotel', 'Beds', 'Available from', 'Available to', 'City', 'Price', 'Description']) {
      details.getByText(label);
    }
  });

  it('marks an empty contract description as unavailable', async () => {
    fetchMock.mockResolvedValueOnce(json({ room: { ...rm204, description: '' } }));
    renderCardAndDialog();

    openRoom();

    expect(await screen.findByText('No description available.')).toBeTruthy();
  });

  it('shows an accessible request error and retries through the state', async () => {
    fetchMock.mockResolvedValueOnce(new Response('upstream error', { status: 503 }));
    fetchMock.mockResolvedValueOnce(json({ room: rm204 }));
    renderCardAndDialog();

    openRoom();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Room details could not be loaded');
    expect(alert.textContent).not.toContain('503');
    expect(screen.queryByLabelText('Room details')).toBeNull();

    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toBe('/rooms/RM-204');
    expect(await screen.findByLabelText('Room details')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('closes the dialog', async () => {
    fetchMock.mockResolvedValueOnce(json({ room: rm204 }));
    renderCardAndDialog();
    openRoom();
    await screen.findByLabelText('Room details');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
