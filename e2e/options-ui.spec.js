/**
 * Options page UI regression tests (tabs, language, Help links, sub-tabs).
 * No GitHub credentials required.
 *
 * Run: npm run test:e2e:options
 */

const { expect } = require('@playwright/test');
const { test: extTest } = require('./fixtures/extension.js');
const { openOptionsPage } = require('./helpers/options-page.js');

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
    await btns.nth(1).click();
    await expect(btns.nth(1)).toHaveClass(/active/);
  });

  extTest('main tabs activate matching panels', async ({ page, extensionId }) => {
    await openOptionsPage(page, extensionId);
    const tabs = ['github', 'files', 'menu', 'linkwarden', 'help', 'about'];
    for (const id of tabs) {
      await page.locator(`.tab-btn[data-tab="${id}"]`).click();
      await expect(page.locator(`#tab-${id}`)).toHaveClass(/active/, { timeout: 3000 });
    }
  });

  extTest('Git sub-tabs switch panels', async ({ page, extensionId }) => {
    await openOptionsPage(page, extensionId);
    await page.locator('.tab-btn[data-tab="github"]').click();
    for (const sub of ['github-profile', 'github-connection', 'github-sync', 'github-repos']) {
      await page.locator(`.sub-tab-btn[data-subtab="${sub}"]`).click();
      await expect(page.locator(`#subtab-${sub}`)).toHaveClass(/active/, { timeout: 3000 });
    }
  });

  extTest('Help quick links (no data-subtab) do not break the page', async ({ page, extensionId }) => {
    await openOptionsPage(page, extensionId);
    await page.locator('.tab-btn[data-tab="help"]').click();

    const website = page.locator('.help-quick-links a.help-link-btn').first();
    await expect(website).toHaveAttribute('href', /^https?:\/\/gitsyncmarks\.com(\/|$)/);
    await website.click();

    await expect(page.locator('#language-select')).toBeVisible();
    await page.locator('.tab-btn[data-tab="about"]').click();
    await expect(page.locator('#tab-about')).toHaveClass(/active/);
  });

  extTest('Customize shortcuts button does not throw', async ({ page, extensionId }) => {
    await openOptionsPage(page, extensionId);
    await page.locator('.tab-btn[data-tab="help"]').click();
    await page.locator('details:has(#btn-customize-shortcuts)').locator('summary').click();
    const btn = page.locator('#btn-customize-shortcuts');
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page.locator('#language-select')).toBeVisible();
  });
});
