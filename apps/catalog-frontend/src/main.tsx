import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createConfiguredCatalogClient } from './catalog/catalogApi';

const root = createRoot(document.getElementById('root')!);

createConfiguredCatalogClient().then(
  (catalogClient) =>
    root.render(
      <StrictMode>
        <App catalogClient={catalogClient} />
      </StrictMode>,
    ),
  () => root.render(<p role="alert">The application is not configured correctly. Please try again later.</p>),
);
