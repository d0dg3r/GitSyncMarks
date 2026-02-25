/**
 * Connection test: Configure GitHub credentials and verify "Test Connection" succeeds.
 * Save Settings test: Sync tab settings can be saved.
 * Requires: GITSYNCMARKS_TEST_PAT, GITSYNCMARKS_TEST_REPO_OWNER, GITSYNCMARKS_TEST_REPO (for credentials + save tests)
 */

const { test } = require('./fixtures/extension.js');
const { deleteE2eRepoIfSafe } = require('./helpers/e2e-repo-cleanup.js');
const { countBookmarkFilesInFolder, ensureMinimalStructure, githubFetch } = require('./helpers/github-api.js');

async function skipWizardIfVisible(page) {
  const wizard = page.locator('#onboarding-wizard-screen');
  if (await wizard.isVisible()) {
    await page.locator('#onboarding-wizard-skip-btn').click();
    await test.expect(wizard).toBeHidden({ timeout: 3000 });
  }
}

async function openOptions(page, extensionId) {
  const url = `chrome-extension://${extensionId}/options.html`;
  try {
    await page.goto(url);
  } catch {
    await page.goto(url);
  }
  await page.waitForLoadState('networkidle');
}

async function configureExtension(page, extensionId) {
  page.on('dialog', (d) => d.dismiss());
  await openOptions(page, extensionId);
  await skipWizardIfVisible(page);
  await page.locator('.sub-tab-btn[data-subtab="github-connection"]').click();
  await page.locator('#token').fill(process.env.GITSYNCMARKS_TEST_PAT);
  await page.locator('#owner').fill(process.env.GITSYNCMARKS_TEST_REPO_OWNER);
  await page.locator('#repo').fill(process.env.GITSYNCMARKS_TEST_REPO);
  await page.locator('#repo').dispatchEvent('change');
  await test.expect(page.locator('#save-github-result')).toHaveClass(/success/, { timeout: 5000 });
}

async function seedLocalBookmarksForToolbarAndOther(page, suffix) {
  return await page.evaluate(async ({ suffixArg }) => {
    const roots = await chrome.bookmarks.getChildren('0');
    const toolbarNode =
      roots.find((n) => n.id === '1') ||
      roots.find((n) => /toolbar|bookmarks bar|lesezeichen-symbolleiste/i.test(String(n.title || '')));
    const otherNode =
      roots.find((n) => n.id === '2') ||
      roots.find((n) => /other|weitere|sonstige|bookmarks menu|menu|menü/i.test(String(n.title || '')));
    if (!toolbarNode?.id || !otherNode?.id) {
      throw new Error('Could not resolve bookmark root folders');
    }
    const toolbarBookmark = await chrome.bookmarks.create({
      parentId: toolbarNode.id,
      title: `E2E Toolbar ${suffixArg}`,
      url: `https://e2e-toolbar-${suffixArg}.example.com`,
    });
    const otherBookmark = await chrome.bookmarks.create({
      parentId: otherNode.id,
      title: `E2E Other ${suffixArg}`,
      url: `https://e2e-other-${suffixArg}.example.com`,
    });
    return {
      toolbarId: toolbarNode.id,
      otherId: otherNode.id,
      toolbarBookmarkId: toolbarBookmark?.id || null,
      otherBookmarkId: otherBookmark?.id || null,
    };
  }, { suffixArg: suffix });
}

async function openWizardAndAdvanceToRepoDetails(page) {
  const wizard = page.locator('#onboarding-wizard-screen');
  if (!(await wizard.isVisible())) {
    await page.locator('.sub-tab-btn[data-subtab="github-connection"]').click();
    await page.locator('#onboarding-wizard-start-btn').click();
  }
  await test.expect(wizard).toBeVisible();

  await page.locator('#onboarding-wizard-next-btn').click(); // welcome -> tokenHelp
  await page.locator('#onboarding-wizard-next-btn').click(); // tokenHelp -> hasToken
  await page.locator('#onboarding-wizard-has-token').selectOption('yes');
  await page.locator('#onboarding-wizard-next-btn').click(); // hasToken -> tokenInput
  await page.locator('#onboarding-wizard-token').fill(process.env.GITSYNCMARKS_TEST_PAT);
  await page.locator('#onboarding-wizard-next-btn').click(); // tokenInput -> repoDecision
}

async function runWizardBootstrapFlow({ page, owner, repo, path, repoFlow }) {
  await page.locator('#onboarding-wizard-repo-flow').selectOption(repoFlow);
  await page.locator('#onboarding-wizard-next-btn').click(); // repoDecision -> repoDetails
  await page.locator('#onboarding-wizard-owner').fill(owner);
  await page.locator('#onboarding-wizard-repo').fill(repo);
  await page.locator('#onboarding-wizard-branch').fill('main');
  await page.locator('#onboarding-wizard-path').fill(path);
  await page.locator('#onboarding-wizard-next-btn').click(); // repoDetails -> environment
  await page.locator('#onboarding-wizard-next-btn').click(); // environment -> check + bootstrap + finish
  await test.expect(page.locator('#onboarding-wizard-next-btn')).toBeEnabled({ timeout: 30000 });
  const wizardResult = page.locator('#onboarding-wizard-result');
  await test.expect(wizardResult).not.toContainText(/Conflict: The file was modified/i, { timeout: 20000 });
  await test.expect(wizardResult).toContainText(/first sync completed|pulled successfully/i, { timeout: 20000 });
}

async function disableAutoSync(page) {
  await page.evaluate(async () => {
    await chrome.storage.sync.set({
      autoSync: false,
      syncOnStartup: false,
      syncOnFocus: false,
    });
  });
}

async function getLocalFileMapCounts(page, basePath = 'bookmarks-probe') {
  return await page.evaluate(async ({ basePathArg }) => {
    const mod = await import(chrome.runtime.getURL('lib/bookmark-serializer.js'));
    const tree = await chrome.bookmarks.getTree();
    const map = mod.bookmarkTreeToFileMap(tree, basePathArg);
    const toolbarCount = Object.keys(map).filter((p) => p.startsWith(`${basePathArg}/toolbar/`) && p.endsWith('.json') && !p.endsWith('/_order.json')).length;
    const otherCount = Object.keys(map).filter((p) => p.startsWith(`${basePathArg}/other/`) && p.endsWith('.json') && !p.endsWith('/_order.json')).length;
    return { toolbarCount, otherCount };
  }, { basePathArg: basePath });
}

async function createSettingsProfileViaRuntime(page, { clientName, password }) {
  return await page.evaluate(async ({ clientNameArg, passwordArg }) => {
    await chrome.storage.local.set({ settingsSyncClientName: clientNameArg });
    return chrome.runtime.sendMessage({
      action: 'createSettingsProfile',
      name: clientNameArg,
      password: passwordArg,
    });
  }, { clientNameArg: clientName, passwordArg: password });
}

async function waitForSettingsProfilePresence(page, filename, shouldExist, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const listed = await page.evaluate(async () => {
      return chrome.runtime.sendMessage({ action: 'listSettingsProfiles' });
    });
    const exists = Boolean(listed?.success && listed.configs.some((cfg) => (cfg.path || cfg.filename) === filename));
    if (exists === shouldExist) return listed;
    await page.waitForTimeout(700);
  }
  throw new Error(`Timed out waiting for profile ${shouldExist ? 'presence' : 'absence'}: ${filename}`);
}

async function waitForRemoteProfileMissing(filename, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await githubFetch(`/contents/bookmarks/${filename}`);
    } catch (err) {
      if (/GitHub API 404/.test(String(err?.message || ''))) return true;
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  return false;
}

const hasTestCredentials = () =>
  process.env.GITSYNCMARKS_TEST_PAT &&
  process.env.GITSYNCMARKS_TEST_REPO_OWNER &&
  process.env.GITSYNCMARKS_TEST_REPO;
const hasTokenOnly = () => !!process.env.GITSYNCMARKS_TEST_PAT;
const hasTokenAndOwner = () =>
  process.env.GITSYNCMARKS_TEST_PAT &&
  process.env.GITSYNCMARKS_TEST_REPO_OWNER;

test.describe('Connection', () => {
  test.skip(!hasTokenOnly(), 'Missing token for wizard-next validation test');
  test('Wizard Next validates token without test button', async ({ page, extensionId }) => {
    await openOptions(page, extensionId);

    const wizard = page.locator('#onboarding-wizard-screen');
    if (!(await wizard.isVisible())) {
      await page.locator('.sub-tab-btn[data-subtab="github-connection"]').click();
      await page.locator('#onboarding-wizard-start-btn').click();
    }
    await test.expect(wizard).toBeVisible();

    await page.locator('#onboarding-wizard-next-btn').click(); // welcome -> tokenHelp
    await page.locator('#onboarding-wizard-next-btn').click(); // tokenHelp -> hasToken
    await page.locator('#onboarding-wizard-has-token').selectOption('yes');
    await page.locator('#onboarding-wizard-next-btn').click(); // hasToken -> tokenInput

    await page.locator('#onboarding-wizard-token').fill(process.env.GITSYNCMARKS_TEST_PAT);
    await page.locator('#onboarding-wizard-next-btn').click(); // tokenInput validates + moves on

    await test.expect(page.locator('#onboarding-wizard-result')).toContainText(/valid|required scope/i, { timeout: 15000 });
    await test.expect(page.locator('#onboarding-wizard-step-title')).toContainText(/Repository setup mode/i);
  });

  test.describe('Invalid token', () => {
    test('Test Connection fails with invalid token', async ({ page, extensionId }) => {
      await page.goto(`chrome-extension://${extensionId}/options.html`);
      await page.waitForLoadState('networkidle');
      await skipWizardIfVisible(page);
      await page.locator('.sub-tab-btn[data-subtab="github-connection"]').click();

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
    test.skip(!hasTokenAndOwner(), 'Missing token/owner for onboarding bootstrap auto-create test');
    test('Bootstrap scenario A: auto-created repo syncs toolbar + other bookmarks', async ({ page, extensionId }, testInfo) => {
      test.setTimeout(90000);
      const token = process.env.GITSYNCMARKS_TEST_PAT;
      const owner = process.env.GITSYNCMARKS_TEST_REPO_OWNER;
      const createdRepo = `gitsyncmarks-e2e-bootstrap-${Date.now()}`;
      const basePath = 'bookmarks';
      await openOptions(page, extensionId);
      await disableAutoSync(page);
      const seeded = await seedLocalBookmarksForToolbarAndOther(page, `a-${Date.now()}`);
      test.expect(Boolean(seeded?.toolbarBookmarkId)).toBeTruthy();
      test.expect(Boolean(seeded?.otherBookmarkId)).toBeTruthy();
      test.expect(['1', 'toolbar_____']).toContain(seeded.toolbarId);
      test.expect(['2', 'menu________']).toContain(seeded.otherId);
      const localCounts = await getLocalFileMapCounts(page);
      test.expect(localCounts.toolbarCount).toBeGreaterThan(0);
      test.expect(localCounts.otherCount).toBeGreaterThan(0);

      try {
        await openWizardAndAdvanceToRepoDetails(page);
        await page.locator('#onboarding-wizard-repo-flow').selectOption('autoCreate');
        await page.locator('#onboarding-wizard-next-btn').click(); // repoDecision -> repoDetails
        await page.locator('#onboarding-wizard-repo').fill(createdRepo);
        await page.locator('#onboarding-wizard-branch').fill('main');
        await page.locator('#onboarding-wizard-path').fill(basePath);
        await page.locator('#onboarding-wizard-next-btn').click(); // repoDetails -> environment
        await page.locator('#onboarding-wizard-next-btn').click(); // environment -> bootstrap

        const wizardStatus = String(await page.locator('#onboarding-wizard-result').textContent() || '');
        test.skip(
          /cannot create repositories|auto-create supports only|could not be created/i.test(wizardStatus),
          'Current test credentials do not allow auto-create repository bootstrap.'
        );

        await test.expect(page.locator('#onboarding-wizard-next-btn')).toBeEnabled({ timeout: 30000 });
        await test.expect(page.locator('#onboarding-wizard-result')).not.toContainText(/Conflict: The file was modified/i, { timeout: 20000 });
        await test.expect(page.locator('#onboarding-wizard-result')).toContainText(/first sync completed|pulled successfully/i, { timeout: 20000 });
        const repoTarget = { owner, repo: createdRepo };
        const toolbarCount = await countBookmarkFilesInFolder(basePath, 'toolbar', repoTarget);
        const otherCount = await countBookmarkFilesInFolder(basePath, 'other', repoTarget);
        test.expect(toolbarCount).toBeGreaterThan(0);
        test.expect(otherCount).toBeGreaterThan(0);
      } finally {
        const cleanupResult = await deleteE2eRepoIfSafe({ token, owner, repo: createdRepo });
        await testInfo.attach('bootstrap-repo-cleanup', {
          contentType: 'application/json',
          body: Buffer.from(JSON.stringify({
            owner,
            repo: createdRepo,
            ...cleanupResult,
          }, null, 2)),
        });
      }
    });

    test.skip(!hasTestCredentials(), 'Missing test credentials for existing empty repo test');
    test('Bootstrap scenario B: existing repo without bookmarks folder syncs toolbar + other', async ({ page, extensionId }) => {
      const owner = process.env.GITSYNCMARKS_TEST_REPO_OWNER;
      const repo = process.env.GITSYNCMARKS_TEST_REPO;
      const basePath = `bookmarks-e2e-empty-${Date.now()}`;
      await openOptions(page, extensionId);
      await disableAutoSync(page);
      const seeded = await seedLocalBookmarksForToolbarAndOther(page, `b-${Date.now()}`);
      test.expect(Boolean(seeded?.toolbarBookmarkId)).toBeTruthy();
      test.expect(Boolean(seeded?.otherBookmarkId)).toBeTruthy();
      test.expect(['1', 'toolbar_____']).toContain(seeded.toolbarId);
      test.expect(['2', 'menu________']).toContain(seeded.otherId);
      const localCounts = await getLocalFileMapCounts(page);
      test.expect(localCounts.toolbarCount).toBeGreaterThan(0);
      test.expect(localCounts.otherCount).toBeGreaterThan(0);
      await openWizardAndAdvanceToRepoDetails(page);
      await runWizardBootstrapFlow({ page, owner, repo, path: basePath, repoFlow: 'manual' });

      await test.expect(page.locator('#onboarding-wizard-result')).not.toContainText(/Conflict: The file was modified/i);
      const toolbarCount = await countBookmarkFilesInFolder(basePath, 'toolbar');
      const otherCount = await countBookmarkFilesInFolder(basePath, 'other');
      test.expect(toolbarCount).toBeGreaterThan(0);
      test.expect(otherCount).toBeGreaterThan(0);
    });

    test.skip(!hasTestCredentials(), 'Missing test credentials for existing structured repo test');
    test('Bootstrap scenario C: existing repo with folder structure syncs toolbar + other', async ({ page, extensionId }) => {
      const owner = process.env.GITSYNCMARKS_TEST_REPO_OWNER;
      const repo = process.env.GITSYNCMARKS_TEST_REPO;
      const basePath = `bookmarks-e2e-struct-${Date.now()}`;
      await ensureMinimalStructure(basePath);
      await openOptions(page, extensionId);
      await disableAutoSync(page);
      const seeded = await seedLocalBookmarksForToolbarAndOther(page, `c-${Date.now()}`);
      test.expect(Boolean(seeded?.toolbarBookmarkId)).toBeTruthy();
      test.expect(Boolean(seeded?.otherBookmarkId)).toBeTruthy();
      test.expect(['1', 'toolbar_____']).toContain(seeded.toolbarId);
      test.expect(['2', 'menu________']).toContain(seeded.otherId);
      const localCounts = await getLocalFileMapCounts(page);
      test.expect(localCounts.toolbarCount).toBeGreaterThan(0);
      test.expect(localCounts.otherCount).toBeGreaterThan(0);
      await openWizardAndAdvanceToRepoDetails(page);
      await runWizardBootstrapFlow({ page, owner, repo, path: basePath, repoFlow: 'manual' });

      await test.expect(page.locator('#onboarding-wizard-result')).not.toContainText(/Conflict: The file was modified/i);
      const toolbarCount = await countBookmarkFilesInFolder(basePath, 'toolbar');
      const otherCount = await countBookmarkFilesInFolder(basePath, 'other');
      test.expect(toolbarCount).toBeGreaterThan(0);
      test.expect(otherCount).toBeGreaterThan(0);
    });

    test.skip(!hasTestCredentials(), 'Missing test credentials (PAT, REPO_OWNER, REPO)');

    test('Test Connection succeeds with valid credentials', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await skipWizardIfVisible(page);
    await page.locator('.sub-tab-btn[data-subtab="github-connection"]').click();

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

    test.skip(!hasTestCredentials(), 'Missing test credentials');
    test('Test Connection offers one-click path init when path is missing', async ({ page, extensionId }) => {
      await page.goto(`chrome-extension://${extensionId}/options.html`);
      await page.waitForLoadState('networkidle');
      await skipWizardIfVisible(page);
      await page.locator('.sub-tab-btn[data-subtab="github-connection"]').click();

      await page.locator('#token').fill(process.env.GITSYNCMARKS_TEST_PAT);
      await page.locator('#owner').fill(process.env.GITSYNCMARKS_TEST_REPO_OWNER);
      await page.locator('#repo').fill(process.env.GITSYNCMARKS_TEST_REPO);
      await page.locator('#filepath').fill(`bookmarks-e2e-init-${Date.now()}`);

      await page.locator('#validate-btn').click();

      const initGroup = page.locator('#connection-path-init-group');
      await test.expect(initGroup).toBeVisible({ timeout: 15000 });
      await test.expect(page.locator('#connection-path-init-btn')).toBeVisible();
      await test.expect(page.locator('#connection-path-init-hint')).toContainText(/missing|empty|baseline/i);
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

    test.skip(!hasTestCredentials(), 'Missing test credentials for settings profiles list');
    test('listSettingsProfiles returns repository profile configs', async ({ page, extensionId }) => {
      await configureExtension(page, extensionId);
      const response = await page.evaluate(async () => {
        return chrome.runtime.sendMessage({ action: 'listSettingsProfiles' });
      });

      test.expect(response?.success).toBeTruthy();
      test.expect(Array.isArray(response?.configs)).toBeTruthy();
      if (response.configs.length > 0) {
        const allPathsValid = response.configs.every((cfg) =>
          /^profiles\/[^/]+\/settings\.enc$/.test(cfg.path || cfg.filename)
        );
        test.expect(allPathsValid).toBeTruthy();
        const hasHashLikeNames = response.configs.some((cfg) =>
          /^device-[a-f0-9]{6,}$/i.test(String(cfg.alias || cfg.name || ''))
        );
        test.expect(hasHashLikeNames).toBeFalsy();
      }
    });

    test.skip(!hasTestCredentials(), 'Missing test credentials for client-name conflict test');
    test('createSettingsProfile enforces unique client name', async ({ page, extensionId }) => {
      await configureExtension(page, extensionId);
      const clientName = `e2e-client-${Date.now()}`;
      const password = `pw-${Date.now()}`;

      const first = await createSettingsProfileViaRuntime(page, { clientName, password });
      test.expect(first?.success).toBeTruthy();
      await waitForSettingsProfilePresence(page, first.filename, true, 20000);

      const second = await page.evaluate(async ({ clientNameArg, passwordArg }) => {
        return chrome.runtime.sendMessage({
          action: 'createSettingsProfile',
          name: clientNameArg,
          password: passwordArg,
        });
      }, { clientNameArg: clientName, passwordArg: password });
      test.expect(second?.success).toBeFalsy();
      test.expect(second?.code).toBe('CLIENT_NAME_CONFLICT');
    });

    test.skip(!hasTestCredentials(), 'Missing test credentials for settings profile import test');
    test('importSettingsProfile applies stored settings', async ({ page, extensionId }) => {
      await configureExtension(page, extensionId);
      const clientName = `e2e-import-${Date.now()}`;
      const password = `pw-${Date.now()}`;
      const desiredMode = 'all';
      const changedMode = 'errorsOnly';

      const created = await page.evaluate(async ({ clientNameArg, passwordArg, modeArg }) => {
        await chrome.storage.sync.set({ notificationsMode: modeArg });
        await chrome.storage.local.set({ settingsSyncClientName: clientNameArg });
        return chrome.runtime.sendMessage({
          action: 'createSettingsProfile',
          name: clientNameArg,
          password: passwordArg,
        });
      }, { clientNameArg: clientName, passwordArg: password, modeArg: desiredMode });
      test.expect(created?.success).toBeTruthy();
      await waitForSettingsProfilePresence(page, created.filename, true, 20000);

      let importedMode = { resp: null, mode: null };
      for (let i = 0; i < 6; i += 1) {
        importedMode = await page.evaluate(async ({ filenameArg, passwordArg, changedArg }) => {
          await chrome.storage.sync.set({ notificationsMode: changedArg });
          const resp = await chrome.runtime.sendMessage({
            action: 'importSettingsProfile',
            filename: filenameArg,
            password: passwordArg,
          });
          const current = await chrome.storage.sync.get({ notificationsMode: '' });
          return { resp, mode: current.notificationsMode };
        }, { filenameArg: created.filename, passwordArg: password, changedArg: changedMode });
        if (importedMode.resp?.success && importedMode.mode === desiredMode) break;
        await page.waitForTimeout(700);
      }

      test.expect(importedMode.resp?.success).toBeTruthy();
      test.expect(importedMode.mode).toBe(desiredMode);
    });

    test.skip(!hasTestCredentials(), 'Missing test credentials for settings profile sync test');
    test('syncSettingsToProfile roundtrip persists own profile settings', async ({ page, extensionId }) => {
      await configureExtension(page, extensionId);
      const clientName = `e2e-sync-${Date.now()}`;
      const password = `pw-${Date.now()}`;
      const initialMode = 'all';
      const syncedMode = 'errorsOnly';

      const created = await page.evaluate(async ({ clientNameArg, passwordArg, initialModeArg }) => {
        await chrome.storage.sync.set({ notificationsMode: initialModeArg });
        await chrome.storage.local.set({ settingsSyncClientName: clientNameArg });
        return chrome.runtime.sendMessage({
          action: 'createSettingsProfile',
          name: clientNameArg,
          password: passwordArg,
        });
      }, { clientNameArg: clientName, passwordArg: password, initialModeArg: initialMode });
      test.expect(created?.success).toBeTruthy();

      const synced = await page.evaluate(async ({ filenameArg, passwordArg, syncedModeArg }) => {
        await chrome.storage.sync.set({ notificationsMode: syncedModeArg });
        return chrome.runtime.sendMessage({
          action: 'syncSettingsToProfile',
          filename: filenameArg,
          password: passwordArg,
        });
      }, { filenameArg: created.filename, passwordArg: password, syncedModeArg: syncedMode });
      test.expect(synced?.success).toBeTruthy();

      let roundtrip = { resp: null, mode: null };
      for (let i = 0; i < 6; i += 1) {
        roundtrip = await page.evaluate(async ({ filenameArg, passwordArg, resetModeArg }) => {
          await chrome.storage.sync.set({ notificationsMode: resetModeArg });
          const resp = await chrome.runtime.sendMessage({
            action: 'importSettingsProfile',
            filename: filenameArg,
            password: passwordArg,
          });
          const current = await chrome.storage.sync.get({ notificationsMode: '' });
          return { resp, mode: current.notificationsMode };
        }, { filenameArg: created.filename, passwordArg: password, resetModeArg: initialMode });
        if (roundtrip.resp?.success && roundtrip.mode === syncedMode) break;
        await page.waitForTimeout(700);
      }

      test.expect(roundtrip.resp?.success).toBeTruthy();
      test.expect(roundtrip.mode).toBe(syncedMode);
    });

    test.skip(!hasTestCredentials(), 'Missing test credentials for settings profile mismatch test');
    test('syncSettingsToProfile rejects mismatched client name', async ({ page, extensionId }) => {
      await configureExtension(page, extensionId);
      const clientA = `e2e-client-a-${Date.now()}`;
      const clientB = `e2e-client-b-${Date.now()}`;
      const password = `pw-${Date.now()}`;

      const created = await createSettingsProfileViaRuntime(page, { clientName: clientA, password });
      test.expect(created?.success).toBeTruthy();

      const mismatch = await page.evaluate(async ({ clientBArg, filenameArg, passwordArg }) => {
        await chrome.storage.local.set({ settingsSyncClientName: clientBArg });
        return chrome.runtime.sendMessage({
          action: 'syncSettingsToProfile',
          filename: filenameArg,
          password: passwordArg,
        });
      }, { clientBArg: clientB, filenameArg: created.filename, passwordArg: password });

      test.expect(mismatch?.success).toBeFalsy();
      test.expect(mismatch?.code).toBe('CLIENT_NAME_MISMATCH');
    });

    test.skip(!hasTestCredentials(), 'Missing test credentials for settings profile delete test');
    test('deleteSettingsProfile removes profile from repo and listing', async ({ page, extensionId }) => {
      await configureExtension(page, extensionId);
      const clientName = `e2e-delete-${Date.now()}`;
      const password = `pw-${Date.now()}`;

      const created = await createSettingsProfileViaRuntime(page, { clientName, password });
      test.expect(created?.success).toBeTruthy();
      const filename = created.filename;
      test.expect(typeof filename).toBe('string');

      const beforeDelete = await waitForSettingsProfilePresence(page, filename, true, 20000);
      test.expect(beforeDelete?.success).toBeTruthy();
      test.expect(beforeDelete.configs.some((cfg) => (cfg.path || cfg.filename) === filename)).toBeTruthy();

      const deleted = await page.evaluate(async ({ filenameArg }) => {
        return chrome.runtime.sendMessage({ action: 'deleteSettingsProfile', filename: filenameArg });
      }, { filenameArg: filename });
      test.expect(deleted?.success).toBeTruthy();

      const afterDelete = await waitForSettingsProfilePresence(page, filename, false, 20000);
      test.expect(afterDelete?.success).toBeTruthy();
      test.expect(afterDelete.configs.some((cfg) => (cfg.path || cfg.filename) === filename)).toBeFalsy();

      const repoMissing = await waitForRemoteProfileMissing(filename, 20000);
      test.expect(repoMissing).toBeTruthy();
    });
  });
});
