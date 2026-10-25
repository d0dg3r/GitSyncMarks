import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBookmarkFilename, generateFilename, bookmarkTreeToFileMap } from '../lib/bookmark-serializer.js';

describe('resolveBookmarkFilename', () => {
  it('returns the plain generated name for a free slot', () => {
    const names = new Map();
    assert.equal(resolveBookmarkFilename('Home', 'https://a.test/', names), generateFilename('Home', 'https://a.test/'));
  });

  it('skips the same URL twice (browser duplicate)', () => {
    const names = new Map();
    const first = resolveBookmarkFilename('Home', 'https://a.test/', names);
    names.set(first, 'https://a.test/');
    assert.equal(resolveBookmarkFilename('Home', 'https://a.test/', names), null);
  });

  it('adds a numeric suffix when a different URL collides on the same name', () => {
    // Simulate a slug + hash collision: the taken name belongs to another URL.
    const taken = generateFilename('Home', 'https://b.test/');
    const names = new Map([[taken, 'https://a.test/']]);
    const stem = taken.replace(/\.json$/, '');
    assert.equal(resolveBookmarkFilename('Home', 'https://b.test/', names), `${stem}-2.json`);
    names.set(`${stem}-2.json`, 'https://b.test/');
    // The same URL again is still a duplicate, even on the suffixed name.
    assert.equal(resolveBookmarkFilename('Home', 'https://b.test/', names), null);
  });
});

describe('bookmarkTreeToFileMap keeps distinct bookmarks with colliding names', () => {
  it('writes both bookmarks when titles are empty and URLs differ', () => {
    const tree = [{
      id: '0',
      children: [{
        id: '1',
        title: 'Bookmarks Toolbar',
        children: [
          { id: '2', title: '', url: 'https://one.test/' },
          { id: '3', title: '', url: 'https://two.test/' },
        ],
      }],
    }];
    const files = bookmarkTreeToFileMap(tree, 'bm');
    const order = JSON.parse(files['bm/toolbar/_order.json']);
    assert.equal(order.length, 2);
    const urls = order.map((name) => JSON.parse(files[`bm/toolbar/${name}`]).url).sort();
    assert.deepEqual(urls, ['https://one.test/', 'https://two.test/']);
  });
});
