import assert from 'node:assert';
import { describe, it, before, after } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileMapToBookmarkTree } from '../lib/bookmark-serializer.js';

const SCRIPT = fileURLToPath(new URL('../scripts/add-bookmark-to-repo.py', import.meta.url));

function runScript(basePath, args) {
  execFileSync('python3', [SCRIPT, '--base-path', basePath, ...args], { stdio: 'pipe' });
}

/** Read a repo directory into a path->content file map relative to its root. */
function readFileMap(root) {
  const files = {};
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else files[relative(root, full).split('\\').join('/')] = readFileSync(full, 'utf-8');
    }
  };
  walk(root);
  return files;
}

describe('add-bookmark-to-repo.py', () => {
  let workdir;

  before(() => {
    workdir = mkdtempSync(join(tmpdir(), 'gsm-add-bookmark-'));
  });

  after(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  it('initializes structure in a greenfield repo', () => {
    const base = join(workdir, 'greenfield', 'bookmarks');
    runScript(base, ['--url', 'https://github.com', '--title', 'GitHub', '--folder', 'toolbar']);

    const files = readFileMap(base);
    assert.deepEqual(JSON.parse(files['_index.json']), { version: 2 });
    assert.ok('other/_order.json' in files, 'other/_order.json created');
    assert.ok('toolbar/_order.json' in files, 'toolbar/_order.json created');

    const order = JSON.parse(files['toolbar/_order.json']);
    assert.equal(order.length, 1);
    assert.equal(order[0], 'github_1chl.json');
    assert.deepEqual(JSON.parse(files[`toolbar/${order[0]}`]), {
      title: 'GitHub',
      url: 'https://github.com',
    });
  });

  it('imports back into a bookmark tree', () => {
    const base = join(workdir, 'roundtrip', 'bookmarks');
    runScript(base, ['--url', 'https://github.com', '--title', 'GitHub', '--folder', 'toolbar']);

    // Prefix with base dir name so fileMapToBookmarkTree can resolve roles
    const raw = readFileMap(base);
    const fileMap = {};
    for (const [path, content] of Object.entries(raw)) fileMap[`bookmarks/${path}`] = content;

    const tree = fileMapToBookmarkTree(fileMap, 'bookmarks');
    assert.equal(tree.toolbar.children.length, 1);
    assert.equal(tree.toolbar.children[0].title, 'GitHub');
    assert.equal(tree.toolbar.children[0].url, 'https://github.com');
  });

  it('registers a subfolder as a folder entry in the parent order', () => {
    const base = join(workdir, 'subfolder', 'bookmarks');
    runScript(base, ['--url', 'https://example.com', '--title', 'Example', '--folder', 'toolbar', '--path', 'dev-tools']);

    const files = readFileMap(base);
    const parentOrder = JSON.parse(files['toolbar/_order.json']);
    const folderEntry = parentOrder.find((e) => typeof e === 'object' && e.dir === 'dev-tools');
    assert.ok(folderEntry, 'parent order has folder entry for dev-tools');
    assert.equal(folderEntry.title, 'dev-tools');

    const subOrder = JSON.parse(files['toolbar/dev-tools/_order.json']);
    assert.equal(subOrder.length, 1);
    assert.equal(subOrder[0], 'example_v031.json');
  });

  it('is idempotent for the same bookmark', () => {
    const base = join(workdir, 'idempotent', 'bookmarks');
    runScript(base, ['--url', 'https://github.com', '--title', 'GitHub', '--folder', 'toolbar']);
    runScript(base, ['--url', 'https://github.com', '--title', 'GitHub', '--folder', 'toolbar']);

    const order = JSON.parse(readFileMap(base)['toolbar/_order.json']);
    assert.equal(order.length, 1, 'filename not duplicated in order');
  });
});
