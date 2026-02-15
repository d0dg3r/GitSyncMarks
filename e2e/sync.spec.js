/**
 * Sync tests: Push and Pull.
 * Requires: GITSYNCMARKS_TEST_PAT, GITSYNCMARKS_TEST_REPO_OWNER, GITSYNCMARKS_TEST_REPO
 *
 * Placeholders for Sync (three-way merge) and Konflikte.
 */

const { test } = require('./fixtures/extension.js');
const { resetTestRepo } = require('./helpers/repo-reset.js');
const {
  addBookmarkToRepo,
  hasBookmarkFiles,
  hasMinimalStructure,
} = require('./helpers/github-api.js');

const hasTestCredentials = () =>
  process.env.GITSYNCMARKS_TEST_PAT &&
  process.env.GITSYNCMARKS_TEST_REPO_OWNER &&
  process.env.GITSYNCMARKS_TEST_REPO;

async function configureExtension(page, extensionId) {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('networkidle');
  page.on('dialog', (d) => d.dismiss());

  await page.locator('#token').fill(process.env.GITSYNCMARKS_TEST_PAT);
  await page.locator('#owner').fill(process.env.GITSYNCMARKS_TEST_REPO_OWNER);
  await page.locator('#repo').fill(process.env.GITSYNCMARKS_TEST_REPO);
  await page.locator('#save-github-btn').click();
  await test.expect(page.locator('#save-github-result')).toHaveClass(/success/, { timeout: 5000 });
}

test.describe('Sync', () => {
  test.skip(!hasTestCredentials(), 'Missing test credentials (PAT, REPO_OWNER, REPO)');

  test.beforeEach(async () => {
    if (hasTestCredentials()) {
      await resetTestRepo();
    }
  });

  test('Push uploads bookmarks to repo', async ({ page, context, extensionId }) => {
    // Add a bookmark: open tab, navigate, use Ctrl+D (Chrome adds current page to bookmarks)
    const tab = await context.newPage();
    await tab.goto('https://example.com');
    await tab.keyboard.press('Control+d');
    await tab.waitForTimeout(500);
    await tab.close();

    await configureExtension(page, extensionId);

    const popup = await page.context().newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('networkidle');

    await popup.locator('#push-btn').click();
    await test.expect(popup.locator('#status-message')).toContainText(/success|ready|synced/i, { timeout: 15000 });
    await popup.close();

    // Either bookmark files or at least minimal structure (if Ctrl+D didn't add one)
    const hasFiles = await hasBookmarkFiles();
    const hasStruct = await hasMinimalStructure();
    test.expect(hasFiles || hasStruct).toBeTruthy();
  });

  test('Pull fetches bookmarks from repo', async ({ page, extensionId }) => {
    await addBookmarkToRepo('E2E Pull Test', 'https://e2e-pull.example.com');
    await configureExtension(page, extensionId);

    const popup = await page.context().newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('networkidle');

    await popup.locator('#pull-btn').click();
    await test.expect(popup.locator('#status-message')).toContainText(/success|ready|synced/i, { timeout: 15000 });
    await popup.close();

    // Verify via getStatus (options page has extension context)
    const status = await page.evaluate(async () => {
      return await chrome.runtime.sendMessage({ action: 'getStatus' });
    });
    test.expect(status?.lastSyncTime).toBeTruthy();
  });

  // ----- Placeholders for future phases -----
  test.skip('Sync three-way merge flow', async () => {
    // Phase 5: Push + Pull + Sync, verify end state
  });

  test.skip('Conflict detection and resolution', async () => {
    // Phase 6: Local + remote changes, conflict dialog
  });
});
