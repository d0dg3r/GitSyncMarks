import { describe, it, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';

let getProfileToken;
let getEncryptedProfileToken;
let buildExportedProfileMap;
let listConfiguredProfilesMissingToken;
let restoreProfileTokensFromExport;
let setEncryptedProfileToken;

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
  const profileMod = await import('../lib/profile-manager.js');
  const exportMod = await import('../lib/settings-export.js');
  getProfileToken = profileMod.getProfileToken;
  getEncryptedProfileToken = profileMod.getEncryptedProfileToken;
  setEncryptedProfileToken = profileMod.setEncryptedProfileToken;
  buildExportedProfileMap = exportMod.buildExportedProfileMap;
  listConfiguredProfilesMissingToken = exportMod.listConfiguredProfilesMissingToken;
  restoreProfileTokensFromExport = exportMod.restoreProfileTokensFromExport;
});

beforeEach(() => {
  // Object-shaped layout (mirrors era) — the pre-9f32c86 bug passed this object to decryptToken().
  globalThis.chrome.storage.local._data = {
    profileTokens: {
      gitea: {
        primary: 'plain-gitea-token',
        mirrors: { mirror1: 'plain-mirror-token' },
      },
      empty: {
        primary: '',
        mirrors: {},
      },
    },
  };
});

describe('object-shaped profileTokens + settings export', () => {
  it('getEncryptedProfileToken reads primary from nested layout (not the object itself)', async () => {
    const enc = await getEncryptedProfileToken('gitea', 'primary');
    assert.equal(enc, 'plain-gitea-token');
    assert.equal(typeof enc, 'string');
  });

  it('getProfileToken returns plaintext primary for nested layout (legacy non-enc values)', async () => {
    // Regression for 9f32c86: decryptToken(profileTokens[id]) threw on objects → empty export tokens.
    const token = await getProfileToken('gitea', 'primary');
    assert.equal(token, 'plain-gitea-token');
  });

  it('buildExportedProfileMap includes primary and mirror tokens', async () => {
    const profiles = {
      gitea: {
        id: 'gitea',
        name: 'gittea',
        owner: 'joe',
        repo: 'my-bookmarks',
        gitProvider: 'gitea',
        serverUrl: 'http://gittea.lan:3000',
        mirrors: [{ id: 'mirror1', owner: 'joe', repo: 'mirror' }],
      },
    };
    const exported = await buildExportedProfileMap(profiles);
    assert.equal(exported.gitea.token, 'plain-gitea-token');
    assert.deepEqual(exported.gitea.mirrorTokens, { mirror1: 'plain-mirror-token' });
  });

  it('listConfiguredProfilesMissingToken flags configured profiles without tokens', () => {
    const missing = listConfiguredProfilesMissingToken({
      ok: { name: 'ok', owner: 'a', repo: 'b', token: 'tok' },
      bad: { name: 'bad', owner: 'a', repo: 'b', token: '' },
      incomplete: { name: 'incomplete', owner: '', repo: '', token: '' },
    });
    assert.deepEqual(missing, ['bad']);
  });

  it('restoreProfileTokensFromExport writes primary and mirror slots', async () => {
    globalThis.chrome.storage.local._data = { profileTokens: {} };
    const encrypt = async (plain) => `enc:${plain}`;
    await restoreProfileTokensFromExport(
      'p1',
      { token: 'primary-plain', mirrorTokens: { m1: 'mirror-plain' } },
      encrypt,
      setEncryptedProfileToken
    );
    assert.equal(await getEncryptedProfileToken('p1', 'primary'), 'enc:primary-plain');
    assert.equal(await getEncryptedProfileToken('p1', 'm1'), 'enc:mirror-plain');
  });
});
