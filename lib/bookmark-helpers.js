/**
 * Shared bookmark folder utilities used by github-repos and linkwarden-sync.
 */

import { detectRootFolderRole } from './bookmark-serializer.js';

/**
 * Find the root folder ID for a given role (toolbar, other, menu).
 * @param {string} parentRole
 * @returns {Promise<string|null>} Folder ID or null
 */
export async function getRootFolderIdForRole(parentRole) {
  const tree = await chrome.bookmarks.getTree();
  const rootChildren = tree[0]?.children || [];
  for (const folder of rootChildren) {
    const role = detectRootFolderRole(folder);
    if (role === parentRole) return folder.id;
  }
  return null;
}

/**
 * Find or create a subfolder with the given title under the given parent.
 * @param {string} parentId - Parent folder ID
 * @param {string} folderTitle - Title of the folder
 * @returns {Promise<string>} Folder ID
 */
export async function findOrCreateFolder(parentId, folderTitle) {
  const children = await chrome.bookmarks.getChildren(parentId);
  const existing = children.find((c) => !c.url && c.title === folderTitle);
  if (existing) return existing.id;

  const folder = await chrome.bookmarks.create({
    parentId,
    title: folderTitle,
  });
  return folder.id;
}
