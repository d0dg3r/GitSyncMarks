import { describe, it, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';

let createBookmarkTree, replaceLocalBookmarks, getApplyInProgress, clearApplyInProgress;

function installChromeMock() {
  const local = {};
  const bookmarks = new Map();
  bookmarks.set('0', { id: '0', title: '', children: ['1', '2'] });
  bookmarks.set('1', { id: '1', title: 'Bookmarks Bar', parentId: '0', children: [] });
  bookmarks.set('2', { id: '2', title: 'Other Bookmarks', parentId: '0', children: [] });
  let nextId = 100;

  function nodeToTree(id) {
    const n = bookmarks.get(id);
    if (!n) return null;
    const out = { id: n.id, title: n.title, parentId: n.parentId };
    if (n.url) out.url = n.url;
    if (n.children) out.children = n.children.map(nodeToTree);
    return out;
  }

  globalThis.chrome = {
    runtime: { getURL: (p) => p },
    storage: {
      local: {
        get: async (q) => {
          if (q && typeof q === 'object' && !Array.isArray(q)) {
            const out = {};
            for (const [k, def] of Object.entries(q)) out[k] = k in local ? local[k] : def;
            return out;
          }
          return { ...local };
        },
        set: async (obj) => { Object.assign(local, obj); },
        remove: async (k) => { for (const key of [].concat(k)) delete local[key]; },
      },
    },
    bookmarks: {
      getTree: async () => [nodeToTree('0')],
      create: async ({ parentId, title, url }) => {
        if (url && url.startsWith('javascript:')) {
          throw new Error('Invalid URL');
        }
        const id = String(nextId++);
        const node = { id, title, parentId, url, children: url ? undefined : [] };
        bookmarks.set(id, node);
        const parent = bookmarks.get(parentId);
        if (parent?.children) parent.children.push(id);
        return { id, title, url, parentId };
      },
      removeTree: async (id) => {
        const n = bookmarks.get(id);
        if (!n) return;
        const parent = bookmarks.get(n.parentId);
        if (parent?.children) parent.children = parent.children.filter((c) => c !== id);
        bookmarks.delete(id);
      },
    },
  };
}

before(async () => {
  installChromeMock();
  const mod = await import('../lib/bookmark-replace.js');
  createBookmarkTree = mod.createBookmarkTree;
  replaceLocalBookmarks = mod.replaceLocalBookmarks;
  getApplyInProgress = mod.getApplyInProgress;
  clearApplyInProgress = mod.clearApplyInProgress;
});

beforeEach(() => {
  installChromeMock();
});

describe('createBookmarkTree', () => {
  it('continues after a rejected bookmark URL', async () => {
    const failures = [];
    const created = await createBookmarkTree({
      type: 'folder',
      title: 'Dev',
      children: [
        { type: 'bookmark', title: 'bad', url: 'javascript:void(0)' },
        { type: 'bookmark', title: 'ok', url: 'https://example.com' },
      ],
    }, '1', failures);
    assert.equal(created, 1);
    assert.equal(failures.length, 1);
    assert.equal(failures[0].title, 'bad');
  });
});

describe('replaceLocalBookmarks apply marker', () => {
  it('sets the apply-in-progress marker before replacing and leaves it until cleared', async () => {
    await replaceLocalBookmarks(
      { toolbar: { title: 'toolbar', children: [] }, other: { title: 'other', children: [] } },
      { profileId: 'p1', commitSha: 'abc' }
    );
    const marker = await getApplyInProgress();
    assert.equal(marker.profileId, 'p1');
    assert.equal(marker.commitSha, 'abc');
    await clearApplyInProgress();
    assert.equal(await getApplyInProgress(), null);
  });
});
