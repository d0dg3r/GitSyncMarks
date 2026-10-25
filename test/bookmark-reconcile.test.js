/**
 * replaceLocalBookmarks reconciles the local tree instead of rebuilding it. These tests check
 * that the result equals the target and that unchanged nodes keep their IDs.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeBrowser } from './helpers/fake-browser.js';

let browser;
let replaceLocalBookmarks;

const bm = (title, url) => ({ type: 'bookmark', title, url });
const folder = (title, children) => ({ type: 'folder', title, children });

/** Create the toolbar content in the fake browser, then reset the call counters. */
async function seedToolbar(children, parentId = '1') {
  for (const child of children) {
    const created = await browser.chrome.bookmarks.create({ parentId, title: child.title, ...(child.url ? { url: child.url } : {}) });
    if (child.type === 'folder') await seedToolbar(child.children, created.id);
  }
  if (parentId === '1') Object.keys(browser.bookmarks.calls).forEach((k) => { browser.bookmarks.calls[k] = 0; });
}

/** Toolbar without IDs, in the same shape as the target. */
function toolbarShape() {
  const strip = (node) => (node.url ? bm(node.title, node.url) : folder(node.title, node.children.map(strip)));
  return browser.bookmarks.toolbarSnapshot().map(strip);
}

const apply = (children) => replaceLocalBookmarks({ toolbar: { title: 'Bookmarks bar', children } });

describe('replaceLocalBookmarks reconciles in place', () => {
  beforeEach(async () => {
    browser = createFakeBrowser();
    globalThis.chrome = browser.chrome;
    ({ replaceLocalBookmarks } = await import('../lib/bookmark-replace.js'));
  });

  it('does not touch an unchanged tree', async () => {
    const tree = [bm('A', 'https://a.test/'), folder('F', [bm('X', 'https://x.test/')])];
    await seedToolbar(tree);
    const before = browser.bookmarks.toolbarSnapshot();
    await apply(tree);
    assert.deepEqual(browser.bookmarks.toolbarSnapshot(), before);
    assert.deepEqual(browser.bookmarks.calls, { create: 0, removeTree: 0, update: 0, move: 0 });
  });

  it('updates a changed title in place and keeps the ID', async () => {
    await seedToolbar([bm('Old', 'https://a.test/')]);
    const [{ id }] = browser.bookmarks.toolbarSnapshot();
    await apply([bm('New', 'https://a.test/')]);
    assert.deepEqual(browser.bookmarks.toolbarSnapshot(), [{ id, title: 'New', url: 'https://a.test/' }]);
    assert.equal(browser.bookmarks.calls.update, 1);
    assert.equal(browser.bookmarks.calls.create, 0);
  });

  it('reorders by moving, without recreating', async () => {
    const a = bm('A', 'https://a.test/');
    const b = bm('B', 'https://b.test/');
    const c = bm('C', 'https://c.test/');
    const d = bm('D', 'https://d.test/');
    await seedToolbar([a, b, c, d]);
    const ids = Object.fromEntries(browser.bookmarks.toolbarSnapshot().map((n) => [n.title, n.id]));
    await apply([d, c, b, a]);
    assert.deepEqual(browser.bookmarks.toolbarSnapshot().map((n) => n.id), [ids.D, ids.C, ids.B, ids.A]);
    assert.equal(browser.bookmarks.calls.create, 0);
    assert.equal(browser.bookmarks.calls.removeTree, 0);
  });

  it('adds and removes only what differs', async () => {
    await seedToolbar([bm('A', 'https://a.test/'), bm('B', 'https://b.test/')]);
    const idA = browser.bookmarks.toolbarSnapshot()[0].id;
    await apply([bm('A', 'https://a.test/'), bm('C', 'https://c.test/')]);
    assert.deepEqual(toolbarShape(), [bm('A', 'https://a.test/'), bm('C', 'https://c.test/')]);
    assert.equal(browser.bookmarks.toolbarSnapshot()[0].id, idA);
    assert.equal(browser.bookmarks.calls.create, 1);
    assert.equal(browser.bookmarks.calls.removeTree, 1);
  });

  it('keeps a folder and changes only inside it', async () => {
    await seedToolbar([folder('F', [bm('X', 'https://x.test/')])]);
    const folderId = browser.bookmarks.toolbarSnapshot()[0].id;
    await apply([folder('F', [bm('X', 'https://x.test/'), bm('Y', 'https://y.test/')])]);
    const [snap] = browser.bookmarks.toolbarSnapshot();
    assert.equal(snap.id, folderId);
    assert.deepEqual(snap.children.map((c) => c.title), ['X', 'Y']);
  });

  it('skips a URL the browser rejects and keeps the order of the rest', async () => {
    browser.bookmarks.rejectedUrlPrefixes.push('place:');
    await seedToolbar([]);
    const stats = await apply([bm('A', 'https://a.test/'), bm('Q', 'place:sort=8'), bm('B', 'https://b.test/')]);
    assert.deepEqual(toolbarShape(), [bm('A', 'https://a.test/'), bm('B', 'https://b.test/')]);
    assert.equal(stats.failed.length, 1);
    assert.equal(stats.failed[0].url, 'place:sort=8');
  });

  it('keeps duplicate bookmarks', async () => {
    const dup = bm('A', 'https://a.test/');
    await seedToolbar([dup]);
    await apply([dup, dup]);
    assert.deepEqual(toolbarShape(), [dup, dup]);
  });

  it('leaves a role the target does not mention untouched', async () => {
    await seedToolbar([bm('A', 'https://a.test/')]);
    await replaceLocalBookmarks({});
    assert.deepEqual(toolbarShape(), [bm('A', 'https://a.test/')]);
  });

  for (const moveSemantics of ['chrome', 'firefox']) it(`reaches the target for random trees (${moveSemantics} move semantics)`, async () => {
    // Small deterministic PRNG so failures are reproducible.
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const urls = ['a', 'b', 'c', 'd', 'e', 'f'].map((x) => `https://${x}.test/`);
    const titles = ['One', 'Two', 'Three', 'Four'];
    const randomTree = (depth) => {
      const n = Math.floor(rand() * 5);
      return Array.from({ length: n }, () => (depth < 2 && rand() < 0.25
        ? folder(pick(['F', 'G']), randomTree(depth + 1))
        : bm(pick(titles), pick(urls))));
    };
    for (let round = 0; round < 300; round += 1) {
      browser = createFakeBrowser({ moveSemantics });
      globalThis.chrome = browser.chrome;
      const start = randomTree(0);
      const target = randomTree(0);
      await seedToolbar(start);
      await apply(target);
      assert.deepEqual(toolbarShape(), target, `round ${round}`);
    }
  });
});
