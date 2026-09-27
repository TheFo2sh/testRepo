import { defineConfig, devices } from '@playwright/test';
import { E2E_API_URL, E2E_DATABASE_URL, E2E_FRONTEND_URL } from './src/fixtures';

/**
 * Runs the Backoffice UI (Vite dev server) against the real Backoffice API, which writes an
 * isolated MongoDB database seeded with controlled fixtures before every test.
 */
export default defineConfig({
  testDir: './src',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  globalTeardown: './src/global-teardown.ts',
  use: {
    baseURL: E2E_FRONTEND_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `dotnet run --no-build --no-launch-profile --project apps/backoffice/Backoffice.csproj --urls ${E2E_API_URL}`,
      cwd: '../..',
      // The API serves no GET route, so readiness is the open port.
      port: Number(new URL(E2E_API_URL).port),
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ConnectionStrings__MainDatabase: E2E_DATABASE_URL,
      },
    },
    {
      command: `npx vite --port ${new URL(E2E_FRONTEND_URL).port} --strictPort`,
      cwd: '../backoffice-ui',
      url: E2E_FRONTEND_URL,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { BACKOFFICE_API_PROXY_TARGET: E2E_API_URL },
    },
  ],
});
