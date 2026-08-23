import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  listPayloadDeletions,
  assessDeletionGuard,
  assessLocalShrink,
  assessFileChangesDeletionGuard,
  DEFAULT_DELETE_GUARD_MIN_FILES,
  DEFAULT_DELETE_GUARD_MAX_FRACTION,
} from '../lib/deletion-guard.js';

const isIgnored = (path) => path.endsWith('/README.md');

describe('listPayloadDeletions', () => {
  it('lists bookmark payload paths scheduled for deletion', () => {
    const paths = listPayloadDeletions(
      {
        'bookmarks/toolbar/foo.json': null,
        'bookmarks/toolbar/_order.json': null,
        'bookmarks/README.md': null,
        'bookmarks/toolbar/bar.json': '{"url":"https://x"}',
      },
      isIgnored
    );
    assert.deepEqual(paths, ['bookmarks/toolbar/foo.json']);
  });
});

describe('assessDeletionGuard', () => {
  it('blocks the #210 scenario (37 of ~180)', () => {
    const result = assessDeletionGuard({
      deleteCount: 37,
      referenceCount: 180,
    });
    assert.equal(result.blocked, true);
    assert.equal(result.deleteCount, 37);
    assert.equal(result.referenceCount, 180);
  });

  it('allows small legitimate deletions', () => {
    const result = assessDeletionGuard({
      deleteCount: 3,
      referenceCount: 180,
    });
    assert.equal(result.blocked, false);
  });

  it('allows when guard is disabled', () => {
    const result = assessDeletionGuard({
      deleteCount: 50,
      referenceCount: 100,
      enabled: false,
    });
    assert.equal(result.blocked, false);
  });

  it('requires minimum file count', () => {
    const result = assessDeletionGuard({
      deleteCount: DEFAULT_DELETE_GUARD_MIN_FILES - 1,
      referenceCount: 20,
      maxFraction: 1,
    });
    assert.equal(result.blocked, false);
  });
});

describe('assessLocalShrink', () => {
  it('blocks when local tree shrank far below base', () => {
    const result = assessLocalShrink({
      localCount: 140,
      baseCount: 180,
      maxFraction: DEFAULT_DELETE_GUARD_MAX_FRACTION,
    });
    assert.equal(result.blocked, true);
  });

  it('allows modest shrink', () => {
    const result = assessLocalShrink({
      localCount: 170,
      baseCount: 180,
    });
    assert.equal(result.blocked, false);
  });
});

describe('assessFileChangesDeletionGuard', () => {
  it('aggregates deletions from file change map', () => {
    const fileChanges = {};
    for (let i = 0; i < 37; i++) {
      fileChanges[`bookmarks/toolbar/file_${i}.json`] = null;
    }
    const result = assessFileChangesDeletionGuard(fileChanges, 180, isIgnored);
    assert.equal(result.blocked, true);
    assert.equal(result.paths.length, 37);
  });
});
