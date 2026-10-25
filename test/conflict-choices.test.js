import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyConflictChoices } from '../lib/conflict-choices.js';

const conflicts = [
  { path: 'bm/a.json', local: '{"url":"https://local.test/"}', remote: '{"url":"https://remote.test/"}' },
  { path: 'bm/b.json', local: null, remote: '{"url":"https://b.test/"}' },
];

describe('applyConflictChoices', () => {
  it('keeps the local version of a file chosen as "local"', () => {
    const toPush = {};
    const toApplyLocal = {};
    const unresolved = applyConflictChoices(conflicts, { 'bm/a.json': 'local' }, toPush, toApplyLocal);
    assert.deepEqual(toPush, { 'bm/a.json': conflicts[0].local });
    assert.deepEqual(toApplyLocal, {});
    assert.deepEqual(unresolved.map((c) => c.path), ['bm/b.json']);
  });

  it('applies the remote version when chosen as "remote", including a remote deletion', () => {
    const toPush = {};
    const toApplyLocal = {};
    const unresolved = applyConflictChoices(conflicts, { 'bm/b.json': 'remote' }, toPush, toApplyLocal);
    assert.deepEqual(toApplyLocal, { 'bm/b.json': conflicts[1].remote });
    assert.deepEqual(toPush, {});
    assert.equal(unresolved.length, 1);
  });

  it('keeps every conflict unresolved without choices', () => {
    const unresolved = applyConflictChoices(conflicts, {}, {}, {});
    assert.equal(unresolved.length, 2);
  });

  it('settles a local deletion chosen as "local" by deleting it remotely', () => {
    const toPush = {};
    applyConflictChoices([{ path: 'bm/c.json', local: null, remote: '{}' }], { 'bm/c.json': 'local' }, toPush, {});
    assert.equal(toPush['bm/c.json'], null);
  });
});
