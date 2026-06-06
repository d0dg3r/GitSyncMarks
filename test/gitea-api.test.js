import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickTreeShaFromCommitPayload,
  extractShaFromGitTreeUrl,
  GiteaAPI,
} from '../lib/providers/gitea-api.js';
describe('gitea-api helpers', () => {
  it('pickTreeShaFromCommitPayload reads nested commit.tree.sha', () => {
    const sha = pickTreeShaFromCommitPayload({
      sha: 'commit1234567890123456789012345678901234567890',
      commit: {
        tree: { sha: 'tree1234567890123456789012345678901234567890' },
      },
    });
    assert.equal(sha, 'tree1234567890123456789012345678901234567890');
  });

  it('pickTreeShaFromCommitPayload extracts tree sha from tree.url', () => {
    const sha = pickTreeShaFromCommitPayload({
      commit: {
        tree: {
          url: 'http://gitea.example/api/v1/repos/o/r/git/trees/abc123def4567890123456789012345678901234',
        },
      },
    });
    assert.equal(sha, 'abc123def4567890123456789012345678901234');
  });

  it('extractShaFromGitTreeUrl parses git trees path', () => {
    assert.equal(
      extractShaFromGitTreeUrl('https://host/api/v1/repos/a/b/git/trees/deadbeef'),
      'deadbeef'
    );
  });
});

describe('GiteaAPI contents ref cascade', () => {
  it('_resolveContentsRefs tries commit, branch, and refs/heads/branch', () => {
    const api = new GiteaAPI({
      token: 't',
      owner: 'o',
      repo: 'r',
      branch: 'main',
      serverUrl: 'http://gitea.local',
    });
    const refs = api._resolveContentsRefs('e55e794df48fa032d1b9ded04d71a841f1e19e28');
    assert.deepEqual(refs, [
      'e55e794df48fa032d1b9ded04d71a841f1e19e28',
      'main',
      'refs/heads/main',
    ]);
  });
});

describe('GiteaAPI validateToken', () => {
  it('treats 403 on /user as ambiguous valid (repo-scoped Codeberg token)', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).endsWith('/user')) {
        return {
          ok: false,
          status: 403,
          json: async () => ({ message: 'token does not have required scope(s): [read:user]' }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    };
    try {
      const api = new GiteaAPI({
        provider: 'codeberg',
        token: 'scoped-repo-token',
        owner: 'o',
        repo: 'r',
        branch: 'main',
      });
      const result = await api.validateToken();
      assert.equal(result.valid, true);
      assert.equal(result.ambiguous, true);
      assert.equal(result.username, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('GiteaAPI atomicCommit', () => {
  it('uses git data (blobs + trees) for a single commit when tree API accepts SHA refs', async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), method: init?.method || 'GET' });
      const u = String(url);
      if (u.endsWith('/git/ref/heads/main')) {
        return { ok: true, status: 200, json: async () => ({ object: { sha: 'parentcommit' } }) };
      }
      if (u.endsWith('/git/commits/parentcommit')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ sha: 'parentcommit', tree: { sha: 'basetree' } }),
        };
      }
      if (u.endsWith('/git/blobs') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        return {
          ok: true,
          status: 200,
          json: async () => ({ sha: `blob-${body.content}` }),
        };
      }
      if (u.endsWith('/git/trees') && init?.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({ sha: 'newtree' }) };
      }
      if (u.endsWith('/git/commits') && init?.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({ sha: 'newcommit' }) };
      }
      if (u.endsWith('/git/refs/heads/main') && init?.method === 'PATCH') {
        return { ok: true, status: 200, json: async () => ({}) };
      }
      throw new Error(`unexpected fetch: ${u} ${init?.method || 'GET'}`);
    };
    try {
      const api = new GiteaAPI({
        token: 't',
        owner: 'o',
        repo: 'r',
        branch: 'main',
        serverUrl: 'http://gitea.local',
      });
      const sha = await api.atomicCommit('msg', {
        'bookmarks/a.json': '{"a":1}',
        'bookmarks/b.json': '{"b":2}',
      });
      assert.equal(sha, 'newcommit');
      assert.equal(calls.filter((c) => c.url.endsWith('/git/blobs')).length, 2);
      assert.equal(calls.filter((c) => c.url.endsWith('/git/trees')).length, 1);
      assert.equal(calls.filter((c) => c.url.endsWith('/git/commits') && c.method === 'POST').length, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('falls back to Contents API when POST /git/trees fails with 404', async () => {
    const originalFetch = globalThis.fetch;
    let treeAttempts = 0;
    globalThis.fetch = async (url, init) => {
      const u = String(url);
      if (u.endsWith('/git/ref/heads/main')) {
        return { ok: true, status: 200, json: async () => ({ object: { sha: 'parentcommit' } }) };
      }
      if (u.endsWith('/git/commits/parentcommit')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ sha: 'parentcommit', tree: { sha: 'basetree' } }),
        };
      }
      if (u.includes('/git/trees/') && u.includes('recursive=1')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            sha: 'basetree',
            tree: [{ path: 'bookmarks/old.json', type: 'blob', sha: 'oldblob', mode: '100644' }],
          }),
        };
      }
      if (u.endsWith('/git/blobs') && init?.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({ sha: 'newblob' }) };
      }
      if (u.endsWith('/git/trees') && init?.method === 'POST') {
        treeAttempts += 1;
        return { ok: false, status: 404, json: async () => ({ message: 'not found' }) };
      }
      if (u.includes('/contents/bookmarks/a.json')) {
        if (init?.method === 'POST') {
          return {
            ok: true,
            status: 201,
            json: async () => ({
              content: { sha: 'contentsha' },
              commit: { sha: 'contentscommit', tree: { sha: 'contentstree' } },
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({ message: 'not found' }) };
      }
      throw new Error(`unexpected fetch: ${u} ${init?.method || 'GET'}`);
    };
    try {
      const api = new GiteaAPI({
        token: 't',
        owner: 'o',
        repo: 'r',
        branch: 'main',
        serverUrl: 'http://gitea.local',
      });
      const sha = await api.atomicCommit('msg', { 'bookmarks/a.json': '{"a":1}' });
      assert.equal(treeAttempts, 1);
      assert.equal(sha, 'contentscommit');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('Gitea-family provider ids', () => {
  for (const provider of ['forgejo', 'codeberg', 'gogs']) {
    it(`${provider} preserves providerId and resolves API base`, () => {
      const opts = {
        provider,
        token: 't',
        owner: 'o',
        repo: 'r',
        branch: 'main',
        serverUrl: provider === 'codeberg' ? '' : 'http://host.local',
      };
      const api = new GiteaAPI(opts);
      assert.equal(api.providerId, provider);
      if (provider === 'codeberg') {
        assert.equal(api._apiBase(), 'https://codeberg.org/api/v1');
      } else {
        assert.equal(api._apiBase(), 'http://host.local/api/v1');
      }
    });
  }
});
