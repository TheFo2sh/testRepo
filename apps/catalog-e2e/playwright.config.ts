import { defineConfig, devices } from '@playwright/test';
import { E2E_API_URL, E2E_DATABASE_URL, E2E_FRONTEND_URL } from './src/fixtures';

/**
 * Runs the Catalog Frontend (Vite dev server) against the real Catalog API, which reads an
 * isolated MongoDB database seeded with controlled fixtures in global setup.
 */
export default defineConfig({
  testDir: './src',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  globalSetup: './src/global-setup.ts',
  globalTeardown: './src/global-teardown.ts',
  use: {
    baseURL: E2E_FRONTEND_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `dotnet run --no-build --no-launch-profile --project apps/catalog/Catalog.csproj --urls ${E2E_API_URL}`,
      cwd: '../..',
      url: `${E2E_API_URL}/rooms`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ConnectionStrings__MainDatabase: E2E_DATABASE_URL,
      },
    },
    {
      command: `npx vite --port ${new URL(E2E_FRONTEND_URL).port} --strictPort`,
      cwd: '../catalog-frontend',
      url: E2E_FRONTEND_URL,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { CATALOG_API_PROXY_TARGET: E2E_API_URL },
    },
  ],
});
