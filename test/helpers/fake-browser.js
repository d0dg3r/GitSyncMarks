/**
 * In-memory stand-in for the browser APIs the sync code uses (storage, bookmarks).
 * Each call to createFakeBrowser() is an independent browser profile, so two of them can
 * sync against the same fake repository.
 */

const clone = (value) => (value === undefined ? undefined : structuredClone(value));

function createArea(data) {
  return {
    async get(defaults) {
      if (defaults === null || defaults === undefined) return clone(data);
      if (typeof defaults === 'string') return { [defaults]: clone(data[defaults]) };
      if (Array.isArray(defaults)) {
        return Object.fromEntries(defaults.map((key) => [key, clone(data[key])]));
      }
      const out = {};
      for (const [key, fallback] of Object.entries(defaults)) {
        out[key] = data[key] === undefined ? clone(fallback) : clone(data[key]);
      }
      return out;
    },
    async set(values) {
      for (const [key, value] of Object.entries(values)) data[key] = clone(value);
    },
    async remove(keys) {
      for (const key of [].concat(keys)) delete data[key];
    },
    async getBytesInUse() {
      return JSON.stringify(data).length;
    },
    QUOTA_BYTES: 10485760,
  };
}

/** Bookmark tree with the two sync roots (toolbar id "1", other "2"), as Chrome creates them. */
function createBookmarks(moveSemantics) {
  const nodes = new Map([
    ['0', { id: '0', title: '', children: [] }],
    ['1', { id: '1', parentId: '0', title: 'Bookmarks bar', children: [] }],
    ['2', { id: '2', parentId: '0', title: 'Other bookmarks', children: [] }],
  ]);
  nodes.get('0').children = [nodes.get('1'), nodes.get('2')];
  let nextId = 100;
  /** Number of calls per mutating API, so tests can assert "nothing was recreated". */
  const calls = { create: 0, removeTree: 0, update: 0, move: 0 };
  /** URL prefixes this fake browser refuses (like Chrome refusing Firefox-only schemes). */
  const rejectedUrlPrefixes = [];

  const toTree = (node) => {
    const out = { id: node.id, parentId: node.parentId, title: node.title };
    if (node.url) out.url = node.url;
    else out.children = node.children.map(toTree);
    return out;
  };

  return {
    async getTree() {
      return [toTree(nodes.get('0'))];
    },
    async create({ parentId, index, title, url }) {
      calls.create += 1;
      const parent = nodes.get(parentId);
      if (!parent) throw new Error(`No parent folder ${parentId}`);
      if (url && rejectedUrlPrefixes.some((prefix) => url.startsWith(prefix))) throw new Error(`Invalid URL ${url}`);
      const node = { id: String(nextId++), parentId, title: title || '', ...(url ? { url } : { children: [] }) };
      nodes.set(node.id, node);
      const at = index === undefined ? parent.children.length : Math.min(index, parent.children.length);
      parent.children.splice(at, 0, node);
      return toTree(node);
    },
    async update(id, { title, url }) {
      calls.update += 1;
      const node = nodes.get(id);
      if (!node) throw new Error(`No node ${id}`);
      if (title !== undefined) node.title = title;
      if (url !== undefined) node.url = url;
      return toTree(node);
    },
    /**
     * Chrome: inside the same folder the index counts positions before removal.
     * Firefox: the index is the final position. Both agree for upward moves.
     */
    async move(id, { parentId, index }) {
      calls.move += 1;
      const node = nodes.get(id);
      const from = nodes.get(node.parentId);
      const to = nodes.get(parentId);
      const oldIndex = from.children.indexOf(node);
      from.children.splice(oldIndex, 1);
      let at = index === undefined ? to.children.length : index;
      if (moveSemantics === 'chrome' && from === to && index !== undefined && index > oldIndex) at -= 1;
      to.children.splice(Math.min(at, to.children.length), 0, node);
      node.parentId = parentId;
      return toTree(node);
    },
    async removeTree(id) {
      calls.removeTree += 1;
      const node = nodes.get(id);
      if (!node) throw new Error(`No node ${id}`);
      const parent = nodes.get(node.parentId);
      parent.children = parent.children.filter((child) => child !== node);
      const drop = (current) => {
        nodes.delete(current.id);
        for (const child of current.children || []) drop(child);
      };
      drop(node);
    },
    /** Test helper: rename a bookmark by URL, as the user would in the browser. */
    renameByUrl(url, title) {
      for (const node of nodes.values()) {
        if (node.url === url) node.title = title;
      }
    },
    /** Test helper: list bookmark titles and URLs of the toolbar. */
    toolbarBookmarks() {
      return nodes.get('1').children.filter((c) => c.url).map((c) => ({ title: c.title, url: c.url }));
    },
    /** Test helper: the toolbar as plain data, including IDs (folders with their children). */
    toolbarSnapshot() {
      const snap = (node) => (node.url
        ? { id: node.id, title: node.title, url: node.url }
        : { id: node.id, title: node.title, children: node.children.map(snap) });
      return nodes.get('1').children.map(snap);
    },
    calls,
    rejectedUrlPrefixes,
  };
}

/** @param {{ moveSemantics?: 'chrome' | 'firefox' }} [options] */
export function createFakeBrowser({ moveSemantics = 'chrome' } = {}) {
  const local = {};
  const sync = {};
  const bookmarks = createBookmarks(moveSemantics);
  const chrome = {
    storage: {
      local: createArea(local),
      sync: createArea(sync),
      onChanged: { addListener() {} },
    },
    bookmarks: {
      getTree: bookmarks.getTree,
      create: bookmarks.create,
      update: bookmarks.update,
      move: bookmarks.move,
      removeTree: bookmarks.removeTree,
    },
    runtime: {
      getManifest: () => ({ version: '0.0.0-test' }),
      id: 'fake-extension',
    },
  };
  return { chrome, bookmarks, local, sync };
}
