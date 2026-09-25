/** A room as returned by Catalog's BrowseRooms operation (`GET /rooms`). */
export interface Room {
  roomId: string;
  hotelId: string;
  numberOfBeds: number;
  /** ISO 8601 date-time, kept as returned by the API. */
  availableFrom: string;
  /** ISO 8601 date-time, kept as returned by the API. */
  availableTo: string;
  city: string;
  price: number;
}

export interface Rooms {
  results: Room[];
  total: number;
  query?: string;
}

export interface BrowseRoomsOutput {
  rooms: Rooms;
}

export type CatalogErrorKind = 'network' | 'http' | 'invalid-response';

/** A display-safe description of why a Catalog request failed. */
export interface CatalogError {
  kind: CatalogErrorKind;
  message: string;
  status?: number;
}

export type CatalogResult<T> = { ok: true; data: T } | { ok: false; error: CatalogError };

export interface CatalogClient {
  browseRooms(signal?: AbortSignal): Promise<CatalogResult<BrowseRoomsOutput>>;
}

export interface CatalogClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
}

/** Joins a base URL (with or without trailing slash, possibly with a path) and a relative path. */
export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function createCatalogClient({ baseUrl, fetch: fetchImpl = fetch }: CatalogClientOptions): CatalogClient {
  return {
    async browseRooms(signal) {
      let response: Response;
      try {
        response = await fetchImpl(joinUrl(baseUrl, 'rooms'), {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal,
        });
      } catch {
        return failure('network', 'The room catalog could not be reached. Please try again.');
      }

      if (!response.ok) {
        return failure('http', 'The room catalog is unavailable right now. Please try again.', response.status);
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return invalidResponse();
      }

      const output = parseBrowseRoomsOutput(body);
      return output ? { ok: true, data: output } : invalidResponse();
    },
  };
}

function failure(kind: CatalogErrorKind, message: string, status?: number): { ok: false; error: CatalogError } {
  return { ok: false, error: status === undefined ? { kind, message } : { kind, message, status } };
}

function invalidResponse() {
  return failure('invalid-response', 'The room catalog returned an unexpected response. Please try again.');
}

export function parseBrowseRoomsOutput(body: unknown): BrowseRoomsOutput | null {
  if (!isRecord(body) || !isRecord(body.rooms)) return null;
  const { results, total, query } = body.rooms;
  if (!Array.isArray(results) || !isNonNegativeInteger(total)) return null;
  if (query !== undefined && query !== null && typeof query !== 'string') return null;

  const rooms: Room[] = [];
  for (const item of results) {
    const room = parseRoom(item);
    if (!room) return null;
    rooms.push(room);
  }

  return {
    rooms: typeof query === 'string' ? { results: rooms, total, query } : { results: rooms, total },
  };
}

function parseRoom(item: unknown): Room | null {
  if (!isRecord(item)) return null;
  const { roomId, hotelId, numberOfBeds, availableFrom, availableTo, city, price } = item;
  if (
    typeof roomId !== 'string' ||
    typeof hotelId !== 'string' ||
    !isNonNegativeInteger(numberOfBeds) ||
    !isDateTime(availableFrom) ||
    !isDateTime(availableTo) ||
    typeof city !== 'string' ||
    typeof price !== 'number' ||
    !Number.isFinite(price)
  ) {
    return null;
  }
  return { roomId, hotelId, numberOfBeds, availableFrom, availableTo, city, price };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}
