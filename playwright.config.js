/**
 * Playwright E2E config for GitSyncMarks extension testing.
 * Extension is loaded via e2e/fixtures/extension.js (launchPersistentContext).
 *
 * Prerequisite: npm run build:chrome
 */

require('dotenv').config();

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/global-teardown.js',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // Extension startup in CI can exceed the default 30s when the service worker is slow.
  timeout: process.env.CI ? 60000 : 30000,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  outputDir: 'test-results/',
  projects: [{ name: 'chromium-extension', use: { ...devices['Desktop Chrome'] } }],
});
