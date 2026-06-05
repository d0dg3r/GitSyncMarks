import { describe, it, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';

let migrateProfileTokens, getEncryptedProfileToken, setEncryptedProfileToken;

function resolveGet(store, query) {
  if (query == null) return { ...store };
  if (typeof query === 'string') return query in store ? { [query]: store[query] } : {};
  const out = {};
  for (const [k, def] of Object.entries(query)) {
    out[k] = k in store ? store[k] : def;
  }
  return out;
}

before(async () => {
  globalThis.chrome = {
    storage: {
      local: {
        _data: {},
        get: async (q) => resolveGet(globalThis.chrome.storage.local._data, q),
        set: async (obj) => { Object.assign(globalThis.chrome.storage.local._data, obj); },
      },
      sync: { get: async () => ({}), set: async () => {} },
    },
  };
  const mod = await import('../lib/profile-manager.js');
  migrateProfileTokens = mod.migrateProfileTokens;
  getEncryptedProfileToken = mod.getEncryptedProfileToken;
  setEncryptedProfileToken = mod.setEncryptedProfileToken;
});

beforeEach(() => {
  globalThis.chrome.storage.local._data = {
    profileTokens: { p1: 'legacy-enc-token' },
  };
});

describe('profile token migration', () => {
  it('migrates string token to nested primary', async () => {
    await migrateProfileTokens();
    const enc = await getEncryptedProfileToken('p1', 'primary');
    assert.equal(enc, 'legacy-enc-token');
  });

  it('stores mirror tokens separately', async () => {
    await migrateProfileTokens();
    await setEncryptedProfileToken('p1', 'mirror-enc', 'm1');
    assert.equal(await getEncryptedProfileToken('p1', 'primary'), 'legacy-enc-token');
    assert.equal(await getEncryptedProfileToken('p1', 'm1'), 'mirror-enc');
  });
});
