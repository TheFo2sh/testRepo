// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createUpdateHotelInfoClient, type HotelInfo } from '../api/backofficeClient';
import { configureUpdateHotelInfoClient } from '../state/updateHotelInfoStore';
import { UpdateHotelInfoScreen } from './UpdateHotelInfoScreen';

const h101: HotelInfo = {
  hotelId: 'H-101',
  city: 'Amsterdam',
  stars: 4,
  description: 'Canal-side boutique hotel',
  rooms: [
    { roomId: 'R-1', numberOfBeds: 2, price: 120, description: 'Double room' },
    { roomId: 'R-2', numberOfBeds: 1, price: 80, description: 'Single room' },
  ],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  configureUpdateHotelInfoClient(createUpdateHotelInfoClient('', fetchMock as unknown as typeof fetch));
});

afterEach(cleanup);

function fillAndSubmit(hotelId: string, city: string) {
  fireEvent.change(screen.getByLabelText(/Hotel ID/), { target: { value: hotelId } });
  fireEvent.change(screen.getByLabelText('City'), { target: { value: city } });
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
}

describe('UpdateHotelInfoScreen', () => {
  it('submits PUT /hotel-infos/H-101 with the city and shows the returned HotelInfo', async () => {
    let respond!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (respond = resolve)));
    render(<UpdateHotelInfoScreen />);

    fillAndSubmit('H-101', 'Amsterdam');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/hotel-infos/H-101');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ city: 'Amsterdam' });

    // Pending: the update action cannot be submitted twice.
    const pending = screen.getByRole('button', { name: 'Updating…' }) as HTMLButtonElement;
    expect(pending.disabled).toBe(true);
    fireEvent.submit(screen.getByRole('form', { name: 'Update hotel info' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    respond(json({ hotelInfo: h101 }));

    const result = within(await screen.findByLabelText('Updated hotel info'));
    result.getByText('Hotel H-101 updated.');
    result.getByText('City: Amsterdam');
    result.getByText('Stars: 4');
    result.getByText('Canal-side boutique hotel');
    const rooms = within(result.getByRole('list', { name: 'Rooms' }));
    rooms.getByText('R-1');
    rooms.getByText('R-2');
  });

  it('shows the 422 reason for a blank city, keeps the entered values and reports no success', async () => {
    fetchMock.mockResolvedValueOnce(json({ hotelId: 'H-101', reason: 'city is required' }, 422));
    render(<UpdateHotelInfoScreen />);

    fillAndSubmit('H-101', '');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ city: '' });
    expect(await screen.findByText('city is required')).toBeTruthy();
    expect(screen.queryByLabelText('Updated hotel info')).toBeNull();
    expect(screen.queryByText(/updated\./)).toBeNull();
    expect((screen.getByLabelText(/Hotel ID/) as HTMLInputElement).value).toBe('H-101');
    expect((screen.getByLabelText('City') as HTMLInputElement).getAttribute('aria-invalid')).toBe('true');
  });

  it('shows a request failure without reporting success', async () => {
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }));
    render(<UpdateHotelInfoScreen />);

    fillAndSubmit('H-101', 'Amsterdam');

    expect((await screen.findByRole('alert')).textContent).toContain('could not be updated');
    expect(screen.queryByLabelText('Updated hotel info')).toBeNull();
  });
});
