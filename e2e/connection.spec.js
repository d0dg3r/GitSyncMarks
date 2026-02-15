/**
 * Connection test: Configure GitHub credentials and verify "Test Connection" succeeds.
 * Requires: GITSYNCMARKS_TEST_PAT, GITSYNCMARKS_TEST_REPO_OWNER, GITSYNCMARKS_TEST_REPO
 */

const { test } = require('./fixtures/extension.js');

const hasTestCredentials = () =>
  process.env.GITSYNCMARKS_TEST_PAT &&
  process.env.GITSYNCMARKS_TEST_REPO_OWNER &&
  process.env.GITSYNCMARKS_TEST_REPO;

test.describe('Connection', () => {
  test.skip(!hasTestCredentials(), 'Missing test credentials (PAT, REPO_OWNER, REPO)');

  test('Test Connection succeeds with valid credentials', async ({
    page,
    extensionId,
  }) => {
    // Dismiss "Create folder?" or "Pull now?" dialogs if they appear
    page.on('dialog', (dialog) => dialog.dismiss());

    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    await page.locator('#token').fill(process.env.GITSYNCMARKS_TEST_PAT);
    await page.locator('#owner').fill(process.env.GITSYNCMARKS_TEST_REPO_OWNER);
    await page.locator('#repo').fill(process.env.GITSYNCMARKS_TEST_REPO);

    await page.locator('#validate-btn').click();

    // Expect success: "Connection OK!" or "Folder created"
    const validationResult = page.locator('#validation-result');
    await test.expect(validationResult).toHaveClass(/success/, { timeout: 15000 });
    await test
      .expect(validationResult)
      .toContainText(/Connection OK|Folder created|Token valid/i, { timeout: 1000 });
  });
});
