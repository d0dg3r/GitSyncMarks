/**
 * Minimal GitHub API helpers for E2E tests.
 * Used to add bookmarks to the test repo (for Pull test) and verify Push results.
 */

async function githubFetch(path, options = {}, target = {}) {
  const token = process.env.GITSYNCMARKS_TEST_PAT;
  const owner = target.owner || process.env.GITSYNCMARKS_TEST_REPO_OWNER;
  const repo = target.repo || process.env.GITSYNCMARKS_TEST_REPO;
  if (!token || !owner || !repo) {
    throw new Error('Missing GITSYNCMARKS_TEST_* env vars');
  }
  const url = `https://api.github.com/repos/${owner}/${repo}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

async function getFileContent(path, target = {}) {
  const data = await githubFetch(`/contents/${path}`, {}, target);
  if (data.content) {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }
  return null;
}

async function createOrUpdateFile(path, content, message, sha = null, target = {}) {
  const body = {
    message,
    content: Buffer.from(content).toString('base64'),
  };
  if (sha) body.sha = sha;
  return githubFetch(`/contents/${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, target);
}

async function listDir(path, target = {}) {
  const data = await githubFetch(`/contents/${path}`, {}, target);
  return Array.isArray(data) ? data : [];
}

async function tryListDir(path, target = {}) {
  try {
    return await listDir(path, target);
  } catch {
    return [];
  }
}

/**
 * Add a bookmark file to the test repo (for Pull test).
 * Updates _order.json to include the new file.
 */
async function addBookmarkToRepo(title, url, folder = 'toolbar') {
  const base = 'bookmarks';
  const slug = (title || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40) || 'untitled';
  const hash = Array.from(url || '')
    .reduce((h, c) => ((h ^ c.charCodeAt(0)) * 0x01000193) >>> 0, 0x811c9dc5)
    .toString(36)
    .padStart(4, '0')
    .substring(0, 4);
  const filename = `${slug}_${hash}.json`;

  const dir = `${base}/${folder}`;
  const filePath = `${dir}/${filename}`;
  const content = JSON.stringify({ title, url }, null, 2);

  // Get current _order.json
  let order = [];
  let orderSha = null;
  try {
    const orderData = await githubFetch(`/contents/${dir}/_order.json`);
    order = JSON.parse(Buffer.from(orderData.content, 'base64').toString('utf-8'));
    orderSha = orderData.sha;
  } catch {
    // _order.json might not exist
  }

  if (!order.includes(filename)) {
    order.push(filename);
  }
  const orderContent = JSON.stringify(order, null, 2);

  await createOrUpdateFile(filePath, content, `E2E: add bookmark ${title}`);
  await createOrUpdateFile(
    `${dir}/_order.json`,
    orderContent,
    `E2E: update order`,
    orderSha
  );

  return filePath;
}

/**
 * Check if the repo has any bookmark JSON files (excluding _index.json, _order.json).
 */
async function hasBookmarkFiles() {
  const entries = await listDir('bookmarks/toolbar');
  return entries.some(
    (e) => e.name.endsWith('.json') && !e.name.startsWith('_')
  );
}

/**
 * Update an existing bookmark file in the repo (for conflict test).
 * @param {string} filePath - e.g. 'bookmarks/toolbar/example-domain_xxxx.json'
 * @param {{ title: string, url: string }} content
 */
async function updateBookmarkInRepo(filePath, { title, url }) {
  const fileData = await githubFetch(`/contents/${filePath}`);
  const newContent = JSON.stringify({ title, url }, null, 2);
  await createOrUpdateFile(filePath, newContent, `E2E: update bookmark`, fileData.sha);
}

/**
 * Get the first bookmark filename in toolbar (for conflict test).
 */
async function getFirstBookmarkFileInToolbar() {
  const entries = await listDir('bookmarks/toolbar');
  const bookmark = entries.find(
    (e) => e.name.endsWith('.json') && !e.name.startsWith('_')
  );
  return bookmark ? `bookmarks/toolbar/${bookmark.name}` : null;
}

/**
 * Count bookmark JSON files in toolbar (excluding _order.json).
 */
async function countBookmarkFilesInToolbar(target = {}) {
  return countBookmarkFilesInFolder('bookmarks', 'toolbar', target);
}

async function countBookmarkFilesInFolder(basePath, folder, target = {}) {
  const entries = await tryListDir(`${basePath}/${folder}`, target);
  return entries.filter((e) => e.name.endsWith('.json') && !e.name.startsWith('_')).length;
}

async function ensureMinimalStructure(basePath = 'bookmarks', target = {}) {
  const indexPath = `${basePath}/_index.json`;
  const toolbarOrderPath = `${basePath}/toolbar/_order.json`;
  const otherOrderPath = `${basePath}/other/_order.json`;

  let indexSha = null;
  let toolbarSha = null;
  let otherSha = null;
  try { indexSha = (await githubFetch(`/contents/${indexPath}`, {}, target)).sha || null; } catch {}
  try { toolbarSha = (await githubFetch(`/contents/${toolbarOrderPath}`, {}, target)).sha || null; } catch {}
  try { otherSha = (await githubFetch(`/contents/${otherOrderPath}`, {}, target)).sha || null; } catch {}

  await createOrUpdateFile(indexPath, JSON.stringify({ version: 2 }, null, 2), `E2E: ensure index at ${basePath}`, indexSha, target);
  await createOrUpdateFile(toolbarOrderPath, JSON.stringify([], null, 2), `E2E: ensure toolbar order at ${basePath}`, toolbarSha, target);
  await createOrUpdateFile(otherOrderPath, JSON.stringify([], null, 2), `E2E: ensure other order at ${basePath}`, otherSha, target);
}

/**
 * Check if the repo has the minimal structure (push completed successfully).
 */
async function hasMinimalStructure() {
  try {
    const index = await getFileContent('bookmarks/_index.json');
    const order = await getFileContent('bookmarks/toolbar/_order.json');
    return !!(index && order);
  } catch {
    return false;
  }
}

module.exports = {
  githubFetch,
  getFileContent,
  listDir,
  addBookmarkToRepo,
  updateBookmarkInRepo,
  getFirstBookmarkFileInToolbar,
  hasBookmarkFiles,
  hasMinimalStructure,
  countBookmarkFilesInToolbar,
  countBookmarkFilesInFolder,
  ensureMinimalStructure,
};
