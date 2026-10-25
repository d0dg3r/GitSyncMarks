import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findRenames, extractRenameConflicts } from '../lib/bookmark-renames.js';
import { applyConflictChoices } from '../lib/conflict-choices.js';

const isBookmark = (path) => path.endsWith('.json') && !path.endsWith('_order.json');
const bm = (url, title = url) => JSON.stringify({ title, url });

describe('findRenames', () => {
  it('pairs a removal and an addition with the same URL', () => {
    const base = { 'bm/t/old_1.json': bm('https://a.test/') };
    const files = { 'bm/t/new_1.json': bm('https://a.test/', 'new') };
    const renames = findRenames(['bm/t/old_1.json'], ['bm/t/new_1.json'], base, files, isBookmark);
    assert.equal(renames.get('bm/t/old_1.json'), 'bm/t/new_1.json');
  });

  it('ignores ambiguous URLs (two removals with one URL)', () => {
    const base = { 'bm/a.json': bm('https://a.test/'), 'bm/b.json': bm('https://a.test/') };
    const files = { 'bm/c.json': bm('https://a.test/') };
    assert.equal(findRenames(['bm/a.json', 'bm/b.json'], ['bm/c.json'], base, files, isBookmark).size, 0);
  });
});

describe('extractRenameConflicts', () => {
  const base = { 'bm/same.json': bm('https://s.test/', 'Same') };
  const localFiles = { 'bm/alpha.json': bm('https://s.test/', 'Alpha') };
  const remoteFiles = { 'bm/beta.json': bm('https://s.test/', 'Beta') };
  const localDiff = { added: { 'bm/alpha.json': localFiles['bm/alpha.json'] }, removed: ['bm/same.json'], modified: {} };
  const remoteDiff = { added: { 'bm/beta.json': remoteFiles['bm/beta.json'] }, removed: ['bm/same.json'], modified: {} };

  it('turns two different renames of one bookmark into one conflict', () => {
    const result = extractRenameConflicts({ localDiff, remoteDiff, baseFiles: base, localFiles, remoteFiles, isBookmarkFile: isBookmark });
    assert.equal(result.conflicts.length, 1);
    assert.equal(result.conflicts[0].path, 'bm/same.json');
    assert.equal(result.conflicts[0].localPath, 'bm/alpha.json');
    assert.equal(result.conflicts[0].remotePath, 'bm/beta.json');
    assert.deepEqual(result.localDiff.added, {});
    assert.deepEqual(result.remoteDiff.removed, []);
  });

  it('is not a conflict when both sides chose the same new name', () => {
    const same = { added: { 'bm/alpha.json': localFiles['bm/alpha.json'] }, removed: ['bm/same.json'], modified: {} };
    const result = extractRenameConflicts({
      localDiff: same, remoteDiff: same, baseFiles: base,
      localFiles, remoteFiles: localFiles, isBookmarkFile: isBookmark,
    });
    assert.equal(result.conflicts.length, 0);
  });
});

describe('applyConflictChoices for a rename conflict', () => {
  const conflict = {
    path: 'bm/same.json', localPath: 'bm/alpha.json', remotePath: 'bm/beta.json',
    local: bm('https://s.test/', 'Alpha'), remote: bm('https://s.test/', 'Beta'),
  };

  it('"local" writes the local name remotely and removes the remote copy', () => {
    const toPush = {};
    applyConflictChoices([conflict], { 'bm/same.json': 'local' }, toPush, {});
    assert.equal(toPush['bm/alpha.json'], conflict.local);
    assert.equal(toPush['bm/beta.json'], null);
  });

  it('"remote" writes the remote name locally and removes the local copy', () => {
    const toApplyLocal = {};
    applyConflictChoices([conflict], { 'bm/same.json': 'remote' }, {}, toApplyLocal);
    assert.equal(toApplyLocal['bm/beta.json'], conflict.remote);
    assert.equal(toApplyLocal['bm/alpha.json'], null);
  });
});
