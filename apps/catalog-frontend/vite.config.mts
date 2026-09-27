import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Node environment of the Vite process (the frontend tsconfig has no Node types).
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../dist/apps/catalog-frontend',
    emptyOutDir: true,
  },
  server: {
    // Dev-only: forwards the relative Catalog routes (e.g. /rooms/search) to the local Catalog host.
    proxy: { '/rooms': env.CATALOG_API_PROXY_TARGET ?? 'http://localhost:5086' },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
