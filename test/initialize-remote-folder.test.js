import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { GitHubError } from '../lib/providers/github-api.js';
import { initializeRemoteFolder } from '../lib/onboarding.js';

describe('initializeRemoteFolder', () => {
  it('uses atomicCommit when it succeeds', async () => {
    const api = {
      atomicCommit: async () => 'commit-atomic',
      createOrUpdateFile: async () => {
        throw new Error('createOrUpdateFile should not run');
      },
    };
    const sha = await initializeRemoteFolder(api, 'bookmarks');
    assert.equal(sha, 'commit-atomic');
  });

  it('falls back to Contents API when atomicCommit hits empty-repo 409', async () => {
    const created = [];
    const api = {
      atomicCommit: async () => {
        throw new GitHubError('api_repoEmpty', 409);
      },
      createOrUpdateFile: async (path, content, message, sha) => {
        created.push({ path, content, message, sha });
        return { commitSha: `sha-${created.length}`, sha: `blob-${created.length}` };
      },
    };
    const sha = await initializeRemoteFolder(api, 'bookmarks');
    assert.equal(sha, 'sha-3');
    assert.equal(created.length, 3);
    assert.deepEqual(
      created.map((c) => c.path).sort(),
      [
        'bookmarks/_index.json',
        'bookmarks/other/_order.json',
        'bookmarks/toolbar/_order.json',
      ]
    );
    assert.equal(created.every((c) => c.sha === null), true);
  });

  it('rethrows non-empty failures without Contents fallback', async () => {
    const api = {
      atomicCommit: async () => {
        throw new GitHubError('api_accessDenied', 403);
      },
      createOrUpdateFile: async () => {
        throw new Error('createOrUpdateFile should not run');
      },
    };
    await assert.rejects(
      () => initializeRemoteFolder(api, 'bookmarks'),
      (err) => err instanceof GitHubError && err.statusCode === 403
    );
  });
});
