/**
 * Host-agnostic Git API helpers for E2E (GitHub + Forgejo/Gitea-family).
 */

const { isSafeE2eRepoName } = require('./e2e-repo-names.js');

const STABLE_FIXTURE_REPO = 'GitSyncMarks-test-sync';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientDeleteStatus(status) {
  return status === 429 || status >= 500;
}

/**
 * @typedef {{
 *   id: 'github' | 'forgejo',
 *   provider: string,
 *   token: string,
 *   owner: string,
 *   repo: string,
 *   serverUrl: string,
 * }} HostConfig
 */

/**
 * @returns {HostConfig | null}
 */
function getGithubHostConfig() {
  const token = process.env.GITSYNCMARKS_GITHUB_PAT || process.env.GITHUB_ADMIN_TOKEN || '';
  if (!token) return null;
  return {
    id: 'github',
    provider: 'github',
    token,
    owner: process.env.GITSYNCMARKS_GITHUB_OWNER || '',
    repo: process.env.GITSYNCMARKS_GITHUB_REPO || STABLE_FIXTURE_REPO,
    serverUrl: '',
  };
}

/**
 * @returns {HostConfig | null}
 */
function getForgejoHostConfig() {
  const token = process.env.GITSYNCMARKS_FORGEJO_TOKEN || '';
  const owner = process.env.GITSYNCMARKS_FORGEJO_OWNER || '';
  const serverUrl = (process.env.GITSYNCMARKS_FORGEJO_SERVER_URL || '').replace(/\/+$/, '');
  if (!token || !owner || !serverUrl) return null;
  return {
    id: 'forgejo',
    provider: 'forgejo',
    token,
    owner,
    repo: process.env.GITSYNCMARKS_FORGEJO_REPO || STABLE_FIXTURE_REPO,
    serverUrl,
  };
}

/**
 * Hosts ready for onboarding E2E (token + owner required).
 * @returns {HostConfig[]}
 */
function getConfiguredHosts() {
  const hosts = [];
  const github = getGithubHostConfig();
  if (github?.token && github?.owner) hosts.push(github);
  const forgejo = getForgejoHostConfig();
  if (forgejo) hosts.push(forgejo);
  return hosts;
}

/**
 * @param {'github' | 'forgejo'} id
 * @returns {HostConfig | null}
 */
function getHostConfig(id) {
  if (id === 'forgejo') return getForgejoHostConfig();
  return getGithubHostConfig();
}

/**
 * @param {HostConfig} host
 * @param {string} path - path after /repos/{owner}/{repo} or absolute API path starting with /
 * @param {RequestInit} [options]
 * @param {{ owner?: string, repo?: string }} [target]
 */
async function hostFetch(host, path, options = {}, target = {}) {
  const owner = target.owner || host.owner;
  const repo = target.repo || host.repo;
  let url;
  const headers = { ...options.headers };

  let apiPath;
  if (path.startsWith('/user')) {
    apiPath = path;
  } else if (!path || path === '/') {
    apiPath = `/repos/${owner}/${repo}`;
  } else {
    apiPath = `/repos/${owner}/${repo}${path.startsWith('/') ? path : `/${path}`}`;
  }

  if (host.id === 'github') {
    url = `https://api.github.com${apiPath}`;
    Object.assign(headers, {
      Authorization: `Bearer ${host.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    });
  } else {
    url = `${host.serverUrl}/api/v1${apiPath}`;
    Object.assign(headers, {
      Authorization: `token ${host.token}`,
      Accept: 'application/json',
    });
  }

  const res = await fetch(url, { ...options, headers });
  return res;
}

/**
 * @param {HostConfig} host
 * @param {string} path
 * @param {RequestInit} [options]
 * @param {{ owner?: string, repo?: string }} [target]
 */
async function hostFetchJson(host, path, options = {}, target = {}) {
  const res = await hostFetch(host, path, options, target);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${host.id} API ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Create the stable private fixture repo (idempotent if it already exists).
 * @param {HostConfig} host
 * @param {string} [name]
 */
async function createFixtureRepo(host, name = STABLE_FIXTURE_REPO) {
  const body = {
    name,
    private: true,
    description: 'Private test repo for GitSyncMarks E2E tests',
    auto_init: true,
  };

  const res = await hostFetch(host, '/user/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    const repo = await res.json();
    return { created: true, fullName: repo.full_name || `${host.owner}/${name}` };
  }

  const err = await res.json().catch(() => ({ message: res.statusText }));
  const msg = String(err.message || JSON.stringify(err));
  if (res.status === 409 || res.status === 422 || /already exists|already been taken/i.test(msg)) {
    return { created: false, fullName: `${host.owner}/${name}`, alreadyExists: true };
  }
  throw new Error(`Failed to create ${host.id} repo: ${res.status} ${msg}`);
}

/**
 * Create an ephemeral private repo with no initial commit (auto_init: false).
 * Name must match the E2E safe-delete prefix (`gitsyncmarks-e2e-*`).
 * @param {HostConfig} host
 * @param {string} name
 * @returns {Promise<{ created: true, fullName: string, owner: string, repo: string }>}
 */
async function createEmptyRepo(host, name) {
  if (!isSafeE2eRepoName(name)) {
    throw new Error(`Refusing to create non-ephemeral E2E repo name: ${name}`);
  }
  if (!host?.token || !host?.owner) {
    throw new Error(`Missing token/owner for empty ${host?.id || 'host'} repo create`);
  }

  const body = {
    name,
    private: true,
    description: 'Ephemeral empty GitSyncMarks E2E repo (no auto_init)',
    auto_init: false,
  };

  const res = await hostFetch(host, '/user/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg = String(err.message || JSON.stringify(err));
    throw new Error(`Failed to create empty ${host.id} repo: ${res.status} ${msg}`);
  }

  const repo = await res.json();
  return {
    created: true,
    fullName: repo.full_name || `${host.owner}/${name}`,
    owner: host.owner,
    repo: name,
  };
}

/**
 * @param {HostConfig} host
 * @param {{ owner?: string, repo: string }} target
 */
async function deleteE2eRepoIfSafe(host, target) {
  const owner = target.owner || host.owner;
  const repo = target.repo;
  if (!host.token || !owner || !isSafeE2eRepoName(repo)) {
    return { skipped: true };
  }

  let lastStatus = null;
  let lastMessage = '';

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await hostFetch(host, '', { method: 'DELETE' }, { owner, repo });
    lastStatus = response.status;

    if (response.status === 404 || response.status === 204) {
      return { success: true, status: response.status, attempts: attempt, host: host.id };
    }

    lastMessage = await response.text();
    if (!isTransientDeleteStatus(response.status) || attempt === 3) {
      return {
        success: false,
        status: response.status,
        attempts: attempt,
        message: lastMessage || `Unexpected delete response ${response.status}`,
        host: host.id,
      };
    }

    await sleep(300 * attempt);
  }

  return {
    success: false,
    status: lastStatus,
    attempts: 3,
    message: lastMessage || 'Delete retry budget exhausted',
    host: host.id,
  };
}

/**
 * @param {HostConfig} host
 * @returns {Promise<string|null>}
 */
async function resolveHostOwner(host) {
  if (host.owner) return host.owner;
  if (!host.token) return null;
  try {
    if (host.id === 'github') {
      const res = await hostFetch(host, '/user');
      if (!res.ok) return null;
      const user = await res.json();
      return user.login || null;
    }
    const res = await hostFetch(host, '/user');
    if (!res.ok) return null;
    const user = await res.json();
    return user.login || user.username || null;
  } catch {
    return null;
  }
}

/**
 * @param {HostConfig} host
 * @returns {Promise<Array<{ name: string, owner?: string }>>}
 */
async function listOrphanedE2eRepos(host) {
  if (!host.token) return [];

  const repos = [];
  let page = 1;
  const perPage = 50;

  while (true) {
    let response;
    if (host.id === 'github') {
      response = await hostFetch(
        host,
        `/user/repos?per_page=${perPage}&page=${page}&sort=created&direction=desc`
      );
    } else {
      response = await hostFetch(
        host,
        `/user/repos?limit=${perPage}&page=${page}`
      );
    }

    if (!response.ok) break;

    const pageRepos = await response.json();
    const list = Array.isArray(pageRepos) ? pageRepos : [];
    for (const r of list) {
      if (!isSafeE2eRepoName(r.name)) continue;
      const ownerLogin = r.owner?.login || r.owner?.username || host.owner || '';
      repos.push({ name: r.name, owner: ownerLogin });
    }

    if (list.length < perPage) break;
    page += 1;
    if (page > 20) break;
  }

  return repos;
}

/**
 * @param {HostConfig} [host]
 * @returns {Promise<{ deleted: number, failed: number, results: Array<{ host: string, repo: string, result: object }> }>}
 */
async function cleanupOrphanedE2eReposForHost(host) {
  if (!host?.token) {
    return { deleted: 0, failed: 0, results: [] };
  }

  const owner = await resolveHostOwner(host);
  if (owner) host.owner = owner;

  const repos = await listOrphanedE2eRepos(host);
  const results = [];
  let deleted = 0;
  let failed = 0;

  for (const r of repos) {
    const result = await deleteE2eRepoIfSafe(host, {
      owner: r.owner || host.owner,
      repo: r.name,
    });
    results.push({ host: host.id, repo: r.name, result });
    if (result.success) deleted += 1;
    else if (!result.skipped) failed += 1;
  }

  return { deleted, failed, results };
}

/**
 * Clean ephemeral E2E repos on every host that has a token (owner optional; resolved via API).
 */
async function cleanupAllOrphanedE2eRepos() {
  const hosts = [getGithubHostConfig(), getForgejoHostConfig()].filter((h) => h?.token);
  let deleted = 0;
  let failed = 0;
  const results = [];

  for (const host of hosts) {
    const part = await cleanupOrphanedE2eReposForHost(host);
    deleted += part.deleted;
    failed += part.failed;
    results.push(...part.results);
  }

  return { deleted, failed, results, hosts: hosts.map((h) => h.id) };
}

/**
 * @param {HostConfig} host
 * @param {string} filePath
 * @param {{ owner?: string, repo?: string }} [target]
 */
async function getFileContent(host, filePath, target = {}) {
  const path = `/contents/${filePath.replace(/^\/+/, '')}`;
  const data = await hostFetchJson(host, path, {}, target);
  if (data?.content) {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }
  return null;
}

/**
 * @param {HostConfig} host
 * @param {string} dirPath
 * @param {{ owner?: string, repo?: string }} [target]
 */
async function listDir(host, dirPath, target = {}) {
  const path = `/contents/${dirPath.replace(/^\/+/, '')}`;
  try {
    const data = await hostFetchJson(host, path, {}, target);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * @param {HostConfig} host
 * @param {string} basePath
 * @param {string} folder
 * @param {{ owner?: string, repo?: string }} [target]
 */
async function countBookmarkFilesInFolder(host, basePath, folder, target = {}) {
  const entries = await listDir(host, `${basePath}/${folder}`, target);
  return entries.filter((e) => e.name.endsWith('.json') && !e.name.startsWith('_')).length;
}

/**
 * GitHub Contents API uses PUT; Gitea/Forgejo use POST for create/update.
 * @param {HostConfig} host
 * @param {string} [basePath]
 * @param {{ owner?: string, repo?: string }} [target]
 */
async function ensureMinimalStructure(host, basePath = 'bookmarks', target = {}) {
  const files = [
    { path: `${basePath}/_index.json`, content: JSON.stringify({ version: 2 }, null, 2) },
    { path: `${basePath}/toolbar/_order.json`, content: JSON.stringify([], null, 2) },
    { path: `${basePath}/other/_order.json`, content: JSON.stringify([], null, 2) },
  ];

  for (const file of files) {
    let sha = null;
    try {
      const existing = await hostFetchJson(host, `/contents/${file.path}`, {}, target);
      sha = existing?.sha || null;
    } catch {
      // missing
    }
    const body = {
      message: `E2E: ensure ${file.path}`,
      content: Buffer.from(file.content).toString('base64'),
    };
    if (sha) body.sha = sha;
    // GitHub Contents API: always PUT. Gitea/Forgejo: POST create, PUT update.
    const method = host.id === 'github' || sha ? 'PUT' : 'POST';
    const res = await hostFetch(
      host,
      `/contents/${file.path}`,
      {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      target
    );
    if (!res.ok) {
      throw new Error(`${host.id} ensure structure failed ${res.status}: ${await res.text()}`);
    }
  }
}

module.exports = {
  STABLE_FIXTURE_REPO,
  getGithubHostConfig,
  getForgejoHostConfig,
  getConfiguredHosts,
  getHostConfig,
  hostFetch,
  hostFetchJson,
  createFixtureRepo,
  createEmptyRepo,
  deleteE2eRepoIfSafe,
  listOrphanedE2eRepos,
  cleanupOrphanedE2eReposForHost,
  cleanupAllOrphanedE2eRepos,
  resolveHostOwner,
  getFileContent,
  listDir,
  countBookmarkFilesInFolder,
  ensureMinimalStructure,
};
