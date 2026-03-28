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

  // Wait for either the wizard to show up or the settings shell to be ready.
  // We use a retry-based approach because the wizard might hide the shell after a short delay during initialization.
  await expect(async () => {
    const isWizardVisible = await wizard.isVisible();
    const isShellVisible = await settingsShell.isVisible();
    if (!isWizardVisible && !isShellVisible) {
      throw new Error('Neither wizard nor settings shell is visible yet');
    }
  }).toPass({ timeout: 15000 });

  // If the wizard is visible (or appears during the next few moments), skip it.
  // We check twice to handle the race where it shows up right after our first check.
  for (let i = 0; i < 2; i++) {
    if (await wizard.isVisible()) {
      const skipBtn = page.locator('#onboarding-wizard-skip-btn');
      if (await skipBtn.isVisible()) {
        await skipBtn.click();
        await expect(wizard).toBeHidden({ timeout: 10000 });
      }
    }
    if (i === 0) await page.waitForTimeout(200); // Small pause to catch late-appearing wizard
  }

  // Finally ensure the settings shell is visible and the page is initialized.
  await expect(settingsShell).toBeVisible({ timeout: 10000 });

  await page.locator('#language-select option[value="auto"]').waitFor({
    state: 'attached',
    timeout: 10000,
  });
}

module.exports = { skipWizardIfVisible, openOptionsPage };
