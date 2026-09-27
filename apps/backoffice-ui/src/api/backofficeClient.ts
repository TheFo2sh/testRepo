/** A room of the HotelInfo returned by Backoffice `PUT /hotel-infos/{hotelId}`. */
export interface RoomInfo {
  roomId: string;
  numberOfBeds: number | null;
  price: number | null;
  description: string;
}

/** The complete HotelInfo returned by Backoffice `PUT /hotel-infos/{hotelId}`. */
export interface HotelInfo {
  hotelId: string;
  rooms: RoomInfo[];
  city: string;
  stars: number;
  description: string;
}

export type UpdateHotelInfoResult =
  | { kind: 'updated'; hotelInfo: HotelInfo }
  /** The contract's 422 `HotelInfo Update Rejected` body. */
  | { kind: 'rejected'; hotelId: string; reason: string };

/** Calls Backoffice `PUT /hotel-infos/{hotelId}` (UpdateHotelInfo). */
export type UpdateHotelInfoClient = (hotelId: string, city: string, signal?: AbortSignal) => Promise<UpdateHotelInfoResult>;

/**
 * Base URL of the Backoffice API, from `VITE_BACKOFFICE_API_BASE_URL` at build time.
 * Empty (same origin) by default, so deployed builds call the Backoffice host that serves them.
 */
export function backofficeApiBaseUrl(): string {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
  return (env.VITE_BACKOFFICE_API_BASE_URL ?? '').replace(/\/+$/, '');
}

export function createUpdateHotelInfoClient(
  baseUrl: string = backofficeApiBaseUrl(),
  fetchImpl: typeof fetch = (...args) => fetch(...args),
): UpdateHotelInfoClient {
  return async (hotelId, city, signal) => {
    const response = await fetchImpl(`${baseUrl}/hotel-infos/${encodeURIComponent(hotelId)}`, {
      method: 'PUT',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ city }),
      signal,
    });

    if (response.status === 422) {
      const body = (await response.json()) as { hotelId?: string; reason?: string } | null;
      if (typeof body?.reason !== 'string') throw new Error('PUT /hotel-infos/{hotelId} returned an unexpected rejection');
      return { kind: 'rejected', hotelId: body.hotelId ?? hotelId, reason: body.reason };
    }

    if (!response.ok) throw new Error(`PUT /hotel-infos/{hotelId} failed: HTTP ${response.status}`);
    const body = (await response.json()) as { hotelInfo?: HotelInfo } | null;
    if (!body?.hotelInfo || typeof body.hotelInfo.hotelId !== 'string' || !Array.isArray(body.hotelInfo.rooms)) {
      throw new Error('PUT /hotel-infos/{hotelId} returned an unexpected body');
    }
    return { kind: 'updated', hotelInfo: body.hotelInfo };
  };
}
