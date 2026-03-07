/**
 * Linkwarden smoke tests: Options tab and Save popup rendering.
 */

const { test } = require('./fixtures/extension.js');

async function skipWizardIfVisible(page) {
  const wizard = page.locator('#onboarding-wizard-screen');
  if (await wizard.isVisible()) {
    await page.locator('#onboarding-wizard-skip-btn').click();
    await test.expect(wizard).toBeHidden({ timeout: 3000 });
  }
}

test.describe('Linkwarden', () => {
  test('Linkwarden options tab renders correctly', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await skipWizardIfVisible(page);

    await page.locator('.tab-btn[data-tab="linkwarden"]').click();
    await test.expect(page.locator('#tab-linkwarden')).toHaveClass(/active/);

    // Enable Linkwarden to see fields
    const enabledLabel = page.locator('label:has(#linkwarden-enabled)');
    const enabledCheck = page.locator('#linkwarden-enabled');
    if (!(await enabledCheck.isChecked())) {
      await enabledLabel.click();
    }

    // Verify key elements (settings should appear now)
    await test.expect(page.locator('#linkwarden-url')).toBeVisible();
    await test.expect(page.locator('#linkwarden-token')).toBeVisible();
    await test.expect(page.locator('#linkwarden-sync-enabled')).toBeAttached();
  });

  test('Linkwarden save popup renders with all fields', async ({
    page,
    extensionId,
  }) => {
    // Open the save popup directly (simulating context menu action)
    const url = `https://example.com/test-linkwarden`;
    const title = `Test Linkwarden Title`;
    await page.goto(`chrome-extension://${extensionId}/linkwarden-save.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`);
    await page.waitForLoadState('domcontentloaded');

    // Verify header and fields
    await test.expect(page.locator('h1')).toContainText(/Save to Linkwarden/i);
    await test.expect(page.locator('#lw-url')).toHaveValue(url);
    await test.expect(page.locator('#lw-title')).toHaveValue(title);
    await test.expect(page.locator('#lw-description')).toBeVisible();
    await test.expect(page.locator('#lw-collection')).toBeVisible();
    await test.expect(page.locator('#lw-tag-input')).toBeVisible();
    // Inputs might be hidden by toggle slider styles
    await test.expect(page.locator('#lw-screenshot')).toBeAttached();
    await test.expect(page.locator('#lw-save-btn')).toBeVisible();
    await test.expect(page.locator('#lw-cancel-btn')).toBeVisible();
  });

  test('Linkwarden save popup close on cancel', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/linkwarden-save.html?url=https://example.com&title=Test`);
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
      window.__closeCalled = false;
      window.close = () => { window.__closeCalled = true; };
    });

    await page.locator('#lw-cancel-btn').click();
    await test.expect.poll(async () => page.evaluate(() => window.__closeCalled)).toBe(true);
  });
});
