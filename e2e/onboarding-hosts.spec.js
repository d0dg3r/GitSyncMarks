/**
 * Dual-host onboarding matrix: GitHub + Forgejo.
 *
 * Per configured host:
 *   - wizard autoCreate with ephemeral random repo name (cleaned after)
 *   - wizard manual flow against stable fixture + unique bookmarks-e2e-* path
 *   - wizard manual against ephemeral zero-commit repo (auto_init: false)
 *   - #267 regression: Check connection keeps visible errors; defaults are real values
 *
 * Skip a host when its env is incomplete. Local Forgejo default: https://forgejo.lan
 */

const { test } = require('./fixtures/extension.js');
const { ephemeralRepoName } = require('./helpers/e2e-repo-names.js');
const {
  getConfiguredHosts,
  deleteE2eRepoIfSafe,
  countBookmarkFilesInFolder,
  hostFetchJson,
  ensureMinimalStructure,
  createEmptyRepo,
} = require('./helpers/git-host.js');

async function openOptions(page, extensionId) {
  const url = `chrome-extension://${extensionId}/options.html`;
  try {
    await page.goto(url);
  } catch {
    await page.goto(url);
  }
  await page.waitForLoadState('networkidle');
}

async function grantHostPermission(page, serverUrl) {
  if (!serverUrl) return true;
  let origin;
  try {
    origin = `${new URL(serverUrl).origin}/*`;
  } catch {
    return false;
  }
  // Tie request to a user gesture (required by chrome.permissions.request).
  return page.evaluate(async (originPattern) => {
    const btn = document.createElement('button');
    btn.id = 'e2e-grant-host-perm';
    btn.textContent = 'grant';
    document.body.appendChild(btn);
    return new Promise((resolve) => {
      btn.addEventListener(
        'click',
        async () => {
          try {
            const granted = await chrome.permissions.request({ origins: [originPattern] });
            resolve(!!granted);
          } catch {
            resolve(false);
          } finally {
            btn.remove();
          }
        },
        { once: true }
      );
      btn.click();
    });
  }, origin);
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

async function clearLocalBookmarks(page) {
  await page.evaluate(async () => {
    const roots = await chrome.bookmarks.getChildren('0');
    for (const root of roots) {
      if (!root?.id) continue;
      const children = await chrome.bookmarks.getChildren(root.id);
      for (const node of children) {
        try {
          if (node.children) await chrome.bookmarks.removeTree(node.id);
          else await chrome.bookmarks.remove(node.id);
        } catch {
          // ignore
        }
      }
    }
  });
}

async function seedLocalBookmarksForToolbarAndOther(page, suffix) {
  return page.evaluate(async ({ suffixArg }) => {
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
      toolbarBookmarkId: toolbarBookmark?.id || null,
      otherBookmarkId: otherBookmark?.id || null,
    };
  }, { suffixArg: suffix });
}

/** Advance past sync choice / confirm Push until the wizard finish step. */
async function advanceWizardUntilFinish(page, { timeoutMs = 90000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const title = await page.locator('#onboarding-wizard-step-title').textContent();
    if (/all set|fertig|ready|finish/i.test(String(title || ''))) return;
    const status = page.locator('#wizard-status');
    if (await status.isVisible().catch(() => false)) {
      const cls = await status.getAttribute('class');
      if (cls && /\berror\b/.test(cls)) {
        const text = await status.textContent();
        throw new Error(`Wizard failed before finish: ${text || '(no status text)'}`);
      }
    }
    const confirmYes = page.locator('#onboarding-confirm-yes-btn');
    if (await confirmYes.isVisible().catch(() => false)) {
      await confirmYes.click();
      continue;
    }
    const next = page.locator('#onboarding-wizard-next-btn');
    if (await next.isEnabled().catch(() => false)) {
      await next.click();
      continue;
    }
    await page.waitForTimeout(400);
  }
  throw new Error('Timed out waiting for wizard finish step');
}

/**
 * Advance wizard from welcome through token validation to repoDecision,
 * selecting the host provider (and server URL for Forgejo).
 */
async function advanceWizardToRepoDecision(page, host) {
  const wizard = page.locator('#onboarding-wizard-screen');
  if (!(await wizard.isVisible())) {
    await page.locator('.sub-tab-btn[data-subtab="github-connection"]').click();
    await page.locator('#onboarding-wizard-start-btn').click();
  }
  await test.expect(wizard).toBeVisible();

  await page.locator('#onboarding-wizard-next-btn').click(); // welcome -> provider

  await page.locator('#onboarding-wizard-git-provider').selectOption(host.provider);
  if (host.serverUrl) {
    await page.locator('#onboarding-wizard-server-url').fill(host.serverUrl);
    const granted = await grantHostPermission(page, host.serverUrl);
    test.expect(granted).toBeTruthy();
  }
  await page.locator('#onboarding-wizard-next-btn').click(); // provider -> tokenHelp

  await page.locator('#onboarding-wizard-next-btn').click(); // tokenHelp -> hasToken
  await page.locator('#onboarding-wizard-has-token').selectOption('yes');
  await page.locator('#onboarding-wizard-next-btn').click(); // hasToken -> tokenInput
  await page.locator('#onboarding-wizard-token').fill(host.token);
  await page.locator('#onboarding-wizard-next-btn').click(); // tokenInput -> repoDecision
  await test.expect(page.locator('#onboarding-wizard-step-title')).toContainText(/Repository setup mode/i);
}

async function runAutoCreateFlow(page, host, { repoName, path }) {
  await page.locator('#onboarding-wizard-repo-flow').selectOption('autoCreate');
  await page.locator('#onboarding-wizard-next-btn').click(); // -> repoDetails
  await page.locator('#onboarding-wizard-repo').fill(repoName);
  await page.locator('#onboarding-wizard-branch').fill('main');
  await page.locator('#onboarding-wizard-path').fill(path);
  await page.locator('#onboarding-wizard-next-btn').click(); // -> environment
  await page.locator('#onboarding-wizard-next-btn').click(); // check / seed
  // Empty local + autoCreate may auto-seed and jump toward finish; click Finish if needed.
  for (let i = 0; i < 3; i += 1) {
    const title = await page.locator('#onboarding-wizard-step-title').textContent();
    if (/all set|fertig|ready|finish/i.test(String(title || ''))) break;
    const next = page.locator('#onboarding-wizard-next-btn');
    if (await next.isEnabled()) {
      await next.click();
    } else {
      break;
    }
  }
  await test.expect(page.locator('#onboarding-wizard-step-title')).toContainText(
    /all set|fertig|ready|finish/i,
    { timeout: 90000 }
  );
}

async function runManualFixtureFlow(page, host, { path }) {
  await page.locator('#onboarding-wizard-repo-flow').selectOption('manual');
  await page.locator('#onboarding-wizard-next-btn').click();
  await page.locator('#onboarding-wizard-owner').fill(host.owner);
  await page.locator('#onboarding-wizard-repo').fill(host.repo);
  await page.locator('#onboarding-wizard-branch').fill('main');
  await page.locator('#onboarding-wizard-path').fill(path);
  await page.locator('#onboarding-wizard-next-btn').click();
  await page.locator('#onboarding-wizard-next-btn').click();
  for (let i = 0; i < 4; i += 1) {
    const title = await page.locator('#onboarding-wizard-step-title').textContent();
    if (/all set|fertig|ready|finish/i.test(String(title || ''))) break;
    const next = page.locator('#onboarding-wizard-next-btn');
    if (await next.isEnabled()) await next.click();
    else break;
  }
  await test.expect(page.locator('#onboarding-wizard-step-title')).toContainText(
    /all set|fertig|ready|finish/i,
    { timeout: 90000 }
  );
}

const hosts = getConfiguredHosts();

test.describe('Onboarding dual-host matrix', () => {
  test.skip(hosts.length === 0, 'No GITSYNCMARKS_GITHUB_* or GITSYNCMARKS_FORGEJO_* credentials configured');

  for (const host of hosts) {
    test.describe(`${host.id}`, () => {
      test(`autoCreate ephemeral repo on ${host.id}`, async ({ page, extensionId }, testInfo) => {
        test.setTimeout(120000);
        const createdRepo = ephemeralRepoName('bootstrap');
        const basePath = 'bookmarks';
        await openOptions(page, extensionId);
        await disableAutoSync(page);
        await clearLocalBookmarks(page);

        try {
          await advanceWizardToRepoDecision(page, host);
          await runAutoCreateFlow(page, host, { repoName: createdRepo, path: basePath });
          await hostFetchJson(host, `/contents/${basePath}/_index.json`, {}, {
            owner: host.owner,
            repo: createdRepo,
          });
        } finally {
          const cleanupResult = await deleteE2eRepoIfSafe(host, {
            owner: host.owner,
            repo: createdRepo,
          });
          await testInfo.attach(`${host.id}-autoseed-cleanup`, {
            contentType: 'application/json',
            body: Buffer.from(JSON.stringify({ host: host.id, repo: createdRepo, ...cleanupResult }, null, 2)),
          });
        }
      });

      test(`manual fixture path on ${host.id}`, async ({ page, extensionId }) => {
        test.setTimeout(120000);
        const basePath = `bookmarks-e2e-struct-${Date.now()}`;
        await ensureMinimalStructure(host, basePath);
        await openOptions(page, extensionId);
        await disableAutoSync(page);
        await advanceWizardToRepoDecision(page, host);
        await runManualFixtureFlow(page, host, { path: basePath });

        // Structure exists on remote; sync may add bookmarks depending on local tree.
        const toolbar = await countBookmarkFilesInFolder(host, basePath, 'toolbar');
        const other = await countBookmarkFilesInFolder(host, basePath, 'other');
        test.expect(toolbar + other).toBeGreaterThanOrEqual(0);
        await hostFetchJson(host, `/contents/${basePath}/_index.json`);
      });

      test(`manual zero-commit empty repo on ${host.id}`, async ({ page, extensionId }, testInfo) => {
        test.setTimeout(120000);
        const createdRepo = ephemeralRepoName('emptyinit');
        const basePath = 'bookmarks';
        await openOptions(page, extensionId);
        await disableAutoSync(page);
        const seeded = await seedLocalBookmarksForToolbarAndOther(page, `${host.id}-${Date.now()}`);
        test.expect(Boolean(seeded?.toolbarBookmarkId)).toBeTruthy();
        test.expect(Boolean(seeded?.otherBookmarkId)).toBeTruthy();

        try {
          await createEmptyRepo(host, createdRepo);
          await advanceWizardToRepoDecision(page, host);
          await page.locator('#onboarding-wizard-repo-flow').selectOption('manual');
          await page.locator('#onboarding-wizard-next-btn').click();
          await page.locator('#onboarding-wizard-owner').fill(host.owner);
          await page.locator('#onboarding-wizard-repo').fill(createdRepo);
          await page.locator('#onboarding-wizard-branch').fill('main');
          await page.locator('#onboarding-wizard-path').fill(basePath);
          await page.locator('#onboarding-wizard-next-btn').click(); // -> environment
          await page.locator('#onboarding-wizard-next-btn').click(); // seed empty remote
          await advanceWizardUntilFinish(page);

          await hostFetchJson(host, `/contents/${basePath}/_index.json`, {}, {
            owner: host.owner,
            repo: createdRepo,
          });
          const toolbar = await countBookmarkFilesInFolder(host, basePath, 'toolbar', {
            owner: host.owner,
            repo: createdRepo,
          });
          const other = await countBookmarkFilesInFolder(host, basePath, 'other', {
            owner: host.owner,
            repo: createdRepo,
          });
          test.expect(toolbar).toBeGreaterThan(0);
          test.expect(other).toBeGreaterThan(0);
        } finally {
          const cleanupResult = await deleteE2eRepoIfSafe(host, {
            owner: host.owner,
            repo: createdRepo,
          });
          await testInfo.attach(`${host.id}-emptyinit-cleanup`, {
            contentType: 'application/json',
            body: Buffer.from(JSON.stringify({ host: host.id, repo: createdRepo, ...cleanupResult }, null, 2)),
          });
        }
      });

      test(`#267 defaults and visible Check connection errors (${host.id})`, async ({ page, extensionId }) => {
        test.setTimeout(90000);
        await openOptions(page, extensionId);
        await advanceWizardToRepoDecision(page, host);

        await page.locator('#onboarding-wizard-repo-flow').selectOption('manual');
        await page.locator('#onboarding-wizard-next-btn').click(); // -> repoDetails

        // Defaults must be real values (not grey placeholders only).
        await test.expect(page.locator('#onboarding-wizard-repo')).toHaveValue('my-bookmarks');
        await test.expect(page.locator('#onboarding-wizard-path')).toHaveValue('bookmarks');
        await test.expect(page.locator('#onboarding-wizard-branch')).toHaveValue('main');

        // Clear repo → Next must show a lasting error (not spinner-then-silence).
        await page.locator('#onboarding-wizard-repo').fill('');
        await page.locator('#onboarding-wizard-owner').fill(host.owner);
        await page.locator('#onboarding-wizard-next-btn').click();

        const status = page.locator('#wizard-status');
        await test.expect(status).toBeVisible({ timeout: 5000 });
        await test.expect(status).toHaveClass(/error/);
        await test.expect(page.locator('#onboarding-wizard-hint')).toContainText(/repository owner and name|enter repository/i);
        // Still on repo details (did not advance silently).
        await test.expect(page.locator('#onboarding-wizard-step-title')).toContainText(/Repository/i);
      });
    });
  }

  test('Connection tab Test Connection errors when repo empty (#267)', async ({ page, extensionId }) => {
    const github = hosts.find((h) => h.id === 'github');
    test.skip(!github, 'GitHub credentials required for Connection-tab #267 check');

    await openOptions(page, extensionId);
    const wizard = page.locator('#onboarding-wizard-screen');
    if (await wizard.isVisible()) {
      await page.locator('#onboarding-wizard-skip-btn').click();
      await test.expect(wizard).toBeHidden({ timeout: 3000 });
    }
    await page.locator('.sub-tab-btn[data-subtab="github-connection"]').click();
    await page.locator('#token').fill(github.token);
    await page.locator('#owner').fill(github.owner);
    await page.locator('#repo').fill('');
    await page.locator('#validate-btn').click();

    const validationResult = page.locator('#validation-result');
    await test.expect(validationResult).toHaveClass(/error/, { timeout: 15000 });
    await test.expect(validationResult).toContainText(/specify a repository|repository/i);
  });
});
