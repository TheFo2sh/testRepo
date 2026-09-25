import type { CatalogClient } from './catalog/catalogClient';

export interface AppProps {
  catalogClient: CatalogClient;
}

export function App(_props: AppProps) {
  return <main>Catalog</main>;
}
