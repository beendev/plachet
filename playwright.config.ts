import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
  },
  webServer: {
    command: 'npm run preview -- --host --port 4173',
    url: 'http://localhost:4173',
    timeout: 30 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
