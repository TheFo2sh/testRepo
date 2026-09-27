import { createStore, useStore } from 'zustand';
import type { StoreApi } from 'zustand';

/** `Room` of the Catalog `GET /rooms/{roomId}` (ViewRoom) contract. */
export interface RoomDetail {
  roomId: string;
  hotelId: string;
  numberOfBeds: number;
  /** ISO-8601 date-time. */
  availableFrom: string;
  /** ISO-8601 date-time. */
  availableTo: string;
  city: string;
  price: number;
  description: string;
}

/** `ViewRoomOutput` of the Catalog `GET /rooms/{roomId}` contract. */
export interface ViewRoomOutput {
  room: RoomDetail;
}

/** Calls Catalog `GET /rooms/{roomId}` and returns `ViewRoomOutput.room`. */
export type ViewRoomClient = (roomId: string, signal?: AbortSignal) => Promise<RoomDetail>;

export type ViewRoomStatus = 'idle' | 'loading' | 'success' | 'error';

export const VIEW_ROOM_ERROR_MESSAGE = 'Room details could not be loaded. Please try again.';

/** Catalog `GET /rooms/{roomId}` client over the relative route, so the Frontend→Catalog routing supplies the host. */
export function createViewRoomClient(fetchImpl: typeof fetch = (...args) => fetch(...args)): ViewRoomClient {
  return async (roomId, signal) => {
    const response = await fetchImpl(`/rooms/${encodeURIComponent(roomId)}`, {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!response.ok) throw new Error(`GET /rooms/{roomId} failed: HTTP ${response.status}`);
    const body = (await response.json()) as Partial<ViewRoomOutput> | null;
    if (!body?.room || typeof body.room.roomId !== 'string') {
      throw new Error('GET /rooms/{roomId} returned an unexpected body');
    }
    return body.room;
  };
}

export interface ViewRoomState {
  /** Identifier of the most recently opened room; `null` when no room is open. */
  roomId: string | null;
  status: ViewRoomStatus;
  /** The opened room; only set while `status` is `success`. */
  room: RoomDetail | null;
  /** Display-safe error message; only set while `status` is `error`. */
  error: string | null;
  /** Opens a room and loads its details, replacing any previously opened room. */
  openRoom: (roomId: string) => Promise<void>;
  /** Closes the opened room and cancels its pending request. */
  closeRoom: () => void;
}

export type ViewRoomStore = StoreApi<ViewRoomState>;

export function createViewRoomStore(client: ViewRoomClient = createViewRoomClient()): ViewRoomStore {
  let latestRequest = 0;
  let inFlight: AbortController | null = null;

  const cancel = () => {
    latestRequest++;
    inFlight?.abort();
    inFlight = null;
  };

  return createStore<ViewRoomState>()((set) => ({
    roomId: null,
    status: 'idle',
    room: null,
    error: null,
    openRoom: async (roomId) => {
      cancel();
      const request = latestRequest;
      const controller = new AbortController();
      inFlight = controller;

      set({ roomId, status: 'loading', room: null, error: null });

      try {
        const room = await client(roomId, controller.signal);
        if (request !== latestRequest) return;
        set({ status: 'success', room, error: null });
      } catch {
        if (request !== latestRequest) return;
        set({ status: 'error', room: null, error: VIEW_ROOM_ERROR_MESSAGE });
      } finally {
        if (inFlight === controller) inFlight = null;
      }
    },
    closeRoom: () => {
      cancel();
      set({ roomId: null, status: 'idle', room: null, error: null });
    },
  }));
}

let viewRoomStore = createViewRoomStore();

/** Replaces the application-wide store, e.g. to inject a client in tests. */
export function configureViewRoomClient(client: ViewRoomClient): ViewRoomStore {
  viewRoomStore = createViewRoomStore(client);
  return viewRoomStore;
}

export function getViewRoomStore(): ViewRoomStore {
  return viewRoomStore;
}

export const selectViewRoomId = (state: ViewRoomState) => state.roomId;
export const selectViewRoomStatus = (state: ViewRoomState) => state.status;
export const selectIsViewRoomLoading = (state: ViewRoomState) => state.status === 'loading';
export const selectViewRoom = (state: ViewRoomState) => state.room;
export const selectViewRoomError = (state: ViewRoomState) => state.error;
export const selectOpenRoom = (state: ViewRoomState) => state.openRoom;
export const selectCloseRoom = (state: ViewRoomState) => state.closeRoom;

/** React hook over the application-wide ViewRoom store. */
export function useViewRoomStore<T>(selector: (state: ViewRoomState) => T): T {
  return useStore(viewRoomStore, selector);
}
