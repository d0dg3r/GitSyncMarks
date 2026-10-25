import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assessFileChangesDeletionGuard } from '../lib/deletion-guard.js';

const ignore = () => false;
const bm = (url) => JSON.stringify({ title: url, url });

/** Folder "old" with n bookmarks is renamed to "new": same URLs, new paths. */
function renameFolder(n) {
  const contents = {};
  const changes = {};
  for (let i = 0; i < n; i += 1) {
    contents[`bm/toolbar/old/${i}.json`] = bm(`https://site${i}.test/`);
    changes[`bm/toolbar/old/${i}.json`] = null;
    changes[`bm/toolbar/new/${i}.json`] = bm(`https://site${i}.test/`);
  }
  return { changes, contents };
}

describe('deletion guard and moves', () => {
  it('does not block a folder rename that keeps every URL', () => {
    const { changes, contents } = renameFolder(20);
    const without = assessFileChangesDeletionGuard(changes, 20, ignore, { enabled: true });
    assert.equal(without.blocked, true, 'without contents the rename looks like a mass delete');
    const withMoves = assessFileChangesDeletionGuard(changes, 20, ignore, { enabled: true, contents });
    assert.equal(withMoves.blocked, false);
    assert.equal(withMoves.deleteCount, 0);
  });

  it('still blocks when bookmarks are really removed', () => {
    const contents = {};
    const changes = {};
    for (let i = 0; i < 20; i += 1) {
      contents[`bm/toolbar/${i}.json`] = bm(`https://gone${i}.test/`);
      changes[`bm/toolbar/${i}.json`] = null;
    }
    const result = assessFileChangesDeletionGuard(changes, 20, ignore, { enabled: true, contents });
    assert.equal(result.blocked, true);
    assert.equal(result.deleteCount, 20);
  });

  it('matches duplicates one to one', () => {
    const contents = { 'bm/a.json': bm('https://x.test/'), 'bm/b.json': bm('https://x.test/') };
    const changes = { 'bm/a.json': null, 'bm/b.json': null, 'bm/c.json': bm('https://x.test/') };
    const result = assessFileChangesDeletionGuard(changes, 2, ignore, { enabled: true, minFiles: 1, contents });
    assert.equal(result.deleteCount, 1);
  });
});
