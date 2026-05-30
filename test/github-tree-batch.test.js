import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let chunkAtomicCommitTreeBatches, ATOMIC_COMMIT_TREE_BATCH_MAX_ENTRIES;

before(async () => {
  const mod = await import('../lib/github-tree-batch.js');
  chunkAtomicCommitTreeBatches = mod.chunkAtomicCommitTreeBatches;
  ATOMIC_COMMIT_TREE_BATCH_MAX_ENTRIES = mod.ATOMIC_COMMIT_TREE_BATCH_MAX_ENTRIES;
});

describe('chunkAtomicCommitTreeBatches', () => {
  it('returns no batches for empty input', () => {
    assert.deepEqual(chunkAtomicCommitTreeBatches([], []), []);
  });

  it('places deletions before uploads in a single batch', () => {
    const batches = chunkAtomicCommitTreeBatches(['del.json'], [{ path: 'add.json', content: '{}' }]);
    assert.equal(batches.length, 1);
    assert.deepEqual(batches[0][0], { path: 'del.json', mode: '100644', type: 'blob', sha: null });
    assert.equal(batches[0][1].path, 'add.json');
    assert.equal(batches[0][1].content, '{}');
    assert.equal(batches[0][1].sha, undefined);
  });

  it('splits when exceeding the max entries per batch', () => {
    const uploads = [];
    const total = ATOMIC_COMMIT_TREE_BATCH_MAX_ENTRIES + 5;
    for (let i = 0; i < total; i++) uploads.push({ path: `f${i}.json`, content: 'x' });
    const batches = chunkAtomicCommitTreeBatches([], uploads);
    assert.equal(batches.length, 2);
    assert.equal(batches[0].length, ATOMIC_COMMIT_TREE_BATCH_MAX_ENTRIES);
    assert.equal(batches[1].length, 5);
    const flat = batches.flat();
    assert.equal(flat.length, total);
  });

  it('splits when exceeding the byte budget', () => {
    const big = 'a'.repeat(20 * 1024 * 1024); // 20 MiB each, budget is 28 MiB
    const uploads = [
      { path: 'a.json', content: big },
      { path: 'b.json', content: big },
    ];
    const batches = chunkAtomicCommitTreeBatches([], uploads);
    assert.equal(batches.length, 2);
  });

  it('keeps all entries with the correct mode/type', () => {
    const batches = chunkAtomicCommitTreeBatches(['x.json'], [{ path: 'y.json', content: 'c' }]);
    for (const item of batches.flat()) {
      assert.equal(item.mode, '100644');
      assert.equal(item.type, 'blob');
    }
  });
});
