/**
 * Smoke tests: Extension loads, popup and options page render.
 * No GitHub config required.
 */

const { test } = require('./fixtures/extension.js');

test.describe('Smoke', () => {
  test('Popup loads with header and main content', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForLoadState('domcontentloaded');

    // Header with extension name
    await test.expect(page.locator('h1')).toContainText('GitSyncMarks');
    // Settings link in footer (present in both states)
    await test.expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
  });

  test('Options page loads and shows GitHub tab', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    // GitHub tab should be active
    const githubTab = page.locator('.tab-btn[data-tab="github"]');
    await test.expect(githubTab).toBeVisible();
    await test.expect(githubTab).toHaveClass(/active/);

    // Token input exists
    await test.expect(page.locator('#token')).toBeVisible();
    await test.expect(page.locator('#owner')).toBeVisible();
    await test.expect(page.locator('#repo')).toBeVisible();
  });

  test('Options tabs are clickable', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    const tabs = ['sync', 'backup', 'automation', 'help', 'about'];
    for (const tabId of tabs) {
      const tab = page.locator(`.tab-btn[data-tab="${tabId}"]`);
      await tab.click();
      const content = page.locator(`#tab-${tabId}`);
      await test.expect(content).toHaveClass(/active/, { timeout: 2000 });
    }
  });
});
