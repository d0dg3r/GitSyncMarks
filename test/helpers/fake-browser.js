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
function createBookmarks() {
  const nodes = new Map([
    ['0', { id: '0', title: '', children: [] }],
    ['1', { id: '1', parentId: '0', title: 'Bookmarks bar', children: [] }],
    ['2', { id: '2', parentId: '0', title: 'Other bookmarks', children: [] }],
  ]);
  nodes.get('0').children = [nodes.get('1'), nodes.get('2')];
  let nextId = 100;

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
    async create({ parentId, title, url }) {
      const parent = nodes.get(parentId);
      if (!parent) throw new Error(`No parent folder ${parentId}`);
      const node = { id: String(nextId++), parentId, title: title || '', ...(url ? { url } : { children: [] }) };
      nodes.set(node.id, node);
      parent.children.push(node);
      return toTree(node);
    },
    async removeTree(id) {
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
  };
}

export function createFakeBrowser() {
  const local = {};
  const sync = {};
  const bookmarks = createBookmarks();
  const chrome = {
    storage: {
      local: createArea(local),
      sync: createArea(sync),
      onChanged: { addListener() {} },
    },
    bookmarks: {
      getTree: bookmarks.getTree,
      create: bookmarks.create,
      removeTree: bookmarks.removeTree,
    },
    runtime: {
      getManifest: () => ({ version: '0.0.0-test' }),
      id: 'fake-extension',
    },
  };
  return { chrome, bookmarks, local, sync };
}
