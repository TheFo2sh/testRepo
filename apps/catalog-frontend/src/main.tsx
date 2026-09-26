import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createCatalogBrowseRoomsClient, loadAppSettings } from './api/catalogClient';
import { configureBrowseRoomsClient } from './state/browseRoomsStore';

async function start() {
  try {
    const settings = await loadAppSettings();
    configureBrowseRoomsClient(createCatalogBrowseRoomsClient(settings.CatalogApi.BaseUrl));
  } catch (error) {
    // Leave the store unconfigured so the screen shows its request-failure state.
    console.error(error);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
