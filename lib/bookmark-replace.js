/**
 * Bookmark replacement – brings local bookmarks in line with a role map.
 * Extracted to avoid circular imports (profile-manager needs this without importing sync-engine).
 *
 * The local tree is reconciled, not rebuilt: nodes that match the target keep their IDs and are
 * only updated or moved; only what differs is created or removed. That keeps bookmark IDs stable
 * (quick folders, other extensions), keeps dateAdded, and avoids an event storm and churn in the
 * browser's own sync.
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

/**
 * Create a node and its descendants. Returns how many nodes were skipped because the
 * browser rejected them (e.g. a URL scheme only the other browser supports).
 */
export async function createBookmarkTree(node, parentId) {
  if (node.type !== 'bookmark' && node.type !== 'folder') return 0;
  return (await createSubtree(node, parentId)).skipped;
}

/**
 * Create one node (and, for a folder, its descendants) at an optional index.
 * @returns {Promise<{id: string, skipped: number}>}
 */
async function createSubtree(node, parentId, index) {
  const created = await chrome.bookmarks.create({
    parentId,
    ...(index === undefined ? {} : { index }),
    title: node.title,
    ...(node.type === 'bookmark' ? { url: node.url } : {}),
  });
  const skipped = node.type === 'folder' ? await createChildren(node.children || [], created.id) : 0;
  return { id: created.id, skipped };
}

/**
 * Create sibling nodes one by one. A child the browser rejects is logged and skipped so
 * its siblings (and the rest of the tree) are still created instead of aborting halfway.
 */
async function createChildren(children, parentId) {
  let skipped = 0;
  for (const child of children) {
    try {
      skipped += await createBookmarkTree(child, parentId);
    } catch (err) {
      skipped += 1;
      console.warn('[GitSyncMarks] Skipped bookmark the browser rejected:', child.title, err?.message);
    }
  }
  return skipped;
}

/** A getTree() node is a folder when it has children and no URL (separators are neither). */
const isFolderNode = (node) => !node.url && Array.isArray(node.children);

function newReconcileStats() {
  return { created: 0, removed: 0, updated: 0, moved: 0, skipped: 0 };
}

/**
 * Make the children of `folder` (a getTree() node) equal to `targetChildren`, in order.
 *
 * Matching, each existing node used at most once:
 *   1. bookmark: same URL and title — folder: same title
 *   2. bookmark: same URL (title changed → update)
 *   3. bookmark: same title (URL changed → update)
 * Unmatched existing nodes are removed, unmatched targets are created. Nodes are only ever moved
 * up (to the current position): Chrome and Firefox read the index of a downward move inside the
 * same folder differently, an upward move means the same in both.
 *
 * @param {{id: string, children?: object[]}} folder
 * @param {Array<{type: string, title: string, url?: string, children?: object[]}>} targetChildren
 * @param {ReturnType<typeof newReconcileStats>} [stats]
 */
export async function reconcileChildren(folder, targetChildren, stats = newReconcileStats()) {
  const existing = [...(folder.children || [])];
  const used = new Set();
  const matches = new Array(targetChildren.length).fill(null);

  const matchPass = (predicate) => {
    targetChildren.forEach((target, i) => {
      if (matches[i]) return;
      const found = existing.find((node) => !used.has(node.id) && predicate(target, node));
      if (found) {
        matches[i] = found;
        used.add(found.id);
      }
    });
  };
  matchPass((t, n) => (t.type === 'folder'
    ? isFolderNode(n) && n.title === t.title
    : !!n.url && n.url === t.url && n.title === t.title));
  matchPass((t, n) => t.type === 'bookmark' && !!n.url && n.url === t.url);
  matchPass((t, n) => t.type === 'bookmark' && !!n.url && n.title === t.title);

  for (const node of existing) {
    if (used.has(node.id)) continue;
    await removeBookmarkTree(node.id);
    stats.removed += 1;
  }

  // Current order of the surviving nodes; positions before `pos` are final.
  const order = existing.filter((node) => used.has(node.id)).map((node) => node.id);
  let pos = 0;
  for (const [i, target] of targetChildren.entries()) {
    const match = matches[i];
    if (!match) {
      if (target.type !== 'bookmark' && target.type !== 'folder') continue;
      try {
        const created = await createSubtree(target, folder.id, pos);
        order.splice(pos, 0, created.id);
        pos += 1;
        stats.created += 1;
        stats.skipped += created.skipped;
      } catch (err) {
        stats.skipped += 1;
        console.warn('[GitSyncMarks] Skipped bookmark the browser rejected:', target.title, err?.message);
      }
      continue;
    }

    if (target.type === 'bookmark' && (match.title !== target.title || match.url !== target.url)) {
      try {
        await chrome.bookmarks.update(match.id, { title: target.title, url: target.url });
        stats.updated += 1;
      } catch (err) {
        stats.skipped += 1;
        console.warn('[GitSyncMarks] Could not update bookmark:', target.title, err?.message);
      }
    }

    const at = order.indexOf(match.id);
    if (at !== pos) {
      await chrome.bookmarks.move(match.id, { parentId: folder.id, index: pos });
      order.splice(at, 1);
      order.splice(pos, 0, match.id);
      stats.moved += 1;
    }
    pos += 1;

    if (target.type === 'folder') {
      await reconcileChildren(match, target.children || [], stats);
    }
  }
  return stats;
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
 * Bring local bookmarks in line with a role map (reconciled, see reconcileChildren).
 * @param {Object<string, {title: string, children: object[]}>} roleMap
 * @param {{githubReposEnabled?: boolean, githubReposParent?: string, githubReposUsername?: string, linkwardenSyncEnabled?: boolean, linkwardenSyncParent?: string, linkwardenSyncPushToGit?: boolean}} [options]
 */
export async function replaceLocalBookmarks(roleMap, options = {}) {
  const {
    githubReposEnabled = false,
    githubReposParent = 'other',
    githubReposUsername = '',
    linkwardenSyncEnabled = false,
    linkwardenSyncParent = 'other',
    linkwardenSyncPushToGit = false
  } = options;

  await debugLog(`replaceLocalBookmarks() roleMap roles: ${Object.keys(roleMap).join(', ')}; githubReposEnabled=${githubReposEnabled} githubReposParent=${githubReposParent}`);

  const tree = await chrome.bookmarks.getTree();
  const rootChildren = tree[0]?.children || [];

  const localByRole = {};
  for (const folder of rootChildren) {
    const role = detectRootFolderRole(folder);
    localByRole[role] = folder;
  }

  const stats = newReconcileStats();
  for (const role of SYNC_ROLES) {
    const localFolder = localByRole[role];
    if (!localFolder) continue;

    // A role the remote does not provide is left untouched instead of being emptied.
    if (!roleMap[role]) continue;
    let data = roleMap[role];

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

    await reconcileChildren(localFolder, data.children || [], stats);
  }

  await debugLog(
    `replaceLocalBookmarks() created=${stats.created} removed=${stats.removed} updated=${stats.updated} moved=${stats.moved} skipped=${stats.skipped}`
  );
  return stats;
}
