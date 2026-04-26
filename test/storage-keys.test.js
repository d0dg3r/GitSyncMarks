import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEYS, LOCAL_STORAGE_KEYS } from '../lib/storage-keys.js';

test('STORAGE_KEYS and LOCAL_STORAGE_KEYS string values are unique', () => {
  const svals = Object.values(STORAGE_KEYS);
  assert.equal(new Set(svals).size, svals.length, 'duplicate value in STORAGE_KEYS');
  const lvals = Object.values(LOCAL_STORAGE_KEYS);
  assert.equal(new Set(lvals).size, lvals.length, 'duplicate value in LOCAL_STORAGE_KEYS');
});

test('STORAGE_KEYS and LOCAL_STORAGE_KEYS do not overlap (same string)', () => {
  const a = new Set(Object.values(STORAGE_KEYS));
  for (const v of Object.values(LOCAL_STORAGE_KEYS)) {
    assert.equal(a.has(v), false, `LOCAL key ${v} collides with STORAGE_KEYS`);
  }
});
