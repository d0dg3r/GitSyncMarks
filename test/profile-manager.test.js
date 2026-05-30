import { describe, it, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';

let getSyncState, setSyncState, getHasConflict, getActiveProfileId;

function resolveGet(store, query) {
  if (query == null) return { ...store };
  if (typeof query === 'string') return query in store ? { [query]: store[query] } : {};
  if (Array.isArray(query)) {
    const out = {};
    for (const k of query) if (k in store) out[k] = store[k];
    return out;
  }
  const out = {};
  for (const [k, def] of Object.entries(query)) {
    out[k] = k in store ? store[k] : def;
  }
  return out;
}

function installChromeMock() {
  const sync = {};
  const local = {};
  globalThis.chrome = {
    runtime: { getURL: (p) => p },
    storage: {
      sync: {
        get: async (q) => resolveGet(sync, q),
        set: async (obj) => { Object.assign(sync, obj); },
        remove: async (k) => { for (const key of [].concat(k)) delete sync[key]; },
      },
      local: {
        get: async (q) => resolveGet(local, q),
        set: async (obj) => { Object.assign(local, obj); },
        remove: async (k) => { for (const key of [].concat(k)) delete local[key]; },
      },
    },
  };
}

before(async () => {
  installChromeMock();
  const mod = await import('../lib/profile-manager.js');
  getSyncState = mod.getSyncState;
  setSyncState = mod.setSyncState;
  getHasConflict = mod.getHasConflict;
  getActiveProfileId = mod.getActiveProfileId;
});

beforeEach(() => {
  installChromeMock();
});

describe('profile sync state', () => {
  it('returns an empty object for an unknown profile', async () => {
    assert.deepEqual(await getSyncState('missing'), {});
  });

  it('stores and reads state for a profile', async () => {
    await setSyncState('p1', { lastCommitSha: 'abc' });
    assert.deepEqual(await getSyncState('p1'), { lastCommitSha: 'abc' });
  });

  it('merges partial updates rather than replacing', async () => {
    await setSyncState('p1', { lastCommitSha: 'abc' });
    await setSyncState('p1', { lastError: 'boom' });
    assert.deepEqual(await getSyncState('p1'), { lastCommitSha: 'abc', lastError: 'boom' });
  });

  it('isolates state between profiles', async () => {
    await setSyncState('p1', { lastCommitSha: 'abc' });
    await setSyncState('p2', { hasConflict: true });
    assert.deepEqual(await getSyncState('p1'), { lastCommitSha: 'abc' });
    assert.deepEqual(await getSyncState('p2'), { hasConflict: true });
  });

  it('getHasConflict reflects stored flag', async () => {
    assert.equal(await getHasConflict('p1'), false);
    await setSyncState('p1', { hasConflict: true });
    assert.equal(await getHasConflict('p1'), true);
  });

  it('defaults the active profile id', async () => {
    assert.equal(await getActiveProfileId(), 'default');
  });

  it('clearing lastSyncFiles to null overrides the previous value', async () => {
    await setSyncState('p1', { lastSyncFiles: { 'a.json': { sha: 's', content: 'c' } } });
    await setSyncState('p1', { lastSyncFiles: null });
    assert.equal((await getSyncState('p1')).lastSyncFiles, null);
  });
});
