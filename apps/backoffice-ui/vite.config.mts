import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Node environment of the Vite process (the frontend tsconfig has no Node types).
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../dist/apps/backoffice-ui',
    emptyOutDir: true,
  },
  server: {
    // Dev-only: forwards the relative Backoffice routes (e.g. /hotel-infos/H-101) to the local Backoffice host.
    proxy: { '/hotel-infos': env.BACKOFFICE_API_PROXY_TARGET ?? 'http://localhost:5274' },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
