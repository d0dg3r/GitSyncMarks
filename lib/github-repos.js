/**
 * GitHub Repos – User repos as bookmarks folder
 *
 * Fetches the authenticated user's repos from GitHub API and maintains
 * a "GitHubRepos (username)" folder with bookmarks to each repo.
 */

import { getRootFolderIdForRole, findOrCreateFolder } from './bookmark-helpers.js';
import { GitHubAPI } from './github-api.js';

const REPOS_PER_PAGE = 100;

/**
 * Build a GitHubAPI client for user-scoped (owner/repo-independent) endpoints.
 * Routing through GitHubAPI gives us shared error handling and rate-limit backoff.
 * @param {string} token - GitHub Personal Access Token
 * @returns {GitHubAPI}
 */
function userApi(token) {
  return new GitHubAPI(token, '', '');
}

/**
 * Fetch the current authenticated user.
 * @param {string} token - GitHub Personal Access Token
 * @returns {Promise<{login: string}>}
 */
export async function fetchCurrentUser(token) {
  return userApi(token).getAuthenticatedUser();
}

/**
 * Fetch all user repos (public and private).
 * @param {string} token - GitHub Personal Access Token
 * @returns {Promise<Array<{full_name: string, html_url: string, private: boolean}>>}
 */
export async function fetchUserRepos(token) {
  return userApi(token).listUserRepos({ perPage: REPOS_PER_PAGE });
}

export { getRootFolderIdForRole } from './bookmark-helpers.js';

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
 * @param {string} parentRole - 'toolbar' | 'other'
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
  // Legacy: "menu" was removed; on Firefox "other" = Bookmarks Menu
  const effectiveRole = parentRole === 'menu' ? 'other' : parentRole;
  const parentId = await getRootFolderIdForRole(effectiveRole);
  if (!parentId) {
    throw new Error(`Root folder not found for role: ${parentRole}`);
  }

  const folderId = await findOrCreateFolder(parentId, folderTitle);
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
