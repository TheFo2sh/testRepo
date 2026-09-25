import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../dist/apps/catalog-frontend',
    emptyOutDir: true,
  },
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
  },
});
