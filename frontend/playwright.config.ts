import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4300', locale: 'pl-PL' },
  webServer: [
    // Nigdy nie używamy cudzego backendu na :8081 (mógłby działać z backend/.env → Atlas): zajęty port = błąd.
    { command: 'npm run e2e:backend', url: 'http://localhost:8081/api/health', reuseExistingServer: false, timeout: 120_000 },
    {
      command: 'node node_modules/@angular/cli/bin/ng.js serve --port 4300 --proxy-config proxy.e2e.json',
      url: 'http://localhost:4300',
      reuseExistingServer: true,
      timeout: 180_000,
      env: { CI: '1', NG_CLI_ANALYTICS: 'false' },
    },
  ],
});
