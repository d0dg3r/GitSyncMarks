import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let mergeOrderJson;

// Provide minimal chrome global so sync-engine.js can load in Node
before(async () => {
  globalThis.chrome = {
    runtime: { getURL: (p) => p },
    storage: { sync: { get: async () => ({}) }, local: { get: async () => ({}), set: async () => {} } },
    bookmarks: { getTree: async () => [] },
  };
  const mod = await import('../lib/sync-engine.js');
  mergeOrderJson = mod.mergeOrderJson;
});

describe('mergeOrderJson deduplication', () => {
  it('collapses duplicate entries already present in local', () => {
    const base = JSON.stringify(['a.json', 'b.json']);
    const local = JSON.stringify(['a.json', 'b.json', 'a.json', 'b.json']);
    const remote = JSON.stringify(['a.json', 'b.json']);

    const result = JSON.parse(mergeOrderJson(base, local, remote));
    assert.deepEqual(result, ['a.json', 'b.json']);
  });

  it('collapses duplicates when local has whole structure doubled', () => {
    const base = JSON.stringify([
      'a.json',
      { dir: 'folder', title: 'Folder' },
    ]);
    const local = JSON.stringify([
      'a.json',
      { dir: 'folder', title: 'Folder' },
      'a.json',
      { dir: 'folder', title: 'Folder' },
    ]);
    const remote = JSON.stringify([
      'a.json',
      { dir: 'folder', title: 'Folder' },
    ]);

    const result = JSON.parse(mergeOrderJson(base, local, remote));
    assert.equal(result.length, 2);
    assert.equal(result[0], 'a.json');
    assert.equal(result[1].dir, 'folder');
  });

  it('still appends genuinely new remote entries', () => {
    const base = JSON.stringify(['a.json']);
    const local = JSON.stringify(['a.json', 'a.json']);
    const remote = JSON.stringify(['a.json', 'c.json']);

    const result = JSON.parse(mergeOrderJson(base, local, remote));
    assert.deepEqual(result, ['a.json', 'c.json']);
  });

  it('preserves order for non-duplicate entries', () => {
    const base = JSON.stringify(['a.json']);
    const local = JSON.stringify(['a.json', 'b.json']);
    const remote = JSON.stringify(['a.json', 'c.json']);

    const result = JSON.parse(mergeOrderJson(base, local, remote));
    assert.deepEqual(result, ['a.json', 'b.json', 'c.json']);
  });

  it('returns null for malformed JSON', () => {
    assert.equal(mergeOrderJson('[]', '{bad', '[]'), null);
  });
});
