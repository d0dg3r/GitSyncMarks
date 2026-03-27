/**
 * Shared helpers for options.html E2E tests.
 */

const { expect } = require('@playwright/test');

/**
 * Skip the onboarding wizard if it is shown (fresh profile).
 */
async function skipWizardIfVisible(page) {
  const wizard = page.locator('#onboarding-wizard-screen');
  if (await wizard.isVisible({ timeout: 500 }).catch(() => false)) {
    await page.locator('#onboarding-wizard-skip-btn').click();
    await expect(wizard).toBeHidden({ timeout: 5000 });
  }
}

/**
 * Navigate to the extension options page and wait until fully initialized.
 * Handles both wizard-shown and direct-settings states.
 */
async function openOptionsPage(page, extensionId) {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('domcontentloaded');

  const wizard = page.locator('#onboarding-wizard-screen');
  const settingsShell = page.locator('#settings-shell');

  await Promise.race([
    wizard.waitFor({ state: 'visible', timeout: 15000 }),
    settingsShell.waitFor({ state: 'visible', timeout: 15000 }),
  ]);

  if (await wizard.isVisible()) {
    await page.locator('#onboarding-wizard-skip-btn').click();
    await expect(wizard).toBeHidden({ timeout: 5000 });
  }

  await expect(settingsShell).toBeVisible({ timeout: 10000 });

  await page.locator('#language-select option[value="auto"]').waitFor({
    state: 'attached',
    timeout: 10000,
  });
}

module.exports = { skipWizardIfVisible, openOptionsPage };
