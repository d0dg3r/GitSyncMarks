import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let computeDiff, mergeDiffs;

before(async () => {
  globalThis.chrome = {
    runtime: { getURL: (p) => p },
    storage: {
      sync: { get: async () => ({}) },
      local: { get: async () => ({}), set: async () => {} },
      onChanged: { addListener: () => {} },
    },
    bookmarks: { getTree: async () => [] },
  };
  const mod = await import('../lib/sync-engine.js');
  computeDiff = mod.computeDiff;
  mergeDiffs = mod.mergeDiffs;
});

// ---- computeDiff ----

describe('computeDiff', () => {
  it('detects added files', () => {
    const base = {};
    const current = { 'a.json': '{"url":"x"}' };
    const diff = computeDiff(base, current);
    assert.deepEqual(diff.added, { 'a.json': '{"url":"x"}' });
    assert.deepEqual(diff.removed, []);
    assert.deepEqual(diff.modified, {});
  });

  it('detects removed files', () => {
    const base = { 'a.json': '{"url":"x"}' };
    const current = {};
    const diff = computeDiff(base, current);
    assert.deepEqual(diff.added, {});
    assert.deepEqual(diff.removed, ['a.json']);
    assert.deepEqual(diff.modified, {});
  });

  it('detects modified files', () => {
    const base = { 'a.json': '{"url":"x"}' };
    const current = { 'a.json': '{"url":"y"}' };
    const diff = computeDiff(base, current);
    assert.deepEqual(diff.added, {});
    assert.deepEqual(diff.removed, []);
    assert.deepEqual(diff.modified, { 'a.json': '{"url":"y"}' });
  });

  it('returns empty diff for identical maps', () => {
    const files = { 'a.json': '1', 'b.json': '2' };
    const diff = computeDiff(files, { ...files });
    assert.deepEqual(diff.added, {});
    assert.deepEqual(diff.removed, []);
    assert.deepEqual(diff.modified, {});
  });

  it('handles mixed add/remove/modify', () => {
    const base = { 'a.json': '1', 'b.json': '2', 'c.json': '3' };
    const current = { 'a.json': '1', 'b.json': 'changed', 'd.json': 'new' };
    const diff = computeDiff(base, current);
    assert.deepEqual(diff.added, { 'd.json': 'new' });
    assert.deepEqual(diff.removed, ['c.json']);
    assert.deepEqual(diff.modified, { 'b.json': 'changed' });
  });
});

// ---- mergeDiffs ----

describe('mergeDiffs', () => {
  it('pushes local-only changes to remote', () => {
    const localDiff = {
      added: { 'new.json': 'content' },
      removed: [],
      modified: {},
    };
    const remoteDiff = { added: {}, removed: [], modified: {} };
    const localFiles = { 'new.json': 'content' };
    const remoteFiles = {};

    const result = mergeDiffs(localDiff, remoteDiff, localFiles, remoteFiles);
    assert.deepEqual(result.toPush, { 'new.json': 'content' });
    assert.deepEqual(result.toApplyLocal, {});
    assert.deepEqual(result.conflicts, []);
  });

  it('applies remote-only changes locally', () => {
    const localDiff = { added: {}, removed: [], modified: {} };
    const remoteDiff = {
      added: { 'remote.json': 'data' },
      removed: [],
      modified: {},
    };
    const localFiles = {};
    const remoteFiles = { 'remote.json': 'data' };

    const result = mergeDiffs(localDiff, remoteDiff, localFiles, remoteFiles);
    assert.deepEqual(result.toPush, {});
    assert.deepEqual(result.toApplyLocal, { 'remote.json': 'data' });
    assert.deepEqual(result.conflicts, []);
  });

  it('handles local removal', () => {
    const localDiff = { added: {}, removed: ['old.json'], modified: {} };
    const remoteDiff = { added: {}, removed: [], modified: {} };
    const localFiles = {};
    const remoteFiles = { 'old.json': 'x' };

    const result = mergeDiffs(localDiff, remoteDiff, localFiles, remoteFiles);
    assert.deepEqual(result.toPush, { 'old.json': null });
    assert.deepEqual(result.conflicts, []);
  });

  it('handles remote removal', () => {
    const localDiff = { added: {}, removed: [], modified: {} };
    const remoteDiff = { added: {}, removed: ['gone.json'], modified: {} };
    const localFiles = { 'gone.json': 'x' };
    const remoteFiles = {};

    const result = mergeDiffs(localDiff, remoteDiff, localFiles, remoteFiles);
    assert.deepEqual(result.toApplyLocal, { 'gone.json': null });
    assert.deepEqual(result.conflicts, []);
  });

  it('no conflict when both sides make same change', () => {
    const localDiff = { added: { 'same.json': 'v2' }, removed: [], modified: {} };
    const remoteDiff = { added: { 'same.json': 'v2' }, removed: [], modified: {} };
    const localFiles = { 'same.json': 'v2' };
    const remoteFiles = { 'same.json': 'v2' };

    const result = mergeDiffs(localDiff, remoteDiff, localFiles, remoteFiles);
    assert.deepEqual(result.toPush, {});
    assert.deepEqual(result.toApplyLocal, {});
    assert.deepEqual(result.conflicts, []);
  });

  it('reports conflict when both sides modify differently', () => {
    const localDiff = { added: {}, removed: [], modified: { 'x.json': 'local' } };
    const remoteDiff = { added: {}, removed: [], modified: { 'x.json': 'remote' } };
    const localFiles = { 'x.json': 'local' };
    const remoteFiles = { 'x.json': 'remote' };

    const result = mergeDiffs(localDiff, remoteDiff, localFiles, remoteFiles);
    assert.equal(result.conflicts.length, 1);
    assert.equal(result.conflicts[0].path, 'x.json');
    assert.equal(result.conflicts[0].local, 'local');
    assert.equal(result.conflicts[0].remote, 'remote');
  });

  it('merges _order.json when both sides add entries', () => {
    const base = { 'dir/_order.json': JSON.stringify(['a.json']) };
    const localFiles = { 'dir/_order.json': JSON.stringify(['a.json', 'b.json']) };
    const remoteFiles = { 'dir/_order.json': JSON.stringify(['a.json', 'c.json']) };

    const localDiff = { added: {}, removed: [], modified: { 'dir/_order.json': localFiles['dir/_order.json'] } };
    const remoteDiff = { added: {}, removed: [], modified: { 'dir/_order.json': remoteFiles['dir/_order.json'] } };

    const result = mergeDiffs(localDiff, remoteDiff, localFiles, remoteFiles, base);
    assert.equal(result.conflicts.length, 0);
    const merged = JSON.parse(result.toPush['dir/_order.json']);
    assert.ok(merged.includes('a.json'));
    assert.ok(merged.includes('b.json'));
    assert.ok(merged.includes('c.json'));
  });

  it('local add + remote remove = conflict', () => {
    const localDiff = { added: { 'file.json': 'new' }, removed: [], modified: {} };
    const remoteDiff = { added: {}, removed: ['file.json'], modified: {} };
    const localFiles = { 'file.json': 'new' };
    const remoteFiles = {};

    const result = mergeDiffs(localDiff, remoteDiff, localFiles, remoteFiles);
    assert.equal(result.conflicts.length, 1);
    assert.equal(result.conflicts[0].path, 'file.json');
  });
});
