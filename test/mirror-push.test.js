import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterFileMapForMirror } from '../lib/mirror-push.js';

describe('mirror-push filterFileMapForMirror', () => {
  it('excludes generated files by default', () => {
    const map = {
      'bookmarks/toolbar/a.json': '{"title":"a"}',
      'bookmarks/README.md': '# readme',
      'bookmarks/bookmarks.html': '<html></html>',
    };
    const out = filterFileMapForMirror(map, { pushGenerated: false, pushSettings: false });
    assert.deepEqual(Object.keys(out), ['bookmarks/toolbar/a.json']);
  });

  it('includes generated files when pushGenerated is true', () => {
    const map = {
      'bookmarks/toolbar/a.json': '{"title":"a"}',
      'bookmarks/README.md': '# readme',
    };
    const out = filterFileMapForMirror(map, { pushGenerated: true, pushSettings: false });
    assert.ok(out['bookmarks/README.md']);
    assert.ok(out['bookmarks/toolbar/a.json']);
  });
});
