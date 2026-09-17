import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateFilename } from '../lib/bookmark-serializer.js';

function resolveGet(store, query) {
  if (query == null) return { ...store };
  if (typeof query === 'string') return query in store ? { [query]: store[query] } : {};
  if (Array.isArray(query)) {
    const out = {};
    for (const k of query) if (k in store) out[k] = store[k];
    return out;
  }
  const out = {};
  for (const [k, def] of Object.entries(query)) out[k] = k in store ? store[k] : def;
  return out;
}

function bookmarkJson(title, url) {
  return JSON.stringify({ title, url }, null, 2);
}

function fileFor(title, url, role = 'toolbar') {
  const name = generateFilename(title, url);
  return {
    name,
    path: `bookmarks/${role}/${name}`,
    content: bookmarkJson(title, url),
    node: { id: `bm-${name}`, title, url, parentId: role === 'toolbar' ? '1' : '2' },
  };
}

function structureFiles(extra = {}) {
  return {
    'bookmarks/_index.json': JSON.stringify({ version: 2 }, null, 2),
    'bookmarks/toolbar/_order.json': '[]',
    'bookmarks/other/_order.json': '[]',
    ...extra,
  };
}

function filesFromBookmarks(items) {
  const files = structureFiles();
  const toolbarOrder = [];
  const otherOrder = [];
  for (const item of items) {
    files[item.path] = item.content;
    if (item.path.startsWith('bookmarks/toolbar/')) toolbarOrder.push(item.name);
    else otherOrder.push(item.name);
  }
  files['bookmarks/toolbar/_order.json'] = JSON.stringify(toolbarOrder, null, 2);
  files['bookmarks/other/_order.json'] = JSON.stringify(otherOrder, null, 2);
  return files;
}

function toBaseFiles(fileMap) {
  const out = {};
  for (const [path, content] of Object.entries(fileMap)) {
    out[path] = { sha: `sha-${path}`, content };
  }
  return out;
}

function createGithubMock() {
  const blobs = new Map();
  const files = {};
  let commitSha = 'commit-1';
  let treeSha = 'tree-1';
  let seq = 1;
  const calls = [];

  function contentSha(content) {
    let h = 0;
    const s = String(content);
    for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
    return `blob-${(h >>> 0).toString(16)}`;
  }

  function replaceFiles(fileMap) {
    for (const k of Object.keys(files)) delete files[k];
    blobs.clear();
    for (const [path, content] of Object.entries(fileMap || {})) {
      const sha = contentSha(content);
      blobs.set(sha, content);
      files[path] = sha;
    }
  }

  function json(status, body) {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => null },
      json: async () => body,
    };
  }

  globalThis.fetch = async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const u = String(url);
    calls.push({ method, url: u });

    if (u.includes('/git/ref/heads/')) {
      if (!commitSha) return json(404, { message: 'Not Found' });
      return json(200, { object: { sha: commitSha } });
    }
    if (method === 'GET' && u.includes('/git/commits/')) {
      return json(200, { sha: commitSha, tree: { sha: treeSha } });
    }
    if (method === 'GET' && u.includes('/git/trees/')) {
      const tree = Object.entries(files).map(([path, sha]) => ({
        path,
        sha,
        type: 'blob',
        mode: '100644',
      }));
      return json(200, { tree, truncated: false });
    }
    if (method === 'GET' && u.includes('/git/blobs/')) {
      const sha = u.split('/git/blobs/')[1].split('?')[0];
      const content = blobs.get(sha) || '';
      return json(200, { content: Buffer.from(content, 'utf8').toString('base64'), encoding: 'base64' });
    }
    if (method === 'POST' && u.endsWith('/git/trees')) {
      const body = JSON.parse(options.body || '{}');
      for (const item of body.tree || []) {
        if (item.sha === null) delete files[item.path];
        else if (item.content != null) {
          const sha = contentSha(item.content);
          blobs.set(sha, item.content);
          files[item.path] = sha;
        }
      }
      treeSha = `tree-${++seq}`;
      return json(200, { sha: treeSha });
    }
    if (method === 'POST' && u.endsWith('/git/commits')) {
      commitSha = `commit-${++seq}`;
      return json(200, { sha: commitSha });
    }
    if (method === 'PATCH' && u.includes('/git/refs/heads/')) {
      return json(200, {});
    }
    if (method === 'POST' && u.endsWith('/git/refs')) {
      return json(201, {});
    }
    return json(404, { message: `unmocked ${method} ${u}` });
  };

  return {
    replaceFiles,
    missingBranch() {
      commitSha = null;
    },
    getCommitSha: () => commitSha,
    calls,
    blobGets: () => calls.filter((c) => c.method === 'GET' && c.url.includes('/git/blobs/')).length,
  };
}

function createBookmarkStore(items = []) {
  const bookmarks = new Map();
  bookmarks.set('0', { id: '0', title: '', children: ['1', '2'] });
  bookmarks.set('1', { id: '1', title: 'Bookmarks Bar', parentId: '0', children: [] });
  bookmarks.set('2', { id: '2', title: 'Other Bookmarks', parentId: '0', children: [] });
  let nextId = 200;
  for (const item of items) {
    const parentId = item.node.parentId;
    const id = item.node.id;
    bookmarks.set(id, { id, title: item.node.title, url: item.node.url, parentId });
    bookmarks.get(parentId).children.push(id);
  }

  function nodeToTree(id) {
    const n = bookmarks.get(id);
    if (!n) return null;
    const out = { id: n.id, title: n.title, parentId: n.parentId };
    if (n.url) out.url = n.url;
    if (n.children) out.children = n.children.map(nodeToTree);
    return out;
  }

  return {
    getTree: async () => [nodeToTree('0')],
    create: async ({ parentId, title, url }) => {
      const id = String(nextId++);
      const node = { id, title, parentId, url };
      if (!url) node.children = [];
      bookmarks.set(id, node);
      const parent = bookmarks.get(parentId);
      if (parent?.children) parent.children.push(id);
      return { id, title, url, parentId };
    },
    removeTree: async function removeTree(id) {
      const n = bookmarks.get(id);
      if (!n) return;
      if (n.children) {
        for (const child of [...n.children]) await removeTree(child);
      }
      const parent = bookmarks.get(n.parentId);
      if (parent?.children) parent.children = parent.children.filter((c) => c !== id);
      bookmarks.delete(id);
    },
  };
}

function installChrome({ items = [], syncState = {}, flags = {} } = {}) {
  const sync = {
    profiles: {
      default: {
        id: 'default',
        name: 'Default',
        owner: 'acme',
        repo: 'marks',
        branch: 'main',
        filePath: 'bookmarks',
        gitProvider: 'github',
        deleteGuardEnabled: true,
        deleteGuardMaxFraction: 0.15,
      },
    },
    activeProfileId: 'default',
    generateReadmeMd: 'off',
    generateBookmarksHtml: 'off',
    generateFeedXml: 'off',
    generateDashyYml: 'off',
    autoSync: false,
  };
  const local = {
    profileTokens: { default: 'ghp_testtoken' },
    syncState: { default: syncState },
    syncFlags: { default: flags },
    deviceId: 'testdevice-12345678',
  };
  const bookmarks = createBookmarkStore(items);
  const listeners = [];
  globalThis.chrome = {
    runtime: { getURL: (p) => p, lastError: null },
    storage: {
      onChanged: { addListener: (fn) => listeners.push(fn) },
      sync: {
        get: async (q) => resolveGet(sync, q),
        set: async (obj) => { Object.assign(sync, obj); },
        remove: async (k) => { for (const key of [].concat(k)) delete sync[key]; },
      },
      local: {
        get: async (q) => resolveGet(local, q),
        set: async (obj) => { Object.assign(local, obj); },
        remove: async (k) => { for (const key of [].concat(k)) delete local[key]; },
      },
    },
    bookmarks,
    action: {
      setBadgeText: async () => {},
      setBadgeBackgroundColor: async () => {},
    },
  };
  return { sync, local, bookmarks };
}

const github = fileFor('GitHub', 'https://github.com');
const example = fileFor('Example', 'https://example.com');
const extra = fileFor('Extra', 'https://extra.test');

let sync;
let saveSyncStateFromMaps;
let getSyncState;
let addPendingLocalDeletes;
let getPendingLocalDeletes;
let _acquireSyncLock;
let _releaseSyncLock;

before(async () => {
  installChrome();
  createGithubMock();
  const core = await import('../lib/sync-core.js');
  const pm = await import('../lib/profile-manager.js');
  sync = core.sync;
  saveSyncStateFromMaps = core.saveSyncStateFromMaps;
  _acquireSyncLock = core._acquireSyncLock;
  _releaseSyncLock = core._releaseSyncLock;
  getSyncState = pm.getSyncState;
  addPendingLocalDeletes = pm.addPendingLocalDeletes;
  getPendingLocalDeletes = pm.getPendingLocalDeletes;
});

beforeEach(() => {
  _releaseSyncLock();
});

afterEach(() => {
  _releaseSyncLock();
});

describe('sync() paths', () => {
  it('path 4a: first sync with local-only bookmarks pushes', async () => {
    installChrome({ items: [github] });
    const gh = createGithubMock();
    gh.replaceFiles(structureFiles());
    const result = await sync();
    assert.equal(result.success, true);
    assert.equal(result.message, 'sync_pushSuccess');
  });

  it('path 6: matching local/base/remote is in sync', async () => {
    const files = filesFromBookmarks([github]);
    installChrome({
      items: [github],
      syncState: { lastSyncFiles: toBaseFiles(files), lastCommitSha: 'commit-1' },
    });
    const gh = createGithubMock();
    gh.replaceFiles(files);
    const result = await sync();
    assert.equal(result.success, true);
    assert.equal(result.message, 'sync_allInSync');
  });

  it('path 7: local-only change pushes', async () => {
    const baseFiles = filesFromBookmarks([github]);
    installChrome({
      items: [github, example],
      syncState: { lastSyncFiles: toBaseFiles(baseFiles), lastCommitSha: 'commit-1' },
    });
    const gh = createGithubMock();
    gh.replaceFiles(baseFiles);
    const result = await sync();
    assert.equal(result.success, true);
    assert.equal(result.message, 'sync_pushSuccess');
    const blobGetsAfterCommit = gh.calls
      .slice(gh.calls.findIndex((c) => c.method === 'POST' && c.url.endsWith('/git/commits')))
      .filter((c) => c.method === 'GET' && c.url.includes('/git/blobs/')).length;
    assert.equal(blobGetsAfterCommit, 0);
  });

  it('path 8: remote-only addition is applied locally without pending deletes', async () => {
    const localFiles = filesFromBookmarks([github]);
    const remoteFiles = filesFromBookmarks([github, extra]);
    installChrome({
      items: [github],
      syncState: { lastSyncFiles: toBaseFiles(localFiles), lastCommitSha: 'commit-1' },
    });
    const gh = createGithubMock();
    gh.replaceFiles(remoteFiles);
    const result = await sync();
    assert.equal(result.success, true);
    assert.match(result.message, /sync_loadedFromRemote/);
    const tree = await chrome.bookmarks.getTree();
    const titles = (tree[0].children[0].children || []).map((n) => n.title);
    assert.ok(titles.includes('Extra'));
    assert.deepEqual(await getPendingLocalDeletes('default'), []);
  });

  it('C1: remote-added file is not deleted unless its filename is pending', async () => {
    const localFiles = filesFromBookmarks([github]);
    const remoteFiles = filesFromBookmarks([github, extra]);
    installChrome({
      items: [github],
      syncState: { lastSyncFiles: toBaseFiles(localFiles), lastCommitSha: 'commit-1' },
      flags: { pendingLocalDeletes: [] },
    });
    const gh = createGithubMock();
    gh.replaceFiles(remoteFiles);
    const result = await sync();
    assert.equal(result.success, true);
    assert.match(result.message, /sync_loadedFromRemote/);
    assert.equal(gh.calls.some((c) => c.method === 'POST' && c.url.endsWith('/git/commits')), false);
  });

  it('C1: pending local delete of the remote-added filename pushes a delete', async () => {
    const localFiles = filesFromBookmarks([github]);
    const remoteFiles = filesFromBookmarks([github, extra]);
    installChrome({
      items: [github],
      syncState: { lastSyncFiles: toBaseFiles(localFiles), lastCommitSha: 'commit-1' },
      flags: { pendingLocalDeletes: [extra.name] },
    });
    const gh = createGithubMock();
    gh.replaceFiles(remoteFiles);
    const result = await sync();
    assert.equal(result.success, true);
    assert.equal(result.message, 'sync_pushSuccess');
    assert.deepEqual(await getPendingLocalDeletes('default'), []);
  });

  it('path 9: non-overlapping local add and remote add merge', async () => {
    const baseFiles = filesFromBookmarks([github]);
    const remoteFiles = filesFromBookmarks([github, extra]);
    installChrome({
      items: [github, example],
      syncState: { lastSyncFiles: toBaseFiles(baseFiles), lastCommitSha: 'commit-1' },
    });
    const gh = createGithubMock();
    gh.replaceFiles(remoteFiles);
    const result = await sync();
    assert.equal(result.success, true);
    const tree = await chrome.bookmarks.getTree();
    const titles = (tree[0].children[0].children || []).map((n) => n.title);
    assert.ok(titles.includes('Example'));
    assert.ok(titles.includes('Extra'));
  });

  it('C2: empty remote is blocked when the base still has bookmarks', async () => {
    const baseFiles = filesFromBookmarks([github, example]);
    installChrome({
      items: [github, example],
      syncState: { lastSyncFiles: toBaseFiles(baseFiles), lastCommitSha: 'commit-1' },
    });
    const gh = createGithubMock();
    gh.replaceFiles(structureFiles());
    const result = await sync();
    assert.equal(result.success, false);
    assert.equal(result.conflict, true);
    assert.equal(result.message, 'sync_remoteBulkDeleteBlocked');
    const state = await getSyncState('default');
    assert.equal(state.conflictReason, 'remoteBulkDelete');
  });

  it('C2: 80% remote shrink is blocked', async () => {
    const many = Array.from({ length: 20 }, (_, i) => fileFor(`Site${i}`, `https://site${i}.example`));
    const kept = many.slice(0, 4);
    const baseFiles = filesFromBookmarks(many);
    installChrome({
      items: many,
      syncState: { lastSyncFiles: toBaseFiles(baseFiles), lastCommitSha: 'commit-1' },
    });
    const gh = createGithubMock();
    gh.replaceFiles(filesFromBookmarks(kept));
    const result = await sync();
    assert.equal(result.success, false);
    assert.equal(result.conflict, true);
    assert.equal(result.message, 'sync_remoteBulkDeleteBlocked');
  });

  it('C2: small remote deletion is applied', async () => {
    const many = Array.from({ length: 12 }, (_, i) => fileFor(`Page${i}`, `https://page${i}.example`));
    const kept = many.slice(0, 11);
    const baseFiles = filesFromBookmarks(many);
    installChrome({
      items: many,
      syncState: { lastSyncFiles: toBaseFiles(baseFiles), lastCommitSha: 'commit-1' },
    });
    const gh = createGithubMock();
    gh.replaceFiles(filesFromBookmarks(kept));
    const result = await sync();
    assert.equal(result.success, true);
    assert.match(result.message, /sync_loadedFromRemote/);
  });

  it('remote === null with an existing base returns branch-not-found', async () => {
    const files = filesFromBookmarks([github]);
    installChrome({
      items: [github],
      syncState: { lastSyncFiles: toBaseFiles(files), lastCommitSha: 'commit-1' },
    });
    const gh = createGithubMock();
    gh.replaceFiles(files);
    gh.missingBranch();
    const result = await sync();
    assert.equal(result.success, false);
    assert.equal(result.message, 'sync_branchNotFound');
  });

  it('alreadyInProgress returns without running a second sync', async () => {
    installChrome({ items: [github] });
    createGithubMock().replaceFiles(structureFiles());
    assert.equal(_acquireSyncLock(), true);
    try {
      const result = await sync();
      assert.equal(result.alreadyInProgress, true);
      assert.equal(result.success, false);
      assert.equal(result.message, 'sync_alreadyInProgress');
    } finally {
      _releaseSyncLock();
    }
  });

  it('quota fallback stores lastSyncFiles as null', async () => {
    installChrome();
    const origSet = chrome.storage.local.set;
    chrome.storage.local.set = async (obj) => {
      const state = obj.syncState;
      if (state) {
        for (const entry of Object.values(state)) {
          if (entry?.lastSyncFiles && typeof entry.lastSyncFiles === 'object') {
            throw new Error('QUOTA_BYTES quota exceeded');
          }
        }
      }
      return origSet(obj);
    };
    await saveSyncStateFromMaps(
      'default',
      { 'bookmarks/toolbar/a.json': '{}' },
      { 'bookmarks/toolbar/a.json': 's' },
      'abc123'
    );
    const state = await getSyncState('default');
    assert.equal(state.lastSyncFiles, null);
    assert.equal(state.lastCommitSha, 'abc123');
  });
});
