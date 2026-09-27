import type { BrowseRoomsClient, Rooms } from '../state/browseRoomsStore';

export interface AppSettings {
  CatalogApi: { BaseUrl: string };
}

/** Reads the browser-served appsettings that hold the default Catalog backend URL. */
export async function loadAppSettings(url = '/appsettings.json'): Promise<AppSettings> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
  const settings = (await response.json()) as AppSettings;
  if (!settings?.CatalogApi?.BaseUrl) throw new Error(`${url} does not define CatalogApi.BaseUrl`);
  return settings;
}

/** Catalog `GET /rooms` (BrowseRooms) client returning `BrowseRoomsOutput.rooms`. */
export function createCatalogBrowseRoomsClient(baseUrl: string): BrowseRoomsClient {
  const roomsUrl = `${baseUrl.replace(/\/+$/, '')}/rooms`;
  return async (signal) => {
    const response = await fetch(roomsUrl, { headers: { Accept: 'application/json' }, signal });
    if (!response.ok) throw new Error(`GET /rooms failed: HTTP ${response.status}`);
    const body = (await response.json()) as { rooms?: Rooms };
    if (!body?.rooms || !Array.isArray(body.rooms.results)) throw new Error('GET /rooms returned an unexpected body');
    return body.rooms;
  };
}
