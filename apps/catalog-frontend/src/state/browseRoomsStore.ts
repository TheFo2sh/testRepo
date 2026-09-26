import { createStore, useStore } from 'zustand';
import type { StoreApi } from 'zustand';

/** One `Rooms.results` item of the Catalog `GET /rooms` (BrowseRooms) contract. */
export interface Room {
  roomId: string;
  hotelId: string;
  numberOfBeds: number;
  availableFrom: string;
  availableTo: string;
  city: string;
  price: number;
}

/** `BrowseRoomsOutput.rooms` of the Catalog `GET /rooms` contract. */
export interface Rooms {
  results: Room[];
  total: number;
  query?: string | null;
}

/** Fetches the Catalog `GET /rooms` result. Supplied by the configured Catalog API client. */
export type BrowseRoomsClient = (signal?: AbortSignal) => Promise<Rooms>;

export type BrowseRoomsStatus = 'idle' | 'loading' | 'success' | 'error';

export const BROWSE_ROOMS_ERROR_MESSAGE = 'Rooms could not be loaded. Please try again.';

export interface BrowseRoomsState {
  status: BrowseRoomsStatus;
  /** API-returned rooms; only set while `status` is `success`. */
  rooms: Rooms | null;
  /** Display-safe error message; only set while `status` is `error`. */
  error: string | null;
  loadBrowseRooms: () => Promise<void>;
}

export type BrowseRoomsStore = StoreApi<BrowseRoomsState>;

export function createBrowseRoomsStore(client: BrowseRoomsClient): BrowseRoomsStore {
  let latestRequest = 0;
  let inFlight: AbortController | null = null;

  return createStore<BrowseRoomsState>()((set) => ({
    status: 'idle',
    rooms: null,
    error: null,
    loadBrowseRooms: async () => {
      const request = ++latestRequest;
      inFlight?.abort();
      const controller = new AbortController();
      inFlight = controller;

      set({ status: 'loading', rooms: null, error: null });

      try {
        const rooms = await client(controller.signal);
        if (request !== latestRequest) return;
        set({
          status: 'success',
          rooms: { ...rooms, results: rooms.results ?? [], total: rooms.total ?? 0 },
          error: null,
        });
      } catch {
        if (request !== latestRequest) return;
        set({ status: 'error', rooms: null, error: BROWSE_ROOMS_ERROR_MESSAGE });
      } finally {
        if (inFlight === controller) inFlight = null;
      }
    },
  }));
}

const unconfiguredClient: BrowseRoomsClient = () =>
  Promise.reject(new Error('The Catalog BrowseRooms client is not configured.'));

let browseRoomsStore = createBrowseRoomsStore(unconfiguredClient);

/** Binds the application-wide store to the configured Catalog `GET /rooms` client. */
export function configureBrowseRoomsClient(client: BrowseRoomsClient): BrowseRoomsStore {
  browseRoomsStore = createBrowseRoomsStore(client);
  return browseRoomsStore;
}

export function getBrowseRoomsStore(): BrowseRoomsStore {
  return browseRoomsStore;
}

const EMPTY_RESULTS: Room[] = [];

export const selectBrowseRoomsStatus = (state: BrowseRoomsState) => state.status;
export const selectIsBrowseRoomsLoading = (state: BrowseRoomsState) =>
  state.status === 'idle' || state.status === 'loading';
export const selectBrowseRoomsResults = (state: BrowseRoomsState) => state.rooms?.results ?? EMPTY_RESULTS;
export const selectBrowseRoomsTotal = (state: BrowseRoomsState) => state.rooms?.total ?? null;
export const selectIsBrowseRoomsEmpty = (state: BrowseRoomsState) =>
  state.status === 'success' && (state.rooms?.results.length ?? 0) === 0;
export const selectBrowseRoomsError = (state: BrowseRoomsState) => state.error;
export const selectLoadBrowseRooms = (state: BrowseRoomsState) => state.loadBrowseRooms;

/** React hook over the application-wide BrowseRooms store. */
export function useBrowseRoomsStore<T>(selector: (state: BrowseRoomsState) => T): T {
  return useStore(browseRoomsStore, selector);
}
