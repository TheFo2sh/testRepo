import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../dist/apps/catalog-frontend',
    emptyOutDir: true,
  },
  server: {
    // Dev-only: forwards the relative Catalog routes (e.g. /rooms/search) to the local Catalog host.
    proxy: { '/rooms': 'http://localhost:5086' },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
