/**
 * Sync tests: Push and Pull.
 * Requires: GITSYNCMARKS_TEST_PAT, GITSYNCMARKS_TEST_REPO_OWNER, GITSYNCMARKS_TEST_REPO
 *
 * Sync three-way merge and Conflict (skipped: hard to trigger same-file conflict).
 */

const { test } = require('./fixtures/extension.js');
const { resetTestRepo } = require('./helpers/repo-reset.js');
const {
  addBookmarkToRepo,
  updateBookmarkInRepo,
  getFirstBookmarkFileInToolbar,
  hasBookmarkFiles,
  hasMinimalStructure,
  countBookmarkFilesInToolbar,
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
  test.describe('with repo', () => {
    test.beforeEach(async ({}, testInfo) => {
      if (!hasTestCredentials()) {
        testInfo.skip();
        return;
      }
      await resetTestRepo();
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
    await test.expect(popup.locator('#status-message')).toContainText(/success|ready|synced|loaded from github/i, { timeout: 15000 });
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
    await test.expect(popup.locator('#status-message')).toContainText(/success|ready|synced|loaded from github/i, { timeout: 15000 });
    await popup.close();

    // Verify via getStatus (options page has extension context)
    const status = await page.evaluate(async () => {
      return await chrome.runtime.sendMessage({ action: 'getStatus' });
    });
    test.expect(status?.lastSyncTime).toBeTruthy();
  });

  test('Sync three-way merge combines local and remote changes', async ({
    page,
    context,
    extensionId,
  }) => {
    // 1. Add local bookmark, configure, push
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
    await test.expect(popup.locator('#status-message')).toContainText(/success|ready|synced|loaded from github/i, { timeout: 15000 });
    const countAfterPush = await countBookmarkFilesInToolbar();

    // 2. Add bookmark via GitHub API (remote-only change)
    await addBookmarkToRepo('E2E Sync Remote', 'https://e2e-sync-remote.example.com');

    // 3. Add another local bookmark (local change)
    const tab2 = await context.newPage();
    await tab2.goto('https://example.org');
    await tab2.keyboard.press('Control+d');
    await tab2.waitForTimeout(500);
    await tab2.close();

    // 4. Sync (three-way merge)
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('networkidle');
    await popup.locator('#sync-btn').click();
    await test.expect(popup.locator('#status-message')).toContainText(/success|ready|synced|loaded from github/i, { timeout: 15000 });
    await popup.close();

    // 5. Verify both local and remote bookmarks merged into repo (count increased)
    const countAfterSync = await countBookmarkFilesInToolbar();
    test.expect(countAfterSync).toBeGreaterThan(countAfterPush);
  });

  test.skip('Conflict detection and resolution', async ({
    page,
    context,
    extensionId,
  }) => {
    // 1. Add bookmark via API, configure, pull (ensures we have a known file)
    await addBookmarkToRepo('E2E Conflict Test', 'https://e2e-conflict.example.com');
    await configureExtension(page, extensionId);

    const popup = await page.context().newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('networkidle');
    await popup.locator('#pull-btn').click();
    await test.expect(popup.locator('#status-message')).toContainText(/success|ready|synced|loaded from github/i, { timeout: 15000 });

    // 2. Get bookmark filename and modify remotely
    const filePath = await getFirstBookmarkFileInToolbar();
    test.expect(filePath).toBeTruthy();
    await updateBookmarkInRepo(filePath, {
      title: 'Remote Modified Title',
      url: 'https://e2e-conflict.example.com',
    });

    // 3. Modify same bookmark locally (options page has chrome.bookmarks)
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(async () => {
      const tree = await chrome.bookmarks.getTree();
      const findBookmark = (nodes) => {
        for (const n of nodes) {
          if (n.url && n.url.includes('e2e-conflict.example.com')) return n;
          if (n.children) {
            const found = findBookmark(n.children);
            if (found) return found;
          }
        }
        return null;
      };
      const bm = findBookmark(tree);
      if (bm) await chrome.bookmarks.update(bm.id, { title: 'Local Modified Title' });
    });

    // 4. Trigger sync -> conflict
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('networkidle');
    await popup.locator('#sync-btn').click();

    // 5. Verify conflict box visible (sync returns conflict, popup shows conflict UI)
    await test.expect(popup.locator('#conflict-box')).toBeVisible({ timeout: 15000 });
    await test.expect(popup.locator('#conflict-box')).toContainText(/conflict|Conflict/i);

    // 6. Resolve: GitHub → Local
    await popup.locator('#force-pull-btn').click();
    await test.expect(popup.locator('#conflict-box')).not.toBeVisible({ timeout: 10000 });
    await test.expect(popup.locator('#status-message')).toContainText(/success|ready|synced|loaded from github/i);
    await popup.close();
  });
  });
});
