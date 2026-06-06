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
        assert.match(api._apiBase(), /codeberg\.org\/api\/v1/);
      } else {
        assert.match(api._apiBase(), /host\.local\/api\/v1/);
      }
    });
  }
});
