import { describe, expect, it, vi } from 'vitest';
import {
  BROWSE_ROOMS_ERROR_MESSAGE,
  createBrowseRoomsStore,
  selectBrowseRoomsResults,
  selectBrowseRoomsTotal,
  selectIsBrowseRoomsEmpty,
  selectIsBrowseRoomsLoading,
  type Rooms,
} from './browseRoomsStore';

const populated: Rooms = {
  results: [
    {
      roomId: 'room-1',
      hotelId: 'hotel-1',
      numberOfBeds: 2,
      availableFrom: '2026-10-01T00:00:00Z',
      availableTo: '2026-10-10T00:00:00Z',
      city: 'Lisbon',
      price: 129.5,
    },
  ],
  total: 1,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('BrowseRooms state', () => {
  it('starts in the initial state before any load', () => {
    const store = createBrowseRoomsStore(vi.fn());
    const state = store.getState();
    expect(state.status).toBe('idle');
    expect(state.rooms).toBeNull();
    expect(state.error).toBeNull();
    expect(selectIsBrowseRoomsLoading(state)).toBe(true);
  });

  it('is loading while the GET /rooms client is pending', async () => {
    const pending = deferred<Rooms>();
    const store = createBrowseRoomsStore(() => pending.promise);
    const load = store.getState().loadBrowseRooms();
    expect(store.getState().status).toBe('loading');
    expect(store.getState().error).toBeNull();
    pending.resolve(populated);
    await load;
  });

  it('delegates to the client and stores the returned rooms and total', async () => {
    const client = vi.fn().mockResolvedValue(populated);
    const store = createBrowseRoomsStore(client);
    await store.getState().loadBrowseRooms();

    expect(client).toHaveBeenCalledTimes(1);
    const state = store.getState();
    expect(state.status).toBe('success');
    expect(selectBrowseRoomsResults(state)).toEqual(populated.results);
    expect(selectBrowseRoomsTotal(state)).toBe(1);
    expect(selectIsBrowseRoomsEmpty(state)).toBe(false);
  });

  it('keeps an empty successful result distinct from a failure', async () => {
    const store = createBrowseRoomsStore(vi.fn().mockResolvedValue({ results: [], total: 0 }));
    await store.getState().loadBrowseRooms();

    const state = store.getState();
    expect(state.status).toBe('success');
    expect(state.error).toBeNull();
    expect(selectBrowseRoomsResults(state)).toEqual([]);
    expect(selectBrowseRoomsTotal(state)).toBe(0);
    expect(selectIsBrowseRoomsEmpty(state)).toBe(true);
  });

  it('records a display-safe error without presenting stale rooms after a failed reload', async () => {
    const client = vi
      .fn()
      .mockResolvedValueOnce(populated)
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED 10.0.0.1:5086'));
    const store = createBrowseRoomsStore(client);
    await store.getState().loadBrowseRooms();
    await store.getState().loadBrowseRooms();

    const state = store.getState();
    expect(state.status).toBe('error');
    expect(state.error).toBe(BROWSE_ROOMS_ERROR_MESSAGE);
    expect(state.rooms).toBeNull();
    expect(selectBrowseRoomsResults(state)).toEqual([]);
    expect(selectBrowseRoomsTotal(state)).toBeNull();
    expect(selectIsBrowseRoomsEmpty(state)).toBe(false);
  });

  it('clears the previous error when a new load starts and ignores superseded responses', async () => {
    const first = deferred<Rooms>();
    const client = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ results: [], total: 0 });
    const store = createBrowseRoomsStore(client);
    await store.getState().loadBrowseRooms();
    expect(store.getState().status).toBe('error');

    const superseded = store.getState().loadBrowseRooms();
    expect(store.getState().error).toBeNull();
    await store.getState().loadBrowseRooms();
    first.resolve(populated);
    await superseded;

    expect(store.getState().status).toBe('success');
    expect(selectBrowseRoomsTotal(store.getState())).toBe(0);
  });
});
