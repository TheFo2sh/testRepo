import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SEARCH_ROOMS_ERROR_MESSAGE,
  createSearchRoomsClient,
  createSearchRoomsStore,
  selectIsSearchEmpty,
  selectIsSearchLoading,
  selectSearchAppliedQuery,
  selectSearchResults,
  selectSearchTotal,
  serializeSearchCriteria,
  type SearchRoomsResult,
} from './searchRoomsStore';

const seaView: SearchRoomsResult = {
  results: [
    {
      roomId: 'room-1',
      hotelId: 'hotel-1',
      numberOfBeds: 2,
      availableFrom: '2026-10-01T00:00:00Z',
      availableTo: '2026-10-15T00:00:00Z',
      city: 'Berlin',
      price: 150,
      description: 'Suite with a sea view balcony',
    },
  ],
  total: 1,
  query: { text: 'sea view' },
};

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
  return createSearchRoomsStore(createSearchRoomsClient(fetchImpl as unknown as typeof fetch));
}

const requestedUrl = (fetchImpl: ReturnType<typeof vi.fn>, call = 0) => fetchImpl.mock.calls[call][0] as string;

afterEach(() => {
  vi.useRealTimers();
});

describe('SearchRooms state', () => {
  it('searches text=sea view against the relative /rooms/search route and exposes the response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ rooms: seaView }));
    const store = storeWithFetch(fetchImpl);

    store.getState().setCriteria({ text: 'sea view' });
    expect(selectIsSearchLoading(store.getState())).toBe(true);
    await vi.waitFor(() => expect(store.getState().status).toBe('success'));

    expect(requestedUrl(fetchImpl)).toBe('/rooms/search?text=sea+view');
    const state = store.getState();
    expect(new URL(requestedUrl(fetchImpl), 'http://x').searchParams.get('text')).toBe('sea view');
    expect(selectSearchResults(state)).toEqual(seaView.results);
    expect(selectSearchTotal(state)).toBe(1);
    expect(state.rooms?.query).toEqual({ text: 'sea view' });
    expect(selectSearchAppliedQuery(state)).toEqual({ text: 'sea view' });
    expect(state.error).toBeNull();
  });

  it('serializes every populated criterion with its contract name and skips empty ones', () => {
    const params = serializeSearchCriteria({
      text: '  sea view & pool ',
      startAt: '2026-10-06T00:00:00Z',
      duration: 'P3D',
      city: 'São Paulo',
      minPrice: 80,
      maxPrice: 150.5,
      minStars: 4,
    });

    expect(Object.fromEntries(params)).toEqual({
      text: 'sea view & pool',
      startAt: '2026-10-06T00:00:00Z',
      duration: 'P3D',
      city: 'São Paulo',
      minPrice: '80',
      maxPrice: '150.5',
      minStars: '4',
    });
    expect(params.toString()).toBe(
      'text=sea+view+%26+pool&startAt=2026-10-06T00%3A00%3A00Z&duration=P3D&city=S%C3%A3o+Paulo&minPrice=80&maxPrice=150.5&minStars=4',
    );
    expect(serializeSearchCriteria({ text: '  ', city: '', minPrice: Number.NaN }).toString()).toBe('');
  });

  it.each([
    [{ startAt: '2026-10-06T00:00:00Z' }, 'startAt', '2026-10-06T00:00:00Z'],
    [{ duration: 'P3D' }, 'duration', 'P3D'],
    [{ city: 'Berlin' }, 'city', 'Berlin'],
    [{ minPrice: 0 }, 'minPrice', '0'],
    [{ maxPrice: 150 }, 'maxPrice', '150'],
    [{ minStars: 5 }, 'minStars', '5'],
  ])('changing %o requests /rooms/search with %s', async (criteria, name, value) => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ rooms: { results: [], total: 0 } }));
    const store = storeWithFetch(fetchImpl);

    store.getState().setCriteria(criteria);
    await vi.waitFor(() => expect(store.getState().status).toBe('success'));

    const url = new URL(requestedUrl(fetchImpl), 'http://x');
    expect(url.pathname).toBe('/rooms/search');
    expect(Object.fromEntries(url.searchParams)).toEqual({ [name]: value });
  });

  it('accumulates criteria across changes into one multi-criterion request', async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => jsonResponse({ rooms: { results: [], total: 0 } }));
    const store = storeWithFetch(fetchImpl);

    store.getState().setCriteria({ city: 'Berlin', minStars: 4 });
    store.getState().setCriteria({ maxPrice: 150 });
    await vi.waitFor(() => expect(store.getState().status).toBe('success'));

    expect(requestedUrl(fetchImpl, 1)).toBe('/rooms/search?city=Berlin&maxPrice=150&minStars=4');
  });

  it('keeps an empty successful result distinct from a failure', async () => {
    const store = storeWithFetch(vi.fn().mockResolvedValue(jsonResponse({ rooms: { results: [], total: 0, query: { text: '' } } })));

    await store.getState().search();

    const state = store.getState();
    expect(state.status).toBe('success');
    expect(state.error).toBeNull();
    expect(selectSearchResults(state)).toEqual([]);
    expect(selectSearchTotal(state)).toBe(0);
    expect(selectIsSearchEmpty(state)).toBe(true);
  });

  it.each([
    ['an HTTP failure', () => Promise.resolve(jsonResponse({ title: 'boom' }, 500))],
    ['a network failure', () => Promise.reject(new TypeError('Failed to fetch'))],
  ])('records a display-safe error after %s', async (_, respond) => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ rooms: seaView })).mockImplementationOnce(respond);
    const store = storeWithFetch(fetchImpl);
    await store.getState().search();

    await store.getState().search();

    const state = store.getState();
    expect(state.status).toBe('error');
    expect(state.error).toBe(SEARCH_ROOMS_ERROR_MESSAGE);
    expect(state.rooms).toBeNull();
    expect(selectSearchResults(state)).toEqual([]);
    expect(selectSearchTotal(state)).toBeNull();
    expect(selectIsSearchEmpty(state)).toBe(false);
  });

  it('never lets a slower earlier response overwrite a newer query, and aborts it', async () => {
    const slow = deferred<SearchRoomsResult>();
    const signals: AbortSignal[] = [];
    const client = vi.fn((params: URLSearchParams, signal?: AbortSignal) => {
      signals.push(signal!);
      return params.get('city') === 'Cairo' ? slow.promise : Promise.resolve(seaView);
    });
    const store = createSearchRoomsStore(client);

    store.getState().setCriteria({ city: 'Cairo' });
    store.getState().setCriteria({ city: 'Berlin' });
    await vi.waitFor(() => expect(store.getState().status).toBe('success'));
    slow.resolve({ results: [], total: 0 });
    await slow.promise;
    await Promise.resolve();

    expect(client).toHaveBeenCalledTimes(2);

    expect(signals[0].aborted).toBe(true);
    expect(store.getState().status).toBe('success');
    expect(selectSearchTotal(store.getState())).toBe(1);
    expect(selectSearchAppliedQuery(store.getState())).toEqual({ city: 'Berlin' });
  });

  it('debounces text entry by 300 ms and lets an explicit search run immediately', async () => {
    vi.useFakeTimers();
    const client = vi.fn().mockResolvedValue(seaView);
    const store = createSearchRoomsStore(client);

    store.getState().setText('sea');
    store.getState().setText('sea vi');
    store.getState().setText('sea view');
    await vi.advanceTimersByTimeAsync(299);
    expect(client).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(client).toHaveBeenCalledTimes(1);
    expect(client.mock.calls[0][0].toString()).toBe('text=sea+view');

    store.getState().setText('garden');
    await store.getState().search();
    expect(client).toHaveBeenCalledTimes(2);
    expect(client.mock.calls[1][0].toString()).toBe('text=garden');
    await vi.advanceTimersByTimeAsync(1000);
    expect(client).toHaveBeenCalledTimes(2);
  });
});
