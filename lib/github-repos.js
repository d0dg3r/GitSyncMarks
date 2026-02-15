/**
 * GitHub Repos – User repos as bookmarks folder
 *
 * Fetches the authenticated user's repos from GitHub API and maintains
 * a "GitHubRepos (username)" folder with bookmarks to each repo.
 */

import { detectRootFolderRole } from './bookmark-serializer.js';

const API_BASE = 'https://api.github.com';
const REPOS_PER_PAGE = 100;

/**
 * Fetch the current authenticated user.
 * @param {string} token - GitHub Personal Access Token
 * @returns {Promise<{login: string}>}
 */
export async function fetchCurrentUser(token) {
  const res = await fetch(`${API_BASE}/user`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }
  const data = await res.json();
  return { login: data.login || '' };
}

/**
 * Fetch all user repos (public and private).
 * @param {string} token - GitHub Personal Access Token
 * @returns {Promise<Array<{full_name: string, html_url: string, private: boolean}>>}
 */
export async function fetchUserRepos(token) {
  const all = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(
      `${API_BASE}/user/repos?per_page=${REPOS_PER_PAGE}&type=all&page=${page}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API error: ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      hasMore = false;
    } else {
      for (const r of data) {
        all.push({
          full_name: r.full_name || '',
          html_url: r.html_url || `https://github.com/${r.full_name}`,
          private: !!r.private,
        });
      }
      hasMore = data.length === REPOS_PER_PAGE;
      page++;
    }
  }

  return all;
}

/**
 * Find the root folder ID for a given role (toolbar, other, menu).
 * @param {string} parentRole
 * @returns {Promise<string|null>} Folder ID or null
 */
async function getRootFolderIdForRole(parentRole) {
  const tree = await chrome.bookmarks.getTree();
  const rootChildren = tree[0]?.children || [];
  for (const folder of rootChildren) {
    const role = detectRootFolderRole(folder);
    if (role === parentRole) return folder.id;
  }
  return null;
}

/**
 * Find or create the GitHubRepos subfolder under the given parent.
 * @param {string} parentId - Parent folder ID
 * @param {string} folderTitle - e.g. "GitHubRepos (d0dg3r)"
 * @returns {Promise<string>} Folder ID
 */
async function findOrCreateGitHubReposFolder(parentId, folderTitle) {
  const children = await chrome.bookmarks.getChildren(parentId);
  const existing = children.find((c) => !c.url && c.title === folderTitle);
  if (existing) return existing.id;

  const folder = await chrome.bookmarks.create({
    parentId,
    title: folderTitle,
  });
  return folder.id;
}

/**
 * Build the target bookmark list: full_name → { url, title }.
 * Title format: "owner/repo (private)" or "owner/repo"
 * @param {Array<{full_name: string, html_url: string, private: boolean}>} repos
 * @returns {Map<string, {url: string, title: string}>}
 */
function buildTargetMap(repos) {
  const map = new Map();
  for (const r of repos) {
    if (!r.full_name) continue;
    const title = r.private ? `${r.full_name} (private)` : r.full_name;
    map.set(r.full_name, { url: r.html_url, title });
  }
  return map;
}

/**
 * Update the GitHubRepos folder with the current user repos.
 * @param {string} token - GitHub Personal Access Token
 * @param {string} parentRole - 'toolbar' | 'other' | 'menu'
 * @param {string} [username] - Optional; if empty, fetched from API
 * @param {Function} [onUsername] - Callback with username when first determined (to persist)
 * @returns {Promise<{count: number, username: string}>}
 */
export async function updateGitHubReposFolder(token, parentRole, username = '', onUsername = null) {
  let login = username;
  if (!login) {
    const user = await fetchCurrentUser(token);
    login = user.login || '';
    if (login && onUsername) onUsername(login);
  }

  const folderTitle = login ? `GitHubRepos (${login})` : 'GitHubRepos';
  let parentId = await getRootFolderIdForRole(parentRole);
  // Chrome has no "menu" root; use Other Bookmarks and the "Bookmarks Menu" subfolder
  if (!parentId && parentRole === 'menu') {
    const otherId = await getRootFolderIdForRole('other');
    if (otherId) {
      const children = await chrome.bookmarks.getChildren(otherId);
      const menuFolder = children.find((c) => !c.url && /menu|menü|bookmarks menu/i.test(c.title || ''));
      parentId = menuFolder ? menuFolder.id : otherId;
    }
  }
  if (!parentId) {
    throw new Error(`Root folder not found for role: ${parentRole}`);
  }

  const folderId = await findOrCreateGitHubReposFolder(parentId, folderTitle);
  const repos = await fetchUserRepos(token);
  const targetMap = buildTargetMap(repos);

  const existing = await chrome.bookmarks.getChildren(folderId);
  const byUrl = new Map();
  for (const b of existing) {
    if (b.url) byUrl.set(b.url, b);
  }

  // Map target repos to existing by matching url
  const toAdd = [];
  const toRemove = [];

  for (const [fullName, { url, title }] of targetMap) {
    const existingNode = byUrl.get(url);
    if (!existingNode) {
      toAdd.push({ url, title });
    } else if (existingNode.title !== title) {
      toRemove.push(existingNode);
      toAdd.push({ url, title });
    }
    // else: already correct, keep
  }

  // Remove bookmarks not in target
  const targetUrls = new Set([...targetMap.values()].map((v) => v.url));
  for (const b of existing) {
    if (b.url && !targetUrls.has(b.url)) {
      toRemove.push(b);
    }
  }

  for (const node of toRemove) {
    await chrome.bookmarks.remove(node.id);
  }
  for (const { url, title } of toAdd) {
    await chrome.bookmarks.create({ parentId: folderId, title, url });
  }

  return { count: targetMap.size, username: login };
}
