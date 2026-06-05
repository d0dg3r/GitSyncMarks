/**
 * GitHub / Gitea Repos – User repos as bookmarks folder
 *
 * Fetches the authenticated user's repos from the Git provider API and maintains
 * a provider-specific folder with bookmarks to each repo.
 */

import { getRootFolderIdForRole, findOrCreateFolder } from './bookmark-helpers.js';
import { createGitProvider, GIT_PROVIDERS } from './git-provider.js';
import { getProviderCaps } from './git-provider-common.js';

const REPOS_PER_PAGE = 100;

/**
 * Build a provider client for user-scoped (owner/repo-independent) endpoints.
 * @param {{ token: string, gitProvider?: string, serverUrl?: string }} params
 */
function userApi({ token, gitProvider = GIT_PROVIDERS.GITHUB, serverUrl = '' }) {
  return createGitProvider({ provider: gitProvider, token, owner: '', repo: '', serverUrl });
}

/**
 * Fetch the current authenticated user.
 * @param {{ token: string, gitProvider?: string, serverUrl?: string }} params
 * @returns {Promise<{login: string}>}
 */
export async function fetchCurrentUser({ token, gitProvider = GIT_PROVIDERS.GITHUB, serverUrl = '' }) {
  return userApi({ token, gitProvider, serverUrl }).getAuthenticatedUser();
}

/**
 * Fetch all user repos (public and private).
 * @param {{ token: string, gitProvider?: string, serverUrl?: string }} params
 * @returns {Promise<Array<{full_name: string, html_url: string, private: boolean}>>}
 */
export async function fetchUserRepos({ token, gitProvider = GIT_PROVIDERS.GITHUB, serverUrl = '' }) {
  return userApi({ token, gitProvider, serverUrl }).listUserRepos({ perPage: REPOS_PER_PAGE });
}

export { getRootFolderIdForRole } from './bookmark-helpers.js';

/**
 * Build the target bookmark list: full_name → { url, title }.
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
 * Folder title prefix per provider.
 * @param {string} gitProvider
 * @returns {string}
 */
function folderPrefix(gitProvider) {
  return getProviderCaps(gitProvider).repoFolderPrefix;
}

/**
 * Update the Git provider repos folder with the current user repos.
 * @param {{ token: string, gitProvider?: string, serverUrl?: string, parentRole: string, username?: string, onUsername?: Function }} params
 * @returns {Promise<{count: number, username: string}>}
 */
export async function updateGitHubReposFolder({
  token,
  gitProvider = GIT_PROVIDERS.GITHUB,
  serverUrl = '',
  parentRole,
  username = '',
  onUsername = null,
}) {
  let login = username;
  if (!login) {
    const user = await fetchCurrentUser({ token, gitProvider, serverUrl });
    login = user.login || '';
    if (login && onUsername) onUsername(login);
  }

  const prefix = folderPrefix(gitProvider);
  const folderTitle = login ? `${prefix} (${login})` : prefix;
  const effectiveRole = parentRole === 'menu' ? 'other' : parentRole;
  const parentId = await getRootFolderIdForRole(effectiveRole);
  if (!parentId) {
    throw new Error(`Root folder not found for role: ${parentRole}`);
  }

  const folderId = await findOrCreateFolder(parentId, folderTitle);
  const repos = await fetchUserRepos({ token, gitProvider, serverUrl });
  const targetMap = buildTargetMap(repos);

  const existing = await chrome.bookmarks.getChildren(folderId);
  const byUrl = new Map();
  for (const b of existing) {
    if (b.url) byUrl.set(b.url, b);
  }

  const toAdd = [];
  const toRemove = [];

  for (const [, { url, title }] of targetMap) {
    const existingNode = byUrl.get(url);
    if (!existingNode) {
      toAdd.push({ url, title });
    } else if (existingNode.title !== title) {
      toRemove.push(existingNode);
      toAdd.push({ url, title });
    }
  }

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
