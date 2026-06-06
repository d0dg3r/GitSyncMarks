import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  listRemoteOrphanPaths,
  summarizeOrphanPaths,
} from '../lib/sync-core.js';

describe('remote orphan cleanup helpers', () => {
  const base = 'bookmarks';

  it('listRemoteOrphanPaths finds remote-only bookmark files', () => {
    const local = {
      'bookmarks/toolbar/foo.json': '{}',
    };
    const remote = {
      'bookmarks/toolbar/foo.json': '{}',
      'bookmarks/toolbar/bucher/_order.json': '[]',
      'bookmarks/toolbar/bucher-2/_order.json': '[]',
      'bookmarks/README.md': '# x',
    };
    const orphans = listRemoteOrphanPaths(local, remote, base);
    assert.deepEqual(orphans, [
      'bookmarks/toolbar/bucher-2/_order.json',
      'bookmarks/toolbar/bucher/_order.json',
    ]);
  });

  it('listRemoteOrphanPaths ignores generated and settings paths', () => {
    const local = {};
    const remote = {
      'bookmarks/README.md': '#',
      'bookmarks/settings.enc': 'enc',
      'bookmarks/toolbar/leftover.json': '{}',
    };
    const orphans = listRemoteOrphanPaths(local, remote, base);
    assert.deepEqual(orphans, ['bookmarks/toolbar/leftover.json']);
  });

  it('listRemoteOrphanPaths ignores custom Bitwarden backup prefix', () => {
    const local = {};
    const remote = {
      'vault-backups/vault.enc.json': 'enc',
      'bookmarks/toolbar/leftover.json': '{}',
    };
    const orphans = listRemoteOrphanPaths(local, remote, base, 'vault-backups');
    assert.deepEqual(orphans, ['bookmarks/toolbar/leftover.json']);
  });

  it('summarizeOrphanPaths counts top-level folders', () => {
    const orphans = [
      'bookmarks/toolbar/bucher/a.json',
      'bookmarks/toolbar/bucher/b.json',
      'bookmarks/toolbar/bucher-2/a.json',
    ];
    const summary = summarizeOrphanPaths(orphans, base);
    assert.equal(summary.orphanFileCount, 3);
    assert.equal(summary.orphanFolderCount, 2);
    assert.deepEqual(summary.sampleFolders, ['toolbar/bucher', 'toolbar/bucher-2']);
  });
});
