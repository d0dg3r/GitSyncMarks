import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

function resolveGet(store, query) {
  if (query == null) return { ...store };
  if (typeof query === 'object' && !Array.isArray(query)) {
    const out = {};
    for (const [k, def] of Object.entries(query)) out[k] = k in store ? store[k] : def;
    return out;
  }
  return {};
}

function installChromeMock() {
  const sync = {
    profiles: { a: { id: 'a', name: 'A' }, b: { id: 'b', name: 'B' } },
    activeProfileId: 'a',
  };
  const local = { syncState: {}, syncFlags: {}, profileTokens: {} };
  const bookmarks = new Map();
  bookmarks.set('0', { id: '0', title: '', children: ['1', '2'] });
  bookmarks.set('1', { id: '1', title: 'Bookmarks Bar', parentId: '0', children: [] });
  bookmarks.set('2', { id: '2', title: 'Other Bookmarks', parentId: '0', children: [] });
  function nodeToTree(id) {
    const n = bookmarks.get(id);
    if (!n) return null;
    const out = { id: n.id, title: n.title, parentId: n.parentId };
    if (n.children) out.children = n.children.map(nodeToTree);
    return out;
  }
  globalThis.chrome = {
    runtime: { getURL: (p) => p },
    storage: {
      onChanged: { addListener: () => {} },
      sync: {
        get: async (q) => resolveGet(sync, q),
        set: async (obj) => { Object.assign(sync, obj); },
      },
      local: {
        get: async (q) => resolveGet(local, q),
        set: async (obj) => { Object.assign(local, obj); },
        remove: async (k) => { for (const key of [].concat(k)) delete local[key]; },
      },
    },
    bookmarks: {
      getTree: async () => [nodeToTree('0')],
      create: async ({ parentId, title, url }) => ({ id: 'x', parentId, title, url }),
      removeTree: async () => {},
    },
  };
  return { sync };
}

const stores = installChromeMock();

const { _acquireSyncLock, _releaseSyncLock } = await import('../lib/sync-core.js');
const { switchProfile } = await import('../lib/profile-switch.js');

describe('switchProfile lock', () => {
  it('returns alreadyInProgress when the sync lock is held', async () => {
    assert.equal(_acquireSyncLock(), true);
    try {
      const result = await switchProfile('b');
      assert.equal(result.alreadyInProgress, true);
      assert.equal(result.success, false);
    } finally {
      _releaseSyncLock();
    }
  });

  it('sets the active profile id before replacing bookmarks', async () => {
    stores.sync.activeProfileId = 'a';
    let activeAtReplace = null;
    const origSet = chrome.storage.local.set;
    chrome.storage.local.set = async (obj) => {
      if (obj && obj.applyInProgress) {
        activeAtReplace = stores.sync.activeProfileId;
      }
      return origSet(obj);
    };
    try {
      const result = await switchProfile('b');
      assert.equal(result.success, true);
      assert.equal(activeAtReplace, 'b');
      assert.equal(stores.sync.activeProfileId, 'b');
    } finally {
      chrome.storage.local.set = origSet;
      _releaseSyncLock();
    }
  });
});
