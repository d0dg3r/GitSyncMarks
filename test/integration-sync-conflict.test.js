/**
 * Integration test: two browsers sync one repository and the popup's per-file conflict choice
 * settles the conflict. Runs the real sync code; only the browser (storage, bookmarks) and
 * GitHub's HTTP API are replaced by in-memory fakes (test/helpers).
 */

import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeBrowser } from './helpers/fake-browser.js';
import { createFakeGitHub } from './helpers/fake-github.js';

let sync, resolveConflictFile, getSyncState, previewSync;
const realFetch = globalThis.fetch;

before(async () => {
  // The modules read the global `chrome` when they run, so install one browser first.
  globalThis.chrome = createFakeBrowser().chrome;
  ({ sync, resolveConflictFile, previewSync } = await import('../lib/sync-core.js'));
  ({ getSyncState } = await import('../lib/profile-manager.js'));
});

after(() => {
  globalThis.fetch = realFetch;
});

const URL_SAME = 'https://same.test/';

/** Bookmark files only (no _order.json / _index.json) in a repository file map. */
const bookmarkFiles = (files) =>
  Object.keys(files).filter((path) => path.endsWith('.json') && !/_(order|index)\.json$/.test(path));

/** Profile that points at the fake repository; the token is stored as plain text (legacy form). */
function seedProfile(browser) {
  browser.sync.profiles = {
    default: { name: 'Test', owner: 'alice', repo: 'marks', branch: 'main', filePath: 'bookmarks', gitProvider: 'github' },
  };
  browser.sync.activeProfileId = 'default';
  browser.local.profileTokens = { default: { primary: 'ghp_test_token' } };
}

/** Switch the global browser the modules see. */
function useBrowser(browser) {
  globalThis.chrome = browser.chrome;
}

async function setupTwoBrowsers() {
  const github = createFakeGitHub();
  globalThis.fetch = github.fetch;
  const a = createFakeBrowser();
  const b = createFakeBrowser();
  seedProfile(a);
  seedProfile(b);

  // A creates the bookmark and pushes it; B pulls it.
  useBrowser(a);
  await a.bookmarks.create({ parentId: '1', title: 'Same', url: URL_SAME });
  assert.equal((await sync()).success, true, 'first push from A');
  useBrowser(b);
  assert.equal((await sync()).success, true, 'first pull on B');
  assert.deepEqual(b.bookmarks.toolbarBookmarks(), [{ title: 'Same', url: URL_SAME }]);
  return { github, a, b };
}

/** Both browsers change the same bookmark file differently (same slug, so the same path). */
async function makeConflict({ a, b }) {
  useBrowser(a);
  a.bookmarks.renameByUrl(URL_SAME, 'same');
  assert.equal((await sync()).success, true, 'A pushes its rename');

  useBrowser(b);
  b.bookmarks.renameByUrl(URL_SAME, 'SAME');
  const result = await sync();
  assert.equal(result.conflict, true, 'B reports a conflict');
  const state = await getSyncState('default');
  assert.equal(state.conflicts.length, 1);
  return state.conflicts[0];
}

describe('two browsers, one repository: per-file conflict choice', () => {
  let env;
  beforeEach(async () => {
    env = await setupTwoBrowsers();
  });

  it('lists the conflicting bookmark with both versions', async () => {
    const conflict = await makeConflict(env);
    assert.equal(conflict.local.title, 'SAME');
    assert.equal(conflict.remote.title, 'same');
  });

  it('"keep this browser" applies the local version everywhere', async () => {
    const conflict = await makeConflict(env);
    const { a, b, github } = env;
    useBrowser(b);
    await resolveConflictFile(conflict.path, 'local');
    const result = await sync();
    assert.equal(result.success, true);

    assert.deepEqual(b.bookmarks.toolbarBookmarks(), [{ title: 'SAME', url: URL_SAME }]);
    assert.match(github.files()[conflict.path], /"title": "SAME"/);
    const state = await getSyncState('default');
    assert.equal(state.hasConflict, false);
    assert.deepEqual(state.conflicts, []);
    useBrowser(a);
  });

  it('"keep repository" applies the remote version locally', async () => {
    const conflict = await makeConflict(env);
    const { b, github } = env;
    useBrowser(b);
    await resolveConflictFile(conflict.path, 'remote');
    const result = await sync();
    assert.equal(result.success, true);

    assert.deepEqual(b.bookmarks.toolbarBookmarks(), [{ title: 'same', url: URL_SAME }]);
    assert.match(github.files()[conflict.path], /"title": "same"/);
  });

  it('keeps the conflict open until every file has a choice', async () => {
    const conflict = await makeConflict(env);
    const { b } = env;
    useBrowser(b);
    // A choice for an unrelated path must not settle this conflict.
    await resolveConflictFile('bookmarks/toolbar/other_0000.json', 'local');
    const result = await sync();
    assert.equal(result.conflict, true);
    const state = await getSyncState('default');
    assert.equal(state.conflicts.length, 1);
    assert.equal(state.conflicts[0].path, conflict.path);
  });

  it('two different new titles for one bookmark are one conflict, not two bookmarks', async () => {
    const { a, b, github } = env;
    useBrowser(a);
    a.bookmarks.renameByUrl(URL_SAME, 'Alpha');
    assert.equal((await sync()).success, true, 'A pushes Alpha');

    useBrowser(b);
    b.bookmarks.renameByUrl(URL_SAME, 'Beta');
    const result = await sync();
    assert.equal(result.conflict, true, 'B reports one conflict');
    const state = await getSyncState('default');
    assert.equal(state.conflicts.length, 1);
    assert.equal(bookmarkFiles(github.files()).length, 1, 'remote still has one bookmark file');

    await resolveConflictFile(state.conflicts[0].path, 'remote');
    assert.equal((await sync()).success, true);
    assert.deepEqual(b.bookmarks.toolbarBookmarks(), [{ title: 'Alpha', url: URL_SAME }]);
    assert.equal(bookmarkFiles(github.files()).length, 1, 'no duplicate after choosing remote');
    useBrowser(a);
  });

  it('preview after a sync reuses the base: no bookmark file is downloaded', async () => {
    const { b, github } = env;
    useBrowser(b);
    const before = github.requests.length;
    const preview = await previewSync();
    assert.equal(preview.success, true);
    assert.deepEqual(preview.pull, { added: 0, removed: 0 });
    // Generated files (README, bookmarks.html, feed) are not part of the base and are fetched;
    // their number is fixed. Bookmark files must come from the base.
    const downloaded = github.requests
      .slice(before)
      .filter((r) => r.startsWith('GET ') && r.includes('/git/blobs/'))
      .map((r) => github.pathOfBlob(r.split('/git/blobs/')[1]));
    assert.deepEqual(bookmarkFiles(Object.fromEntries(downloaded.map((p) => [p, '']))), []);
  });

  it('a plain 409 from GitHub is an error, not a "remote moved" retry', async () => {
    const { a, github } = env;
    useBrowser(a);
    await a.bookmarks.create({ parentId: '1', title: 'New', url: 'https://new.test/' });
    github.failNext('POST', '/git/trees', 409);
    const result = await sync();
    assert.equal(result.success, false);
    assert.notEqual(result.remoteMoved, true);
  });

  it('the fake GitHub served every request the adapter made', () => {
    assert.deepEqual(env.github.unknownRoutes, []);
  });
});
