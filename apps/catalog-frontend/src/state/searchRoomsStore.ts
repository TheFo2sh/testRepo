import { createStore, useStore } from 'zustand';
import type { StoreApi } from 'zustand';
import type { Room } from './browseRoomsStore';

/** One `Rooms.results` item of the Catalog `GET /rooms/search` (SearchRooms) contract. */
export interface SearchRoom extends Room {
  description: string;
}

/** The seven optional SearchRooms query parameters, named as in the contract. */
export interface SearchRoomsCriteria {
  text?: string;
  /** ISO-8601 date-time, e.g. `2026-10-06T00:00:00Z`. */
  startAt?: string;
  /** ISO-8601 duration, e.g. `P3D`. */
  duration?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minStars?: number;
}

/** `SearchRoomsOutput.rooms.query`: the applied criteria echoed by Catalog; `text` is always present. */
export type SearchRoomsQuery = SearchRoomsCriteria & { text: string };

/** `SearchRoomsOutput.rooms` of the Catalog `GET /rooms/search` contract. */
export interface SearchRoomsResult {
  results: SearchRoom[];
  total: number;
  query?: SearchRoomsQuery;
}

/** Calls Catalog `GET /rooms/search` with serialized criteria. */
export type SearchRoomsClient = (params: URLSearchParams, signal?: AbortSignal) => Promise<SearchRoomsResult>;

export type SearchRoomsStatus = 'idle' | 'loading' | 'success' | 'error';

export const SEARCH_ROOMS_ERROR_MESSAGE = 'Rooms could not be searched. Please try again.';
export const SEARCH_TEXT_DEBOUNCE_MS = 300;

const CRITERIA_KEYS = ['text', 'startAt', 'duration', 'city', 'minPrice', 'maxPrice', 'minStars'] as const;

/** Serializes only populated criteria, keeping the contract's parameter names. */
export function serializeSearchCriteria(criteria: SearchRoomsCriteria): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of CRITERIA_KEYS) {
    const value = criteria[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'number') {
      if (Number.isFinite(value)) params.set(key, String(value));
      continue;
    }
    const trimmed = value.trim();
    if (trimmed !== '') params.set(key, trimmed);
  }
  return params;
}

/** Catalog `GET /rooms/search` client over the relative route, so the Frontend→Catalog routing supplies the host. */
export function createSearchRoomsClient(fetchImpl: typeof fetch = (...args) => fetch(...args)): SearchRoomsClient {
  return async (params, signal) => {
    const query = params.toString();
    const response = await fetchImpl(query ? `/rooms/search?${query}` : '/rooms/search', {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!response.ok) throw new Error(`GET /rooms/search failed: HTTP ${response.status}`);
    const body = (await response.json()) as { rooms?: SearchRoomsResult };
    if (!body?.rooms || !Array.isArray(body.rooms.results)) {
      throw new Error('GET /rooms/search returned an unexpected body');
    }
    return body.rooms;
  };
}

export interface SearchRoomsState {
  /** Criteria as currently entered. */
  criteria: SearchRoomsCriteria;
  status: SearchRoomsStatus;
  /** API-returned rooms; only set while `status` is `success`. */
  rooms: SearchRoomsResult | null;
  /** Criteria of the request whose outcome is shown (or is loading). */
  appliedQuery: SearchRoomsCriteria | null;
  /** Display-safe error message; only set while `status` is `error`. */
  error: string | null;
  /** Updates the entered text and searches after a 300 ms pause in typing. */
  setText: (text: string) => void;
  /** Updates non-text criteria and searches immediately. */
  setCriteria: (criteria: Partial<SearchRoomsCriteria>) => void;
  /** Runs the search for the current criteria immediately, cancelling any pending debounce. */
  search: () => Promise<void>;
}

export type SearchRoomsStore = StoreApi<SearchRoomsState>;

export function createSearchRoomsStore(
  client: SearchRoomsClient = createSearchRoomsClient(),
  debounceMs = SEARCH_TEXT_DEBOUNCE_MS,
): SearchRoomsStore {
  let latestRequest = 0;
  let inFlight: AbortController | null = null;
  let debounce: ReturnType<typeof setTimeout> | null = null;

  const cancelDebounce = () => {
    if (debounce !== null) clearTimeout(debounce);
    debounce = null;
  };

  return createStore<SearchRoomsState>()((set, get) => ({
    criteria: {},
    status: 'idle',
    rooms: null,
    appliedQuery: null,
    error: null,
    setText: (text) => {
      set({ criteria: { ...get().criteria, text } });
      cancelDebounce();
      debounce = setTimeout(() => {
        debounce = null;
        void get().search();
      }, debounceMs);
    },
    setCriteria: (criteria) => {
      set({ criteria: { ...get().criteria, ...criteria } });
      void get().search();
    },
    search: async () => {
      cancelDebounce();
      const request = ++latestRequest;
      inFlight?.abort();
      const controller = new AbortController();
      inFlight = controller;

      const applied = { ...get().criteria };
      set({ status: 'loading', rooms: null, appliedQuery: applied, error: null });

      try {
        const rooms = await client(serializeSearchCriteria(applied), controller.signal);
        if (request !== latestRequest) return;
        set({
          status: 'success',
          rooms: { ...rooms, results: rooms.results ?? [], total: rooms.total ?? 0 },
          error: null,
        });
      } catch {
        if (request !== latestRequest) return;
        set({ status: 'error', rooms: null, error: SEARCH_ROOMS_ERROR_MESSAGE });
      } finally {
        if (inFlight === controller) inFlight = null;
      }
    },
  }));
}

let searchRoomsStore = createSearchRoomsStore();

/** Replaces the application-wide store, e.g. to inject a client in tests. */
export function configureSearchRoomsClient(client: SearchRoomsClient): SearchRoomsStore {
  searchRoomsStore = createSearchRoomsStore(client);
  return searchRoomsStore;
}

export function getSearchRoomsStore(): SearchRoomsStore {
  return searchRoomsStore;
}

const EMPTY_RESULTS: SearchRoom[] = [];

export const selectSearchStatus = (state: SearchRoomsState) => state.status;
export const selectIsSearchLoading = (state: SearchRoomsState) => state.status === 'loading';
export const selectSearchResults = (state: SearchRoomsState) => state.rooms?.results ?? EMPTY_RESULTS;
export const selectSearchTotal = (state: SearchRoomsState) => state.rooms?.total ?? null;
export const selectSearchAppliedQuery = (state: SearchRoomsState) => state.appliedQuery;
export const selectIsSearchEmpty = (state: SearchRoomsState) =>
  state.status === 'success' && (state.rooms?.results.length ?? 0) === 0;
export const selectSearchError = (state: SearchRoomsState) => state.error;
export const selectSearchCriteria = (state: SearchRoomsState) => state.criteria;

/** React hook over the application-wide SearchRooms store. */
export function useSearchRoomsStore<T>(selector: (state: SearchRoomsState) => T): T {
  return useStore(searchRoomsStore, selector);
}
