import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fileMapToBookmarkTree,
  orderEntryKey,
} from '../lib/bookmark-serializer.js';

// ---- orderEntryKey ----

describe('orderEntryKey', () => {
  it('returns the string itself for a bookmark filename', () => {
    assert.equal(orderEntryKey('github_a1b2.json'), 'github_a1b2.json');
  });

  it('returns dir: prefix for folder entries', () => {
    assert.equal(orderEntryKey({ dir: 'dev-tools', title: 'Dev Tools' }), 'dir:dev-tools');
  });

  it('falls back to JSON.stringify for unknown shapes', () => {
    assert.equal(orderEntryKey(42), '42');
  });
});

// ---- buildFolderChildren dedupe (via fileMapToBookmarkTree) ----

describe('buildFolderChildren deduplication', () => {
  it('skips duplicate bookmark filenames in _order.json', () => {
    const files = {
      'bm/toolbar/_order.json': JSON.stringify([
        'github_a1b2.json',
        'github_a1b2.json',
        'github_a1b2.json',
      ]),
      'bm/toolbar/github_a1b2.json': JSON.stringify({ title: 'GitHub', url: 'https://github.com' }),
    };

    const tree = fileMapToBookmarkTree(files, 'bm');
    assert.equal(tree.toolbar.children.length, 1);
    assert.equal(tree.toolbar.children[0].title, 'GitHub');
  });

  it('skips duplicate folder entries in _order.json', () => {
    const files = {
      'bm/toolbar/_order.json': JSON.stringify([
        { dir: 'dev-tools', title: 'Dev Tools' },
        { dir: 'dev-tools', title: 'Dev Tools' },
      ]),
      'bm/toolbar/dev-tools/_order.json': JSON.stringify([
        'chrome_e5f6.json',
      ]),
      'bm/toolbar/dev-tools/chrome_e5f6.json': JSON.stringify({ title: 'Chrome DevTools', url: 'https://devtools.chrome' }),
    };

    const tree = fileMapToBookmarkTree(files, 'bm');
    assert.equal(tree.toolbar.children.length, 1);
    assert.equal(tree.toolbar.children[0].type, 'folder');
    assert.equal(tree.toolbar.children[0].children.length, 1);
  });

  it('skips duplicate legacy folder strings in _order.json', () => {
    const files = {
      'bm/other/_order.json': JSON.stringify(['my-folder', 'my-folder']),
      'bm/other/my-folder/_order.json': JSON.stringify([]),
    };

    const tree = fileMapToBookmarkTree(files, 'bm');
    assert.equal(tree.other.children.length, 1);
    assert.equal(tree.other.children[0].type, 'folder');
  });

  it('preserves distinct entries that appear once each', () => {
    const files = {
      'bm/toolbar/_order.json': JSON.stringify([
        'a_0001.json',
        'b_0002.json',
        { dir: 'folder-x', title: 'Folder X' },
      ]),
      'bm/toolbar/a_0001.json': JSON.stringify({ title: 'A', url: 'https://a.com' }),
      'bm/toolbar/b_0002.json': JSON.stringify({ title: 'B', url: 'https://b.com' }),
      'bm/toolbar/folder-x/_order.json': JSON.stringify([]),
    };

    const tree = fileMapToBookmarkTree(files, 'bm');
    assert.equal(tree.toolbar.children.length, 3);
  });

  it('handles _order.json where entire structure is duplicated', () => {
    const order = [
      'a_0001.json',
      { dir: 'sub', title: 'Sub' },
      'a_0001.json',
      { dir: 'sub', title: 'Sub' },
    ];
    const files = {
      'bm/toolbar/_order.json': JSON.stringify(order),
      'bm/toolbar/a_0001.json': JSON.stringify({ title: 'A', url: 'https://a.com' }),
      'bm/toolbar/sub/_order.json': JSON.stringify(['b_0002.json']),
      'bm/toolbar/sub/b_0002.json': JSON.stringify({ title: 'B', url: 'https://b.com' }),
    };

    const tree = fileMapToBookmarkTree(files, 'bm');
    assert.equal(tree.toolbar.children.length, 2);
    assert.equal(tree.toolbar.children[0].type, 'bookmark');
    assert.equal(tree.toolbar.children[1].type, 'folder');
  });
});
