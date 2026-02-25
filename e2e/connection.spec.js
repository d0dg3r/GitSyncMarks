/**
 * Connection test: Configure GitHub credentials and verify "Test Connection" succeeds.
 * Save Settings test: Sync tab settings can be saved.
 * Requires: GITSYNCMARKS_TEST_PAT, GITSYNCMARKS_TEST_REPO_OWNER, GITSYNCMARKS_TEST_REPO (for credentials + save tests)
 */

const { test } = require('./fixtures/extension.js');

async function configureExtension(page, extensionId) {
  page.on('dialog', (d) => d.dismiss());
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('networkidle');
  await page.locator('#token').fill(process.env.GITSYNCMARKS_TEST_PAT);
  await page.locator('#owner').fill(process.env.GITSYNCMARKS_TEST_REPO_OWNER);
  await page.locator('#repo').fill(process.env.GITSYNCMARKS_TEST_REPO);
  await page.locator('#repo').dispatchEvent('change');
  await test.expect(page.locator('#save-github-result')).toHaveClass(/success/, { timeout: 5000 });
}

const hasTestCredentials = () =>
  process.env.GITSYNCMARKS_TEST_PAT &&
  process.env.GITSYNCMARKS_TEST_REPO_OWNER &&
  process.env.GITSYNCMARKS_TEST_REPO;
const hasTokenAndOwner = () =>
  process.env.GITSYNCMARKS_TEST_PAT &&
  process.env.GITSYNCMARKS_TEST_REPO_OWNER;

test.describe('Connection', () => {
  test.describe('Invalid token', () => {
    test('Test Connection fails with invalid token', async ({ page, extensionId }) => {
      await page.goto(`chrome-extension://${extensionId}/options.html`);
      await page.waitForLoadState('networkidle');

      await page.locator('#token').fill('ghp_invalid_token_12345');
      await page.locator('#owner').fill('test');
      await page.locator('#repo').fill('test-repo');
      await page.locator('#validate-btn').click();

      const validationResult = page.locator('#validation-result');
      await test.expect(validationResult).toHaveClass(/error/, { timeout: 10000 });
      await test.expect(validationResult).toContainText(/invalid|error/i, { timeout: 1000 });
    });
  });

  test.describe('Valid credentials', () => {
    test.skip(!hasTestCredentials(), 'Missing test credentials (PAT, REPO_OWNER, REPO)');

    test('Test Connection succeeds with valid credentials', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    await page.locator('#token').fill(process.env.GITSYNCMARKS_TEST_PAT);
    await page.locator('#owner').fill(process.env.GITSYNCMARKS_TEST_REPO_OWNER);
    await page.locator('#repo').fill(process.env.GITSYNCMARKS_TEST_REPO);

    await page.locator('#validate-btn').click();

    // If onboarding dialog appears (empty folder or pull), click Yes
    try {
      await page.locator('#onboarding-confirm-yes-btn').waitFor({ state: 'visible', timeout: 8000 });
      await page.locator('#onboarding-confirm-yes-btn').click();
    } catch {
      // No dialog - folder may already exist with content
    }

    // Expect success: "Connection OK!" or "Folder created"
    const validationResult = page.locator('#validation-result');
    await test.expect(validationResult).toHaveClass(/success/, { timeout: 15000 });
    await test
      .expect(validationResult)
      .toContainText(/Connection OK|Folder created|Token valid/i, { timeout: 1000 });
  });

    test.skip(!hasTestCredentials(), 'Missing test credentials');
    test('Sync tab auto-saves on change', async ({ page, extensionId }) => {
      await configureExtension(page, extensionId);

      await page.locator('.tab-btn[data-tab="sync"]').click();
      await test.expect(page.locator('#tab-sync')).toHaveClass(/active/);

      await page.locator('#notifications-mode').selectOption('errorsOnly');

      const result = page.locator('#save-sync-result').first();
      await test.expect(result).toHaveClass(/success/, { timeout: 5000 });
      await test.expect(result).toContainText(/saved|Settings saved/i);
    });

    test.skip(!hasTokenAndOwner(), 'Missing token/owner for createRepository mismatch test');
    test('createRepository rejects owner mismatch early', async ({ page, extensionId }) => {
      await page.goto(`chrome-extension://${extensionId}/options.html`);
      await page.waitForLoadState('networkidle');

      const token = process.env.GITSYNCMARKS_TEST_PAT;
      const mismatchedOwner = `${process.env.GITSYNCMARKS_TEST_REPO_OWNER}-mismatch`;
      const response = await page.evaluate(async ({ token: tokenArg, ownerArg }) => {
        return chrome.runtime.sendMessage({
          action: 'createRepository',
          token: tokenArg,
          owner: ownerArg,
          repo: `gitsyncmarks-e2e-mismatch-${Date.now()}`,
          branch: 'main',
        });
      }, { token, ownerArg: mismatchedOwner });

      test.expect(response?.success).toBeFalsy();
      test.expect(response?.code).toBe('OWNER_MISMATCH');
      test.expect(String(response?.message || '')).toMatch(/owner|authenticated user|auto-create/i);
    });
  });
});
