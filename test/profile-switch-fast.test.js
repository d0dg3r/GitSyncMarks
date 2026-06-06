import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSwitchPushChanges,
  mergeLocalIntoSyncFiles,
  loadTargetFileMapForSwitch,
  buildStaleBasePushChanges,
} from '../lib/profile-switch-logic.js';

describe('buildSwitchPushChanges', () => {
  it('excludes custom Bitwarden backup paths from switch push diff', () => {
    const local = {
      'bookmarks/toolbar/foo.json': '{}',
      'vault-backups/new.enc.json': 'enc',
    };
    const base = {};
    const { fileChanges, hasChanges } = buildSwitchPushChanges(local, base, 'vault-backups');
    assert.equal(hasChanges, true);
    assert.deepEqual(fileChanges, { 'bookmarks/toolbar/foo.json': '{}' });
  });

  it('returns no changes when local matches lastSyncFiles', () => {
    const local = { 'bookmarks/toolbar/a.json': '{"title":"a"}' };
    const base = { 'bookmarks/toolbar/a.json': { sha: 'sha1', content: '{"title":"a"}' } };
    const { fileChanges, hasChanges } = buildSwitchPushChanges(local, base);
    assert.equal(hasChanges, false);
    assert.deepEqual(fileChanges, {});
  });

  it('returns only modified paths in fileChanges', () => {
    const local = {
      'bookmarks/toolbar/a.json': '{"title":"a2"}',
      'bookmarks/toolbar/b.json': '{"title":"b"}',
    };
    const base = {
      'bookmarks/toolbar/a.json': { sha: 's1', content: '{"title":"a"}' },
      'bookmarks/toolbar/b.json': { sha: 's2', content: '{"title":"b"}' },
    };
    const { fileChanges, hasChanges } = buildSwitchPushChanges(local, base);
    assert.equal(hasChanges, true);
    assert.deepEqual(Object.keys(fileChanges), ['bookmarks/toolbar/a.json']);
    assert.equal(fileChanges['bookmarks/toolbar/a.json'], '{"title":"a2"}');
  });

  it('includes deletions for removed paths', () => {
    const local = {};
    const base = {
      'bookmarks/toolbar/old.json': { sha: 's1', content: '{}' },
    };
    const { fileChanges, hasChanges } = buildSwitchPushChanges(local, base);
    assert.equal(hasChanges, true);
    assert.equal(fileChanges['bookmarks/toolbar/old.json'], null);
  });
});

describe('mergeLocalIntoSyncFiles', () => {
  it('preserves blob SHAs from previous sync state', () => {
    const merged = mergeLocalIntoSyncFiles(
      { 'bookmarks/a.json': 'c' },
      { 'bookmarks/a.json': { sha: 'blob123', content: 'old' } }
    );
    assert.equal(merged['bookmarks/a.json'].sha, 'blob123');
    assert.equal(merged['bookmarks/a.json'].content, 'c');
  });

  it('keeps removed paths in base until remote push', () => {
    const merged = mergeLocalIntoSyncFiles(
      {},
      { 'bookmarks/toolbar/old.json': { sha: 's1', content: '{"title":"x"}' } }
    );
    assert.equal(merged['bookmarks/toolbar/old.json'].content, '{"title":"x"}');
    assert.equal(merged['bookmarks/toolbar/old.json'].sha, 's1');
  });
});

describe('buildStaleBasePushChanges', () => {
  it('builds delete push when remote has files missing from stale base and local', () => {
    const remoteDiff = {
      added: { 'bookmarks/toolbar/dup.json': '{"title":"dup"}' },
      removed: [],
      modified: {},
    };
    const localFiles = {};
    const remoteFiles = { 'bookmarks/toolbar/dup.json': '{"title":"dup"}' };
    const { fileChanges, shouldPush } = buildStaleBasePushChanges(
      remoteDiff,
      localFiles,
      remoteFiles,
      () => false
    );
    assert.equal(shouldPush, true);
    assert.equal(fileChanges['bookmarks/toolbar/dup.json'], null);
  });

  it('returns shouldPush false when remote additions exist in local', () => {
    const path = 'bookmarks/toolbar/a.json';
    const content = '{"title":"a"}';
    const remoteDiff = { added: { [path]: content }, removed: [], modified: {} };
    const { shouldPush } = buildStaleBasePushChanges(
      remoteDiff,
      { [path]: content },
      { [path]: content },
      () => false
    );
    assert.equal(shouldPush, false);
  });
});

describe('loadTargetFileMapForSwitch', () => {
  const targetSettings = {
    githubToken: 'tok',
    repoOwner: 'o',
    repoName: 'r',
    branch: 'main',
    gitProvider: 'github',
  };

  it('uses cache when HEAD matches lastCommitSha (no fetchRemoteFileMap)', async () => {
    let fetchCalled = false;
    const api = {
      getLatestCommitSha: async () => 'abc123',
    };
    const result = await loadTargetFileMapForSwitch({
      targetState: {
        lastCommitSha: 'abc123',
        lastSyncFiles: {
          'bookmarks/toolbar/x.json': { sha: 's1', content: '{"t":"x"}' },
        },
      },
      targetSettings,
      targetBasePath: 'bookmarks',
      createGitProvider: () => api,
      fetchRemoteFileMap: async () => {
        fetchCalled = true;
        return null;
      },
    });
    assert.equal(fetchCalled, false);
    assert.equal(result.fileMap['bookmarks/toolbar/x.json'], '{"t":"x"}');
    assert.equal(result.syncStateUpdate, undefined);
  });

  it('delta-pulls when HEAD differs from cached commit', async () => {
    let fetchBase = null;
    const api = { getLatestCommitSha: async () => 'newsha' };
    const cached = {
      'bookmarks/toolbar/x.json': { sha: 's1', content: '{"t":"x"}' },
    };
    const result = await loadTargetFileMapForSwitch({
      targetState: { lastCommitSha: 'oldsha', lastSyncFiles: cached },
      targetSettings,
      targetBasePath: 'bookmarks',
      createGitProvider: () => api,
      fetchRemoteFileMap: async (_api, _base, baseFiles) => {
        fetchBase = baseFiles;
        return {
          commitSha: 'newsha',
          fileMap: { 'bookmarks/toolbar/x.json': '{"t":"x2"}' },
          shaMap: { 'bookmarks/toolbar/x.json': 's2' },
        };
      },
    });
    assert.strictEqual(fetchBase, cached);
    assert.equal(result.fileMap['bookmarks/toolbar/x.json'], '{"t":"x2"}');
    assert.equal(result.syncStateUpdate.lastCommitSha, 'newsha');
  });

  it('uses cache without HEAD check when lastCommitSha is missing', async () => {
    let headCalled = false;
    const result = await loadTargetFileMapForSwitch({
      targetState: {
        lastSyncFiles: {
          'bookmarks/a.json': { sha: null, content: '{}' },
        },
      },
      targetSettings,
      targetBasePath: 'bookmarks',
      createGitProvider: () => ({
        getLatestCommitSha: async () => {
          headCalled = true;
          return 'x';
        },
      }),
      fetchRemoteFileMap: async () => {
        throw new Error('should not fetch');
      },
    });
    assert.equal(headCalled, false);
    assert.equal(result.fileMap['bookmarks/a.json'], '{}');
  });

  it('full pull when cache is empty', async () => {
    let fullPull = false;
    const result = await loadTargetFileMapForSwitch({
      targetState: {},
      targetSettings,
      targetBasePath: 'bookmarks',
      createGitProvider: () => ({}),
      fetchRemoteFileMap: async (_api, _base, baseFiles) => {
        fullPull = baseFiles === null;
        return {
          commitSha: 'c1',
          fileMap: { 'bookmarks/b.json': '{}' },
          shaMap: { 'bookmarks/b.json': 's1' },
        };
      },
    });
    assert.equal(fullPull, true);
    assert.equal(result.syncStateUpdate.lastCommitSha, 'c1');
  });
});
