import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeBookmarkDifference } from '../lib/sync-preview.js';

const isBookmark = (path) => path.endsWith('.json') && !path.endsWith('_order.json');
const bm = (url) => JSON.stringify({ title: url, url });

describe('summarizeBookmarkDifference', () => {
  it('counts URLs added to and removed from the target', () => {
    const from = { 'bm/a.json': bm('https://a.test/'), 'bm/b.json': bm('https://b.test/') };
    const to = { 'bm/b.json': bm('https://b.test/'), 'bm/c.json': bm('https://c.test/') };
    assert.deepEqual(summarizeBookmarkDifference(from, to, isBookmark), { added: 1, removed: 1 });
  });

  it('does not count a moved bookmark as a delete plus an add', () => {
    const from = { 'bm/toolbar/a.json': bm('https://a.test/') };
    const to = { 'bm/other/a.json': bm('https://a.test/') };
    assert.deepEqual(summarizeBookmarkDifference(from, to, isBookmark), { added: 0, removed: 0 });
  });

  it('ignores non-bookmark files and identical maps', () => {
    const files = { 'bm/toolbar/_order.json': '[]', 'bm/toolbar/a.json': bm('https://a.test/') };
    assert.deepEqual(summarizeBookmarkDifference(files, files, isBookmark), { added: 0, removed: 0 });
  });

  it('counts duplicate URLs by multiplicity', () => {
    const from = { 'bm/1.json': bm('https://a.test/'), 'bm/2.json': bm('https://a.test/') };
    const to = { 'bm/1.json': bm('https://a.test/') };
    assert.deepEqual(summarizeBookmarkDifference(from, to, isBookmark), { added: 0, removed: 1 });
  });
});
