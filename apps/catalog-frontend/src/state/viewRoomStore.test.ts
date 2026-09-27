import { describe, expect, it, vi } from 'vitest';
import {
  VIEW_ROOM_ERROR_MESSAGE,
  createViewRoomClient,
  createViewRoomStore,
  selectIsViewRoomLoading,
  selectViewRoom,
  selectViewRoomError,
  type RoomDetail,
} from './viewRoomStore';

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

const rm205: RoomDetail = { ...rm204, roomId: 'RM-205', description: '' };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Store over the real HTTP client with a mocked fetch, so tests see the exact request URL. */
function storeWithFetch(fetchImpl: ReturnType<typeof vi.fn>) {
  return createViewRoomStore(createViewRoomClient(fetchImpl as unknown as typeof fetch));
}

describe('ViewRoom state', () => {
  it('starts with no room open', () => {
    const state = createViewRoomStore(vi.fn()).getState();
    expect(state.roomId).toBeNull();
    expect(state.status).toBe('idle');
    expect(state.room).toBeNull();
    expect(state.error).toBeNull();
  });

  it('opening RM-204 requests GET /rooms/RM-204 on the relative Catalog route and stores ViewRoomOutput.room', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ room: rm204 }));
    const store = storeWithFetch(fetchImpl);

    const open = store.getState().openRoom('RM-204');
    expect(selectIsViewRoomLoading(store.getState())).toBe(true);
    expect(store.getState().roomId).toBe('RM-204');
    await open;

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe('/rooms/RM-204');
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ headers: { Accept: 'application/json' } });
    const state = store.getState();
    expect(state.status).toBe('success');
    expect(selectViewRoom(state)).toEqual(rm204);
    expect(selectViewRoomError(state)).toBeNull();
  });

  it('URL-encodes the room identifier', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ room: rm204 }));
    const store = storeWithFetch(fetchImpl);

    await store.getState().openRoom('RM 204/a?b');

    expect(fetchImpl.mock.calls[0][0]).toBe('/rooms/RM%20204%2Fa%3Fb');
  });

  it.each([
    ['an HTTP error', () => jsonResponse({}, 500)],
    ['a body without room', () => jsonResponse({ rooms: [] })],
  ])('records a display-safe error for %s', async (_, response) => {
    const store = storeWithFetch(vi.fn().mockResolvedValue(response()));

    await store.getState().openRoom('RM-204');

    const state = store.getState();
    expect(state.status).toBe('error');
    expect(state.error).toBe(VIEW_ROOM_ERROR_MESSAGE);
    expect(state.room).toBeNull();
  });

  it('clears the previous room while a different room loads', async () => {
    const next = deferred<RoomDetail>();
    const client = vi.fn().mockResolvedValueOnce(rm204).mockReturnValueOnce(next.promise);
    const store = createViewRoomStore(client);
    await store.getState().openRoom('RM-204');

    const open = store.getState().openRoom('RM-205');

    expect(store.getState()).toMatchObject({ roomId: 'RM-205', status: 'loading', room: null, error: null });
    next.resolve(rm205);
    await open;
    expect(selectViewRoom(store.getState())).toEqual(rm205);
  });

  it('ignores a slower earlier response and aborts its request', async () => {
    const slow = deferred<RoomDetail>();
    const signals: AbortSignal[] = [];
    const client = vi.fn((roomId: string, signal?: AbortSignal) => {
      signals.push(signal!);
      return roomId === 'RM-204' ? slow.promise : Promise.resolve(rm205);
    });
    const store = createViewRoomStore(client);

    const first = store.getState().openRoom('RM-204');
    await store.getState().openRoom('RM-205');
    slow.resolve(rm204);
    await first;

    expect(signals[0].aborted).toBe(true);
    expect(store.getState()).toMatchObject({ roomId: 'RM-205', status: 'success', room: rm205 });
  });

  it('ignores a failure of a superseded request', async () => {
    let rejectFirst!: (reason: unknown) => void;
    const client = vi
      .fn()
      .mockReturnValueOnce(new Promise<RoomDetail>((_, reject) => (rejectFirst = reject)))
      .mockResolvedValueOnce(rm205);
    const store = createViewRoomStore(client);

    const first = store.getState().openRoom('RM-204');
    await store.getState().openRoom('RM-205');
    rejectFirst(new Error('aborted'));
    await first;

    expect(store.getState()).toMatchObject({ status: 'success', room: rm205, error: null });
  });

  it('closing cancels the pending request and returns to no room open', async () => {
    const pending = deferred<RoomDetail>();
    const store = createViewRoomStore(vi.fn().mockReturnValue(pending.promise));

    const open = store.getState().openRoom('RM-204');
    store.getState().closeRoom();
    pending.resolve(rm204);
    await open;

    expect(store.getState()).toMatchObject({ roomId: null, status: 'idle', room: null, error: null });
  });
});
