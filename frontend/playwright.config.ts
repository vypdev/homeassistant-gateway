import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = process.env.PW_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }], ['list']] : 'list',
  use: {
    baseURL: externalBaseUrl ?? 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: externalBaseUrl ? undefined : {
    command: 'pnpm exec vite --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testIgnore: '**/visual.spec.ts', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testIgnore: '**/visual.spec.ts', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chromium', testIgnore: '**/visual.spec.ts', use: { ...devices['Pixel 5'] } },
  ],
});
