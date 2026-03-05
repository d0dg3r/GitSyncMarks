/**
 * Smoke tests: Extension loads, popup and options page render.
 * No GitHub config required.
 */

const { test } = require('./fixtures/extension.js');

async function skipWizardIfVisible(page) {
  const wizard = page.locator('#onboarding-wizard-screen');
  if (await wizard.isVisible()) {
    await page.locator('#onboarding-wizard-skip-btn').click();
    await test.expect(wizard).toBeHidden({ timeout: 3000 });
  }
}

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
    await skipWizardIfVisible(page);

    // GitHub tab should be active
    const githubTab = page.locator('.tab-btn[data-tab="github"]');
    await test.expect(githubTab).toBeVisible();
    await test.expect(githubTab).toHaveClass(/active/);

    // Switch to connection sub-tab, then token input must be visible
    await page.locator('.sub-tab-btn[data-subtab="github-connection"]').click();
    await test.expect(page.locator('#token')).toBeVisible();
    await test.expect(page.locator('#owner')).toBeVisible();
    await test.expect(page.locator('#repo')).toBeVisible();
  });

  test('Options tabs are clickable', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await skipWizardIfVisible(page);

    const tabs = ['sync', 'files', 'help', 'about'];
    for (const tabId of tabs) {
      const tab = page.locator(`.tab-btn[data-tab="${tabId}"]`);
      await tab.click();
      const content = page.locator(`#tab-${tabId}`);
      await test.expect(content).toHaveClass(/active/, { timeout: 2000 });
    }
  });

  test('Search popup finds and opens a bookmark', async ({ page, extensionId, context }) => {
    await page.goto(`chrome-extension://${extensionId}/search.html`);
    await page.waitForLoadState('domcontentloaded');
    await test.expect(page.locator('h1')).toContainText(/Bookmark Search/i);
    await test.expect(page.locator('.search-logo')).toBeVisible();
    await test.expect(page.locator('#search-close-btn')).toBeVisible();
    await test.expect(page.locator('#search-clear-btn')).toBeHidden();
    await page.evaluate(() => {
      const shell = document.querySelector('.search-shell')?.getBoundingClientRect();
      const closeBtn = document.querySelector('#search-close-btn')?.getBoundingClientRect();
      if (!shell || !closeBtn) throw new Error('Missing popup shell or close button');
      const nearTop = closeBtn.top - shell.top <= 16;
      const nearRight = shell.right - closeBtn.right <= 16;
      if (!nearTop || !nearRight) {
        throw new Error('Close button is not positioned in top-right corner');
      }
    });

    await page.evaluate(() => {
      window.__closeCalled = false;
      window.close = () => { window.__closeCalled = true; };
    });
    await page.keyboard.press('Escape');
    await test.expect.poll(async () => page.evaluate(() => window.__closeCalled)).toBe(true);

    await page.evaluate(() => {
      window.__closeCalled = false;
      window.close = () => { window.__closeCalled = true; };
    });
    await page.locator('#search-close-btn').click();
    await test.expect.poll(async () => page.evaluate(() => window.__closeCalled)).toBe(true);

    const seed = await page.evaluate(async () => {
      const marker = Date.now();
      const title = `E2E Search Marker ${marker}`;
      const url = `https://example.com/e2e-search-${marker}`;
      await chrome.bookmarks.create({ parentId: '1', title, url });
      return { title, url };
    });

    await page.locator('#search-input').fill(seed.title);
    await test.expect(page.locator('#search-clear-btn')).toBeVisible();
    await test.expect(page.locator('.search-result-item')).toContainText(seed.title, { timeout: 3000 });

    await page.locator('#search-clear-btn').click();
    await test.expect(page.locator('#search-clear-btn')).toBeHidden();
    await page.locator('#search-input').fill(seed.title);

    const newTabPromise = context.waitForEvent('page');
    await page.locator('.search-open-btn').first().click();
    const newTab = await newTabPromise;
    await newTab.waitForLoadState('domcontentloaded');
    await test.expect(newTab).toHaveURL(seed.url);
    await newTab.close();
  });

  test('Settings sync keeps global mode disabled', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await skipWizardIfVisible(page);

    await page.locator('.tab-btn[data-tab="files"]').click();
    await page.locator('.sub-tab-btn[data-subtab="files-settings"]').click();
    await test.expect(page.locator('#subtab-files-settings')).toHaveClass(/active/);

    await page.locator('label:has(#sync-settings-to-git)').click();
    await test.expect(page.locator('#settings-sync-client-name')).toBeVisible();
    const modeSelect = page.locator('#settings-sync-mode');
    await test.expect(modeSelect).toBeDisabled();
    await test.expect(modeSelect).toHaveValue('individual');
    await test.expect(page.getByText(/Global mode is temporarily unavailable/i)).toBeVisible();
  });

  test('Settings sync requires client name before actions', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await skipWizardIfVisible(page);

    await page.locator('.tab-btn[data-tab="files"]').click();
    await page.locator('.sub-tab-btn[data-subtab="files-settings"]').click();
    await page.locator('label:has(#sync-settings-to-git)').click();

    const createBtn = page.locator('#settings-sync-create-btn');
    const importBtn = page.locator('#settings-sync-import-btn');
    const syncSelectedBtn = page.locator('#settings-sync-push-selected-btn');

    await page.locator('#settings-sync-client-name').fill('');
    await test.expect(createBtn).toBeDisabled();
    await test.expect(importBtn).toBeDisabled();
    await test.expect(syncSelectedBtn).toBeDisabled();

    await page.locator('#settings-sync-client-name').fill('my-laptop');
    await page.locator('#settings-sync-client-name').blur();
    await test.expect(createBtn).toBeEnabled();
  });
});
