import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildRemoteMaps } from '../lib/remote-fetch.js';
import { GIT_PROVIDERS } from '../lib/git-provider-common.js';

describe('buildRemoteMaps with GitLab provider', () => {
  it('uses tree-based read path (not Contents API)', async () => {
    const api = {
      providerId: GIT_PROVIDERS.GITLAB,
      owner: 'u',
      repo: 'r',
      getRecursiveTreeForCommit: async () => ({
        treeSha: 'commit1',
        tree: [
          { path: 'bookmarks/toolbar/a.json', type: 'blob', sha: 'blob1' },
        ],
        truncated: false,
      }),
      getBlob: async (sha) => (sha === 'blob1' ? '{"title":"a"}' : ''),
      fetchFileMapViaContents: async () => {
        throw new Error('Contents API should not be used for GitLab');
      },
    };

    const { shaMap, fileMap } = await buildRemoteMaps(api, 'bookmarks', null, 'commit1');
    assert.equal(shaMap['bookmarks/toolbar/a.json'], 'blob1');
    assert.equal(fileMap['bookmarks/toolbar/a.json'], '{"title":"a"}');
  });

  it('returns empty maps when bookmarks path has no files yet (README-only repo)', async () => {
    const api = {
      providerId: GIT_PROVIDERS.GITLAB,
      owner: 'u',
      repo: 'r',
      getRecursiveTreeForCommit: async () => ({
        treeSha: 'commit1',
        tree: [{ path: 'README.md', type: 'blob', sha: 'blob-readme' }],
        truncated: false,
      }),
      getBlob: async () => {
        throw new Error('getBlob should not run when shaMap is empty');
      },
    };

    const { shaMap, fileMap } = await buildRemoteMaps(api, 'bookmarks', null, 'commit1');
    assert.deepEqual(shaMap, {});
    assert.deepEqual(fileMap, {});
  });
});
