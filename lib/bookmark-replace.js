/**
 * Bookmark replacement – replaces local bookmarks with data from a role map.
 * Extracted to avoid circular imports (profile-manager needs this without importing sync-engine).
 */

import { detectRootFolderRole, SYNC_ROLES } from './bookmark-serializer.js';
import { log as debugLog } from './debug-log.js';

async function removeBookmarkTree(id) {
  try {
    await chrome.bookmarks.removeTree(id);
  } catch (err) {
    console.warn('[GitSyncMarks] Could not remove bookmark:', id, err);
  }
}

export async function createBookmarkTree(node, parentId) {
  if (node.type === 'bookmark') {
    await chrome.bookmarks.create({ parentId, title: node.title, url: node.url });
  } else if (node.type === 'folder') {
    const folder = await chrome.bookmarks.create({ parentId, title: node.title });
    if (node.children) {
      for (const child of node.children) {
        await createBookmarkTree(child, folder.id);
      }
    }
  }
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

/**
 * Replace all local bookmarks with data from a role map.
 * @param {Object<string, {title: string, children: object[]}>} roleMap
 * @param {{githubReposEnabled?: boolean, githubReposParent?: string, githubReposUsername?: string}} [options]
 */
export async function replaceLocalBookmarks(roleMap, options = {}) {
  const { githubReposEnabled = false, githubReposParent = 'other', githubReposUsername = '' } = options;

  await debugLog(`replaceLocalBookmarks() roleMap roles: ${Object.keys(roleMap).join(', ')}; githubReposEnabled=${githubReposEnabled} githubReposParent=${githubReposParent}`);

  const tree = await chrome.bookmarks.getTree();
  const rootChildren = tree[0]?.children || [];

  const localByRole = {};
  for (const folder of rootChildren) {
    const role = detectRootFolderRole(folder);
    localByRole[role] = folder;
  }

  for (const role of SYNC_ROLES) {
    const localFolder = localByRole[role];
    if (!localFolder) continue;

    let data = roleMap[role] || { title: role, children: [] };

    // Preserve GitHubRepos folder when feature is on and Git doesn't have it
    let preserveFolder = null;
    if (githubReposEnabled && role === githubReposParent && !gitHasGitHubReposFolder(data.children, githubReposUsername || undefined)) {
      const localChildren = localFolder.children || [];
      preserveFolder = localChildren.find((c) => {
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

    if (localFolder.children) {
      for (const child of [...localFolder.children].reverse()) {
        await removeBookmarkTree(child.id);
      }
    }

    if (data.children) {
      for (const child of data.children) {
        await createBookmarkTree(child, localFolder.id);
      }
    }
  }
}
