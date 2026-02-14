/**
 * Bookmark replacement – replaces local bookmarks with data from a role map.
 * Extracted to avoid circular imports (profile-manager needs this without importing sync-engine).
 */

import { detectRootFolderRole } from './bookmark-serializer.js';

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
 * Replace all local bookmarks with data from a role map.
 * @param {Object<string, {title: string, children: object[]}>} roleMap
 */
export async function replaceLocalBookmarks(roleMap) {
  const tree = await chrome.bookmarks.getTree();
  const rootChildren = tree[0]?.children || [];

  const localByRole = {};
  for (const folder of rootChildren) {
    const role = detectRootFolderRole(folder);
    localByRole[role] = folder;
  }

  for (const [role, localFolder] of Object.entries(localByRole)) {
    const data = roleMap[role] || { title: role, children: [] };

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
