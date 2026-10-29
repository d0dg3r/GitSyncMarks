/**
 * Options page UI regression tests (tabs, language, Help links, sub-tabs).
 * No GitHub credentials required.
 *
 * Run: npm run test:e2e:options
 */

const { expect } = require('@playwright/test');
const { test: extTest } = require('./fixtures/extension.js');
const {
  openOptionsPage,
  clickReady,
  activateMainTab,
  activateSubTab,
} = require('./helpers/options-page.js');

extTest.describe('Options page UI', () => {
  extTest('language select is populated', async ({ page, extensionId }) => {
    await openOptionsPage(page, extensionId);
    const lang = page.locator('#language-select');
    await expect(lang).toBeVisible();
    await expect(lang.locator('option[value="auto"]')).toHaveCount(1);
    await expect(lang.locator('option[value="en"]')).toHaveCount(1);
    const optionCount = await lang.locator('option').count();
    expect(optionCount).toBeGreaterThanOrEqual(2);
  });

  extTest('theme selector is present', async ({ page, extensionId }) => {
    await openOptionsPage(page, extensionId);
    const selector = page.locator('#theme-selector');
    await expect(selector).toBeVisible();
    const btns = selector.locator('.seg-btn');
    await expect(btns).toHaveCount(3);
    await clickReady(btns.nth(1));
    await expect(btns.nth(1)).toHaveClass(/active/);
  });

  extTest('main tabs activate matching panels', async ({ page, extensionId }) => {
    await openOptionsPage(page, extensionId);
    const tabs = ['github', 'files', 'menu', 'linkwarden', 'help', 'about'];
    for (const id of tabs) {
      await activateMainTab(page, id);
    }
  });

  extTest('Git sub-tabs switch panels', async ({ page, extensionId }) => {
    await openOptionsPage(page, extensionId);
    await activateMainTab(page, 'github');
    for (const sub of ['github-profile', 'github-connection', 'github-sync', 'github-repos']) {
      await activateSubTab(page, sub);
    }
  });

  extTest('Help quick links (no data-subtab) do not break the page', async ({ page, extensionId, context }) => {
    await openOptionsPage(page, extensionId);
    await activateMainTab(page, 'help');

    const website = page.locator('.help-quick-links a.help-link-btn').first();
    await expect(website).toHaveAttribute('href', /^https?:\/\/gitsyncmarks\.com(\/|$)/);

    // target=_blank — close the popup so it cannot starve the headed CI browser.
    const popupPromise = context.waitForEvent('page', { timeout: 10000 }).catch(() => null);
    await clickReady(website);
    const popup = await popupPromise;
    if (popup) await popup.close().catch(() => {});

    await expect(page.locator('#language-select')).toBeVisible();
    await activateMainTab(page, 'about');
  });

  extTest('Files sub-tabs include Bitwarden backup panel', async ({ page, extensionId }) => {
    await openOptionsPage(page, extensionId);
    await activateMainTab(page, 'files');
    await activateSubTab(page, 'files-bitwarden');
    const panel = page.locator('#subtab-files-bitwarden');
    await expect(panel.locator('#bitwarden-backup-path')).toBeVisible();
    await expect(panel.locator('.card-nested')).toHaveCount(3, { timeout: 3000 });
    await expect(panel.locator('#bitwarden-backup-push-btn')).toBeVisible();
  });

  extTest('Customize shortcuts button does not throw', async ({ page, extensionId, context }) => {
    await openOptionsPage(page, extensionId);
    await activateMainTab(page, 'help');
    await clickReady(page.locator('details:has(#btn-customize-shortcuts)').locator('summary'));
    const btn = page.locator('#btn-customize-shortcuts');
    await expect(btn).toBeVisible();

    const extraPromise = context.waitForEvent('page', { timeout: 10000 }).catch(() => null);
    await clickReady(btn);
    const extra = await extraPromise;
    if (extra) await extra.close().catch(() => {});

    await expect(page.locator('#language-select')).toBeVisible();
  });
});
