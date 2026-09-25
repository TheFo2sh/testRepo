/**
 * Browser-readable application settings, served as `/appsettings.json`
 * next to the built frontend so each deployment can point at its own backend
 * without rebuilding.
 */
export interface AppSettings {
  catalogApi: {
    baseUrl: string;
  };
}

export const APP_SETTINGS_PATH = '/appsettings.json';

export class AppSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppSettingsError';
  }
}

export function parseAppSettings(raw: unknown): AppSettings {
  const baseUrl = (raw as { CatalogApi?: { BaseUrl?: unknown } } | null)?.CatalogApi?.BaseUrl;
  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
    throw new AppSettingsError('appsettings.json must define CatalogApi.BaseUrl.');
  }
  try {
    new URL(baseUrl);
  } catch {
    throw new AppSettingsError('CatalogApi.BaseUrl must be an absolute URL.');
  }
  return { catalogApi: { baseUrl: baseUrl.trim() } };
}

export async function loadAppSettings(
  fetchImpl: typeof fetch = fetch,
  path: string = APP_SETTINGS_PATH,
): Promise<AppSettings> {
  const response = await fetchImpl(path, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new AppSettingsError(`Could not load ${path} (HTTP ${response.status}).`);
  }
  return parseAppSettings(await response.json());
}
