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

    await page.locator('#settings-sync-client-name').fill('');
    await page.locator('#settings-sync-create-btn').click();
    await test.expect(page.locator('#settings-sync-import-result')).toContainText(/client name/i);
  });
});
