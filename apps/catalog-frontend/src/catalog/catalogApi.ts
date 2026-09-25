import { loadAppSettings } from '../config/appSettings';
import { createCatalogClient, type CatalogClient } from './catalogClient';

/** Creates the Catalog client from the Catalog API base URL in `appsettings.json`. */
export async function createConfiguredCatalogClient(fetchImpl: typeof fetch = fetch): Promise<CatalogClient> {
  const settings = await loadAppSettings(fetchImpl);
  return createCatalogClient({ baseUrl: settings.catalogApi.baseUrl, fetch: fetchImpl });
}
