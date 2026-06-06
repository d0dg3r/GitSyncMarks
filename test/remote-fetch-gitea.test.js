import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildRemoteMaps } from '../lib/remote-fetch.js';
import { GitHubError } from '../lib/github-api.js';

describe('buildRemoteMaps Gitea-family', () => {
  it('reads via tree+blob when getRecursiveTreeForCommit succeeds', async () => {
    let contentsCalled = false;
    const api = {
      providerId: 'codeberg',
      async getRecursiveTreeForCommit(ref) {
        assert.equal(ref, 'abc123');
        return {
          treeSha: 'tree1',
          tree: [
            { path: 'bookmarks/foo.json', type: 'blob', sha: 'blob1' },
            { path: 'README.md', type: 'blob', sha: 'blob-readme' },
          ],
          truncated: false,
        };
      },
      async getBlob(sha) {
        if (sha === 'blob1') return '{"title":"x"}';
        throw new Error('unexpected blob');
      },
      async fetchFileMapViaContents() {
        contentsCalled = true;
        return { shaMap: {}, fileMap: {} };
      },
    };

    const result = await buildRemoteMaps(api, 'bookmarks', null, 'abc123');
    assert.equal(contentsCalled, false);
    assert.equal(result.fileMap['bookmarks/foo.json'], '{"title":"x"}');
    assert.equal(result.shaMap['bookmarks/foo.json'], 'blob1');
  });

  it('falls back to Contents API when tree read fails', async () => {
    let treeCalled = false;
    const api = {
      providerId: 'gitea',
      async getRecursiveTreeForCommit() {
        treeCalled = true;
        return null;
      },
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
    assert.equal(treeCalled, true);
    assert.equal(result.fileMap['bookmarks/foo.json'], '{"title":"x"}');
  });

  it('falls back to Contents when tree listing is empty under base path', async () => {
    const api = {
      providerId: 'forgejo',
      async getRecursiveTreeForCommit() {
        return {
          treeSha: 'tree1',
          tree: [{ path: 'README.md', type: 'blob', sha: 'blob-readme' }],
          truncated: false,
        };
      },
      async fetchFileMapViaContents() {
        return {
          shaMap: { 'bookmarks/foo.json': 'blob1' },
          fileMap: { 'bookmarks/foo.json': '{"title":"x"}' },
        };
      },
    };

    const result = await buildRemoteMaps(api, 'bookmarks', null, 'abc123');
    assert.equal(result.fileMap['bookmarks/foo.json'], '{"title":"x"}');
  });

  it('throws combined error when tree and contents both fail', async () => {
    const api = {
      providerId: 'gogs',
      async getRecursiveTreeForCommit() {
        return null;
      },
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

  it('reuses baseFiles blob SHA cache on tree+blob path', async () => {
    const api = {
      providerId: 'codeberg',
      async getRecursiveTreeForCommit() {
        return {
          treeSha: 'tree1',
          tree: [{ path: 'bookmarks/foo.json', type: 'blob', sha: 'blob1' }],
          truncated: false,
        };
      },
      async getBlob() {
        throw new Error('getBlob should not run when SHA matches base');
      },
    };

    const result = await buildRemoteMaps(api, 'bookmarks', {
      'bookmarks/foo.json': { sha: 'blob1', content: '{"cached":true}' },
    }, 'abc123');
    assert.equal(result.fileMap['bookmarks/foo.json'], '{"cached":true}');
  });
});
