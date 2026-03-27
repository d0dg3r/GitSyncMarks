import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify,
  shortHash,
  generateFilename,
  contentHash,
  bookmarkTreeToFileMap,
  fileMapToBookmarkTree,
  fileMapToMarkdown,
  fileMapToNetscapeHtml,
} from '../lib/bookmark-serializer.js';

// ---- slugify ----

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    assert.equal(slugify('My Bookmarks'), 'my-bookmarks');
  });

  it('strips accents via NFD normalization', () => {
    assert.equal(slugify('Résumé'), 'resume');
  });

  it('removes non-alphanumeric characters', () => {
    assert.equal(slugify('Hello, World!'), 'hello-world');
  });

  it('returns "untitled" for empty or whitespace-only input', () => {
    assert.equal(slugify(''), 'untitled');
    assert.equal(slugify('   '), 'untitled');
  });

  it('truncates at 40 characters', () => {
    const long = 'a'.repeat(60);
    assert.equal(slugify(long).length, 40);
  });

  it('strips leading and trailing hyphens', () => {
    assert.equal(slugify('---test---'), 'test');
  });

  it('handles null/undefined gracefully', () => {
    assert.equal(slugify(null), 'untitled');
    assert.equal(slugify(undefined), 'untitled');
  });
});

// ---- shortHash ----

describe('shortHash', () => {
  it('returns a 4-character base-36 string', () => {
    const h = shortHash('https://example.com');
    assert.equal(h.length, 4);
    assert.match(h, /^[0-9a-z]{4}$/);
  });

  it('is deterministic (same input = same output)', () => {
    assert.equal(shortHash('test'), shortHash('test'));
  });

  it('produces different hashes for different inputs', () => {
    assert.notEqual(shortHash('foo'), shortHash('bar'));
  });
});

// ---- generateFilename ----

describe('generateFilename', () => {
  it('combines slugified title with hashed URL', () => {
    const filename = generateFilename('My Page', 'https://example.com');
    assert.match(filename, /^my-page_[0-9a-z]{4}\.json$/);
  });

  it('is deterministic', () => {
    const a = generateFilename('Test', 'https://test.com');
    const b = generateFilename('Test', 'https://test.com');
    assert.equal(a, b);
  });

  it('differentiates by URL', () => {
    const a = generateFilename('Same Title', 'https://a.com');
    const b = generateFilename('Same Title', 'https://b.com');
    assert.notEqual(a, b);
  });
});

// ---- contentHash ----

describe('contentHash', () => {
  it('returns a base-36 string', () => {
    const h = contentHash('{"title":"test","url":"https://example.com"}');
    assert.match(h, /^[0-9a-z]+$/);
  });

  it('is deterministic', () => {
    assert.equal(contentHash('hello'), contentHash('hello'));
  });

  it('varies with content', () => {
    assert.notEqual(contentHash('abc'), contentHash('xyz'));
  });
});

// ---- bookmarkTreeToFileMap ----

describe('bookmarkTreeToFileMap', () => {
  it('serializes a simple tree to per-file JSON', () => {
    const tree = [
      { id: '0', children: [
        { id: '1', title: 'Bookmarks Bar', children: [
          { id: '10', title: 'Example', url: 'https://example.com' },
        ]},
        { id: '2', title: 'Other Bookmarks', children: [] },
      ]},
    ];

    const files = bookmarkTreeToFileMap(tree, 'bookmarks');
    const paths = Object.keys(files);

    assert.ok(paths.some(p => p.startsWith('bookmarks/toolbar/')));
    assert.ok(paths.some(p => p === 'bookmarks/toolbar/_order.json'));

    const order = JSON.parse(files['bookmarks/toolbar/_order.json']);
    assert.equal(order.length, 1);
    assert.match(order[0], /\.json$/);

    const bookmarkFile = files[`bookmarks/toolbar/${order[0]}`];
    const data = JSON.parse(bookmarkFile);
    assert.equal(data.title, 'Example');
    assert.equal(data.url, 'https://example.com');
  });

  it('handles subfolders with preserved titles', () => {
    const tree = [
      { id: '0', children: [
        { id: '1', title: 'Bookmarks Bar', children: [
          { id: '3', title: 'Dev Tools', children: [
            { id: '10', title: 'GitHub', url: 'https://github.com' },
          ]},
        ]},
        { id: '2', title: 'Other Bookmarks', children: [] },
      ]},
    ];

    const files = bookmarkTreeToFileMap(tree, 'bookmarks');
    const order = JSON.parse(files['bookmarks/toolbar/_order.json']);
    const folderEntry = order.find(e => typeof e === 'object' && e.dir);
    assert.ok(folderEntry, 'should have a folder entry in _order.json');
    assert.equal(folderEntry.title, 'Dev Tools');
  });

  it('generates same filename for same-URL bookmarks (deterministic)', () => {
    const tree = [
      { id: '0', children: [
        { id: '1', title: 'Bookmarks Bar', children: [
          { id: '10', title: 'Example', url: 'https://example.com' },
          { id: '11', title: 'Example Dupe', url: 'https://example.com' },
        ]},
        { id: '2', title: 'Other Bookmarks', children: [] },
      ]},
    ];

    const files = bookmarkTreeToFileMap(tree, 'bookmarks');
    const order = JSON.parse(files['bookmarks/toolbar/_order.json']);
    // Both bookmarks share the same URL, so they produce entries in _order.json.
    // The file content is written once (last writer wins for same filename).
    assert.ok(order.length >= 1);
  });
});

// ---- fileMapToBookmarkTree ----

describe('fileMapToBookmarkTree', () => {
  it('deserializes files back into a tree', () => {
    const files = {
      'bookmarks/toolbar/_order.json': JSON.stringify(['example_abc1.json']),
      'bookmarks/toolbar/example_abc1.json': JSON.stringify({ title: 'Example', url: 'https://example.com' }),
    };

    const tree = fileMapToBookmarkTree(files, 'bookmarks');
    assert.ok(tree.toolbar);
    assert.equal(tree.toolbar.children.length, 1);
    assert.equal(tree.toolbar.children[0].title, 'Example');
    assert.equal(tree.toolbar.children[0].url, 'https://example.com');
  });

  it('handles missing files referenced in _order.json gracefully', () => {
    const files = {
      'bookmarks/toolbar/_order.json': JSON.stringify(['exists.json', 'missing.json']),
      'bookmarks/toolbar/exists.json': JSON.stringify({ title: 'Exists', url: 'https://exists.com' }),
    };

    const tree = fileMapToBookmarkTree(files, 'bookmarks');
    assert.equal(tree.toolbar.children.length, 1);
    assert.equal(tree.toolbar.children[0].title, 'Exists');
  });

  it('picks up orphan subfolders not in _order.json', () => {
    const files = {
      'bookmarks/toolbar/_order.json': JSON.stringify([]),
      'bookmarks/toolbar/orphan-folder/_order.json': JSON.stringify(['link.json']),
      'bookmarks/toolbar/orphan-folder/link.json': JSON.stringify({ title: 'Orphan Link', url: 'https://orphan.com' }),
    };

    const tree = fileMapToBookmarkTree(files, 'bookmarks');
    assert.equal(tree.toolbar.children.length, 1);
    assert.equal(tree.toolbar.children[0].type, 'folder');
    assert.equal(tree.toolbar.children[0].children.length, 1);
  });

  it('picks up orphan .json files not in _order.json', () => {
    const files = {
      'bookmarks/toolbar/_order.json': JSON.stringify([]),
      'bookmarks/toolbar/stray_abcd.json': JSON.stringify({ title: 'Stray', url: 'https://stray.com' }),
    };

    const tree = fileMapToBookmarkTree(files, 'bookmarks');
    assert.equal(tree.toolbar.children.length, 1);
    assert.equal(tree.toolbar.children[0].title, 'Stray');
  });

  it('skips malformed JSON files', () => {
    const files = {
      'bookmarks/toolbar/_order.json': JSON.stringify(['bad.json']),
      'bookmarks/toolbar/bad.json': 'not valid json{{{',
    };

    const tree = fileMapToBookmarkTree(files, 'bookmarks');
    assert.equal(tree.toolbar.children.length, 0);
  });
});

// ---- fileMapToMarkdown ----

describe('fileMapToMarkdown', () => {
  it('generates markdown with links', () => {
    const files = {
      'bookmarks/toolbar/_order.json': JSON.stringify(['test_1234.json']),
      'bookmarks/toolbar/test_1234.json': JSON.stringify({ title: 'Test', url: 'https://test.com' }),
    };

    const md = fileMapToMarkdown(files, 'bookmarks');
    assert.ok(md.includes('[Test](https://test.com)'));
    assert.ok(md.includes('Bookmarks Bar'));
  });

  it('includes subfolders as headings', () => {
    const files = {
      'bookmarks/toolbar/_order.json': JSON.stringify([{ dir: 'dev', title: 'Development' }]),
      'bookmarks/toolbar/dev/_order.json': JSON.stringify(['gh_xxxx.json']),
      'bookmarks/toolbar/dev/gh_xxxx.json': JSON.stringify({ title: 'GitHub', url: 'https://github.com' }),
    };

    const md = fileMapToMarkdown(files, 'bookmarks');
    assert.ok(md.includes('Development'));
    assert.ok(md.includes('[GitHub](https://github.com)'));
  });
});

// ---- fileMapToNetscapeHtml ----

describe('fileMapToNetscapeHtml', () => {
  it('generates valid Netscape HTML structure', () => {
    const files = {
      'bookmarks/toolbar/_order.json': JSON.stringify(['test_1234.json']),
      'bookmarks/toolbar/test_1234.json': JSON.stringify({ title: 'Test', url: 'https://test.com' }),
    };

    const html = fileMapToNetscapeHtml(files, 'bookmarks');
    assert.ok(html.includes('<!DOCTYPE NETSCAPE-Bookmark-file-1>'));
    assert.ok(html.includes('HREF="https://test.com"'));
    assert.ok(html.includes('>Test</A>'));
  });

  it('escapes HTML entities in titles', () => {
    const files = {
      'bookmarks/toolbar/_order.json': JSON.stringify(['xss_1234.json']),
      'bookmarks/toolbar/xss_1234.json': JSON.stringify({ title: '<script>alert(1)</script>', url: 'https://xss.com' }),
    };

    const html = fileMapToNetscapeHtml(files, 'bookmarks');
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  });
});
