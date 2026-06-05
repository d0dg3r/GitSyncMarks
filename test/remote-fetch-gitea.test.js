import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildRemoteMaps } from '../lib/remote-fetch.js';
import { GitHubError } from '../lib/github-api.js';

describe('buildRemoteMaps Gitea fallback', () => {
  it('Gitea reads via Contents API without tree SHA lookup', async () => {
    let treeShaCalled = false;
    const api = {
      providerId: 'gitea',
      async getCommitTreeSha() {
        treeShaCalled = true;
        throw new GitHubError('Commit abc has no tree SHA', 422);
      },
      async fetchFileMapViaContents(_basePath, ref) {
        assert.equal(ref, 'abc123');
        return {
          shaMap: { 'bookmarks/foo.json': 'blob1' },
          fileMap: { 'bookmarks/foo.json': '{"title":"x"}' },
        };
      },
    };

    const result = await buildRemoteMaps(api, 'bookmarks', null, 'abc123');
    assert.equal(treeShaCalled, false);
    assert.equal(result.fileMap['bookmarks/foo.json'], '{"title":"x"}');
  });

  it('falls back to Contents API when tree SHA lookup fails (non-Gitea)', async () => {
    const api = {
      getRecursiveTreeForCommit: async () => null,
      async getCommitTreeSha() {
        throw new GitHubError('Commit abc has no tree SHA', 422);
      },
      async getTree() {
        return { tree: [], truncated: false };
      },
      async fetchFileMapViaContents(_basePath, ref) {
        assert.equal(ref, 'abc123');
        return {
          shaMap: { 'bookmarks/foo.json': 'blob1' },
          fileMap: { 'bookmarks/foo.json': '{"title":"x"}' },
        };
      },
    };

    const result = await buildRemoteMaps(api, 'bookmarks', null, 'abc123');
    assert.equal(result.fileMap['bookmarks/foo.json'], '{"title":"x"}');
  });

  it('throws combined error when tree and contents both fail (non-Gitea)', async () => {
    const api = {
      getRecursiveTreeForCommit: async () => null,
      async getCommitTreeSha() {
        throw new GitHubError('Commit abc has no tree SHA', 422);
      },
      async fetchFileMapViaContents() {
        throw new GitHubError('contents endpoint 404', 404);
      },
    };

    await assert.rejects(
      () => buildRemoteMaps(api, 'bookmarks', null, 'abc'),
      (err) =>
        err instanceof GitHubError &&
        /Remote read failed/.test(err.message) &&
        /tree:/.test(err.message) &&
        /contents:/.test(err.message)
    );
  });
});
