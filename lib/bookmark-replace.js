/**
 * Bookmark replacement – replaces local bookmarks with data from a role map.
 * Extracted to avoid circular imports (profile-manager needs this without importing sync-engine).
 */

import { detectRootFolderRole, SYNC_ROLES } from './bookmark-serializer.js';
import { log as debugLog } from './debug-log.js';
import { LOCAL_STORAGE_KEYS } from './storage-keys.js';

const APPLY_IN_PROGRESS_KEY = LOCAL_STORAGE_KEYS.APPLY_IN_PROGRESS;

async function removeBookmarkTree(id) {
  try {
    await chrome.bookmarks.removeTree(id);
  } catch (err) {
    console.warn('[GitSyncMarks] Could not remove bookmark:', id, err);
  }
}

/**
 * @param {object} node
 * @param {string} parentId
 * @param {Array<{title?: string, url?: string, error: string}>} failures
 * @returns {Promise<number>} created bookmark count
 */
export async function createBookmarkTree(node, parentId, failures = []) {
  if (node.type === 'bookmark') {
    try {
      await chrome.bookmarks.create({ parentId, title: node.title, url: node.url });
      return 1;
    } catch (err) {
      failures.push({
        title: node.title,
        url: node.url,
        error: String(err?.message || err),
      });
      return 0;
    }
  }
  if (node.type === 'folder') {
    let folder;
    try {
      folder = await chrome.bookmarks.create({ parentId, title: node.title });
    } catch (err) {
      failures.push({
        title: node.title,
        error: String(err?.message || err),
      });
      return 0;
    }
    let created = 0;
    if (node.children) {
      for (const child of node.children) {
        created += await createBookmarkTree(child, folder.id, failures);
      }
    }
    return created;
  }
  return 0;
}

/**
 * Convert a Chrome bookmark node to tree format for createBookmarkTree.
 * @param {object} node - Chrome bookmark node (from getTree)
 * @returns {{type: string, title: string, url?: string, children?: object[]}}
 */
function chromeNodeToTree(node) {
  if (node.url) {
    return { type: 'bookmark', title: node.title || '', url: node.url };
  }
  return {
    type: 'folder',
    title: node.title || '',
    children: (node.children || []).map(chromeNodeToTree),
  };
}

/** Check if a tree node is a GitHubRepos folder. */
function isGitHubReposFolder(node, username) {
  if (node.type !== 'folder') return false;
  const t = node.title || '';
  if (!t.startsWith('GitHubRepos (')) return false;
  if (username) return t === `GitHubRepos (${username})`;
  return true;
}

/** Check if Git data has a GitHubRepos folder. */
function gitHasGitHubReposFolder(children, username) {
  if (!children) return false;
  return children.some((c) => isGitHubReposFolder(c, username));
}

/** Check if a tree node is a Linkwarden folder. */
function isLinkwardenFolder(node) {
  return node.type === 'folder' && node.title === 'Linkwarden';
}

/** Check if Git data has a Linkwarden folder. */
function gitHasLinkwardenFolder(children) {
  if (!children) return false;
  return children.some(isLinkwardenFolder);
}

/**
 * @returns {Promise<{profileId: string, commitSha?: string|null, startedAt: number}|null>}
 */
export async function getApplyInProgress() {
  const local = await chrome.storage.local.get({ [APPLY_IN_PROGRESS_KEY]: null });
  return local[APPLY_IN_PROGRESS_KEY] || null;
}

export async function clearApplyInProgress() {
  await chrome.storage.local.remove(APPLY_IN_PROGRESS_KEY);
}

/**
 * Replace all local bookmarks with data from a role map.
 * @param {Object<string, {title: string, children: object[]}>} roleMap
 * @param {{githubReposEnabled?: boolean, githubReposParent?: string, githubReposUsername?: string, linkwardenSyncEnabled?: boolean, linkwardenSyncParent?: string, linkwardenSyncPushToGit?: boolean, profileId?: string|null, commitSha?: string|null}} [options]
 * @returns {Promise<{created: number, failed: Array<{title?: string, url?: string, error: string}>}>}
 */
export async function replaceLocalBookmarks(roleMap, options = {}) {
  const {
    githubReposEnabled = false,
    githubReposParent = 'other',
    githubReposUsername = '',
    linkwardenSyncEnabled = false,
    linkwardenSyncParent = 'other',
    linkwardenSyncPushToGit = false,
    profileId = null,
    commitSha = null,
  } = options;

  await debugLog(`replaceLocalBookmarks() roleMap roles: ${Object.keys(roleMap).join(', ')}; githubReposEnabled=${githubReposEnabled} githubReposParent=${githubReposParent}`);

  if (profileId) {
    await chrome.storage.local.set({
      [APPLY_IN_PROGRESS_KEY]: {
        profileId,
        commitSha: commitSha || null,
        startedAt: Date.now(),
      },
    });
  }

  const tree = await chrome.bookmarks.getTree();
  const rootChildren = tree[0]?.children || [];

  const localByRole = {};
  for (const folder of rootChildren) {
    const role = detectRootFolderRole(folder);
    localByRole[role] = folder;
  }

  const failed = [];
  let created = 0;

  for (const role of SYNC_ROLES) {
    const localFolder = localByRole[role];
    if (!localFolder) continue;

    let data = roleMap[role] || { title: role, children: [] };

    // Preserve GitHubRepos folder when feature is on and Git doesn't have it
    if (githubReposEnabled && role === githubReposParent && !gitHasGitHubReposFolder(data.children, githubReposUsername || undefined)) {
      const localChildren = localFolder.children || [];
      const preserveFolder = localChildren.find((c) => {
        const t = c.title || '';
        if (!t.startsWith('GitHubRepos (')) return false;
        return githubReposUsername ? t === `GitHubRepos (${githubReposUsername})` : true;
      });
      if (preserveFolder) {
        data = {
          ...data,
          children: [...(data.children || []), chromeNodeToTree(preserveFolder)],
        };
      }
    }

    // Preserve Linkwarden folder when feature is on and it's NOT pushed to Git (and Git doesn't have it)
    if (linkwardenSyncEnabled && role === linkwardenSyncParent && !linkwardenSyncPushToGit && !gitHasLinkwardenFolder(data.children)) {
      const localChildren = localFolder.children || [];
      const lwFolder = localChildren.find(isLinkwardenFolder);
      if (lwFolder) {
        data = {
          ...data,
          children: [...(data.children || []), chromeNodeToTree(lwFolder)],
        };
      }
    }

    if (localFolder.children) {
      for (const child of [...localFolder.children].reverse()) {
        await removeBookmarkTree(child.id);
      }
    }

    if (data.children) {
      for (const child of data.children) {
        created += await createBookmarkTree(child, localFolder.id, failed);
      }
    }
  }

  if (failed.length > 0) {
    await debugLog(`replaceLocalBookmarks() skipped ${failed.length} node(s)`);
  }

  return { created, failed };
}
