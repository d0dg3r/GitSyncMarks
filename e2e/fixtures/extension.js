/**
 * Playwright fixtures for testing the GitSyncMarks Chrome extension.
 * Loads the extension via launchPersistentContext and provides extensionId.
 *
 * Requires: npm run build:chrome (build/chrome/ must exist)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });

const path = require('path');
const fs = require('fs');
const { test: base, chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '../..');
const EXTENSION_PATH = path.join(ROOT, 'build', 'chrome');

if (!fs.existsSync(EXTENSION_PATH)) {
  throw new Error(
    `Extension not found at ${EXTENSION_PATH}. Run "npm run build:chrome" first.`
  );
}

/**
 * Wait for the MV3 service worker to start. CI runners can be slow to activate
 * the extension background worker on a fresh profile.
 */
async function waitForExtensionServiceWorker(context, timeoutMs = 60000) {
  const existing = context.serviceWorkers()[0];
  if (existing) return existing;

  const triggerPage = await context.newPage();
  try {
    await triggerPage.goto('about:blank', { waitUntil: 'domcontentloaded' });

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const active = context.serviceWorkers()[0];
      if (active) return active;

      const remaining = deadline - Date.now();
      try {
        return await context.waitForEvent('serviceworker', {
          timeout: Math.min(2000, remaining),
        });
      } catch {
        // Keep polling until the overall deadline.
      }
    }

    throw new Error(`Extension service worker did not start within ${timeoutMs}ms`);
  } finally {
    await triggerPage.close().catch(() => {});
  }
}

/**
 * Custom test with extension-loaded context and extensionId.
 * Use in tests: test('...', async ({ page, extensionId }) => { ... })
 */
const test = base.extend({
  context: [
    async ({}, use) => {
      const userDataDir = path.join(
        require('os').tmpdir(),
        `gitsyncmarks-e2e-${Date.now()}`
      );
      const args = [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ];
      if (process.env.CI) {
        args.push('--no-sandbox', '--disable-dev-shm-usage');
      }
      // Headed mode needed: service worker doesn't start in headless on many systems (CI, CachyOS)
      const context = await chromium.launchPersistentContext(userDataDir, {
        channel: 'chromium',
        headless: false,
        args,
      });
      await use(context);
      await context.close();
    },
    { timeout: 120000 },
  ],
  extensionId: [
    async ({ context }, use) => {
      const serviceWorker = await waitForExtensionServiceWorker(context);
      const extensionId = serviceWorker.url().split('/')[2];
      await use(extensionId);
    },
    { timeout: 120000 },
  ],
});

module.exports = { test };
