import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { GitHubError } from '../lib/providers/github-api.js';
import { GitProviderError } from '../lib/git-provider-common.js';
import {
  commitBookmarkChanges,
  isEmptyRepoWriteError,
} from '../lib/commit-bookmarks.js';

describe('isEmptyRepoWriteError', () => {
  it('detects empty-repo status and message shapes', () => {
    assert.equal(isEmptyRepoWriteError(new GitHubError('api_repoEmpty', 409)), true);
    assert.equal(isEmptyRepoWriteError(new GitHubError('api_emptyRepoInitFailed', 409)), true);
    assert.equal(isEmptyRepoWriteError(new GitHubError('Could not create the initial branch', 409)), true);
    assert.equal(isEmptyRepoWriteError(new GitHubError('validation failed', 422)), true);
    assert.equal(isEmptyRepoWriteError(new GitHubError('api_accessDenied', 403)), false);
  });
});

describe('GitProviderError', () => {
  it('keeps message clean and attaches cause without stacking into message', () => {
    const cause = new Error('inner boom');
    const err = new GitHubError('api_emptyRepoInitFailed', 409, cause);
    assert.equal(err.message, 'api_emptyRepoInitFailed');
    assert.equal(err.cause, cause);
    assert.equal(err.statusCode, 409);
    assert.equal(err instanceof GitProviderError, true);
  });
});

describe('commitBookmarkChanges', () => {
  it('falls back to createOrUpdateFile on empty-repo 409 for GitHub-style APIs', async () => {
    const created = [];
    const api = {
      providerId: 'github',
      atomicCommit: async () => {
        throw new GitHubError('api_emptyRepoInitFailed', 409);
      },
      createOrUpdateFile: async (path, content, message, sha) => {
        created.push({ path, content, message, sha });
        return { commitSha: `sha-${created.length}`, sha: `blob-${created.length}` };
      },
    };
    const sha = await commitBookmarkChanges(api, 'Push bookmarks', {
      'bookmarks/_index.json': '{}',
      'bookmarks/toolbar/_order.json': '[]',
    });
    assert.equal(sha, 'sha-2');
    assert.equal(created.length, 2);
    assert.equal(created.every((c) => c.sha === null), true);
  });

  it('rethrows non-empty GitHub failures without Contents fallback', async () => {
    const api = {
      providerId: 'github',
      atomicCommit: async () => {
        throw new GitHubError('api_accessDenied', 403);
      },
      createOrUpdateFile: async () => {
        throw new Error('createOrUpdateFile should not run');
      },
    };
    await assert.rejects(
      () => commitBookmarkChanges(api, 'Push', { 'a.json': '{}' }),
      (err) => err instanceof GitHubError && err.statusCode === 403
    );
  });
});
