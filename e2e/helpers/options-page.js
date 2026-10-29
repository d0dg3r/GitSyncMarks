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
    await page.locator('#onboarding-wizard-skip-btn').click({ force: true });
    await expect(wizard).toBeHidden({ timeout: 5000 });
  }
}

/**
 * Click a control without waiting for CSS transition "stability".
 * Headed Chromium under Xvfb often keeps tab/sub-tab buttons in a
 * transitioning state long enough for Playwright's default actionability
 * check to burn the whole test timeout (then surfaces as "browser closed").
 */
async function clickReady(locator, options = {}) {
  await locator.waitFor({ state: 'visible', timeout: options.timeout ?? 15000 });
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.click({ force: true, timeout: options.timeout ?? 15000 });
}

/**
 * Activate a main settings tab and wait for its panel.
 */
async function activateMainTab(page, tabId) {
  await expect(async () => {
    await clickReady(page.locator(`.tab-btn[data-tab="${tabId}"]`));
    await expect(page.locator(`#tab-${tabId}`)).toHaveClass(/active/, { timeout: 2000 });
  }).toPass({ timeout: 20000 });
}

/**
 * Activate a sub-tab within the current main tab panel.
 */
async function activateSubTab(page, subTabId) {
  await expect(async () => {
    await clickReady(page.locator(`.sub-tab-btn[data-subtab="${subTabId}"]`));
    await expect(page.locator(`#subtab-${subTabId}`)).toHaveClass(/active/, { timeout: 2000 });
  }).toPass({ timeout: 20000 });
}

/**
 * Navigate to the extension options page and wait until fully initialized.
 * Handles both wizard-shown and direct-settings states.
 */
async function openOptionsPage(page, extensionId) {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('domcontentloaded');
  // Match smoke.spec: networkidle settles i18n/storage init so tab labels stop shifting.
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

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
        await clickReady(skipBtn);
        await expect(wizard).toBeHidden({ timeout: 10000 });
      }
    }
    if (i === 0) await page.waitForTimeout(200); // Small pause to catch late-appearing wizard
  }

  // Finally ensure the settings shell is visible and the page is initialized.
  await expect(settingsShell).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.tab-btn[data-tab="github"]')).toBeVisible({ timeout: 10000 });

  await page.locator('#language-select option[value="auto"]').waitFor({
    state: 'attached',
    timeout: 10000,
  });
}

module.exports = {
  skipWizardIfVisible,
  openOptionsPage,
  clickReady,
  activateMainTab,
  activateSubTab,
};
