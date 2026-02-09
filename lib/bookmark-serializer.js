/**
 * Bookmark Serializer
 * Converts browser bookmark trees to JSON and Markdown formats,
 * and deserializes JSON back to a bookmark tree structure.
 * Supports both Chrome and Firefox bookmark structures via role-based mapping.
 */

import { getMessage } from './i18n.js';

// ---- Root folder role detection ----

/**
 * Known root folder IDs for Chrome and Firefox.
 * Chrome uses numeric string IDs, Firefox uses fixed padded strings.
 */
const ROOT_FOLDER_ID_MAP = {
  // Chrome
  '1': 'toolbar',
  '2': 'other',
  '3': 'mobile',
  // Firefox
  'toolbar_____': 'toolbar',
  'unfiled_____': 'other',
  'menu________': 'menu',
  'mobile______': 'mobile',
};

/**
 * Title-based fallback patterns for root folder role detection.
 * Used when the ID is not in the known map (e.g. future browser versions).
 * @type {Array<{pattern: RegExp, role: string}>}
 */
const ROOT_FOLDER_TITLE_PATTERNS = [
  { pattern: /toolbar|lesezeichen-symbolleiste|bookmarks bar/i, role: 'toolbar' },
  { pattern: /other|unfiled|weitere|sonstige/i, role: 'other' },
  { pattern: /mobile|mobil/i, role: 'mobile' },
  { pattern: /menu|menü/i, role: 'menu' },
];

/**
 * Detect the semantic role of a root-level bookmark folder.
 * Uses the node's ID (reliable) with title-based fallback.
 *
 * @param {chrome.bookmarks.BookmarkTreeNode} node - A root-level bookmark node
 * @returns {'toolbar' | 'other' | 'menu' | 'mobile' | 'unknown'}
 */
export function detectRootFolderRole(node) {
  // 1. Try by ID (most reliable)
  if (node.id && ROOT_FOLDER_ID_MAP[node.id]) {
    return ROOT_FOLDER_ID_MAP[node.id];
  }

  // 2. Fallback: match by title
  const title = node.title || '';
  for (const { pattern, role } of ROOT_FOLDER_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      return role;
    }
  }

  return 'unknown';
}

// ---- Serialization ----

/**
 * Serialize the browser bookmark tree to a JSON object with metadata.
 * Each root-level folder gets a `role` field for cross-browser mapping.
 *
 * @param {chrome.bookmarks.BookmarkTreeNode[]} bookmarkTree - The full bookmark tree from chrome.bookmarks.getTree()
 * @param {string} deviceId - Unique device identifier
 * @returns {object} Serialized bookmark data with metadata
 */
export function serializeToJson(bookmarkTree, deviceId) {
  const rootChildren = bookmarkTree[0]?.children || [];

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    deviceId: deviceId,
    bookmarks: rootChildren.map(node => {
      const serialized = serializeNode(node);
      // Add role to root-level folders for cross-browser mapping
      serialized.role = detectRootFolderRole(node);
      return serialized;
    }),
  };
}

/**
 * Recursively serialize a single bookmark node.
 * @param {chrome.bookmarks.BookmarkTreeNode} node
 * @returns {object}
 */
function serializeNode(node) {
  const serialized = {
    title: node.title,
    dateAdded: node.dateAdded,
  };

  if (node.url) {
    // It's a bookmark (leaf)
    serialized.type = 'bookmark';
    serialized.url = node.url;
  } else {
    // It's a folder
    serialized.type = 'folder';
    serialized.children = (node.children || []).map(child => serializeNode(child));
  }

  return serialized;
}

/**
 * Deserialize JSON data back into a structure that can be used
 * to recreate the bookmark tree via the Chrome Bookmarks API.
 * @param {object} data - The JSON data (as returned by serializeToJson)
 * @returns {object[]} Array of bookmark nodes
 */
export function deserializeFromJson(data) {
  if (!data || !data.bookmarks || data.version !== 1) {
    throw new Error(getMessage('serializer_invalidFormat'));
  }
  return data.bookmarks;
}

/**
 * Serialize bookmark data to a human-readable Markdown string.
 * @param {object} data - The JSON data (as returned by serializeToJson)
 * @returns {string} Markdown-formatted string
 */
export function serializeToMarkdown(data) {
  const lines = [];
  lines.push('# Bookmarks');
  lines.push('');
  lines.push(`> ${getMessage('serializer_lastSynced', [data.exportedAt])}`);
  lines.push(`> ${getMessage('serializer_device', [`\`${data.deviceId}\``])}`);
  lines.push('');

  const bookmarks = data.bookmarks || [];
  for (const node of bookmarks) {
    renderNodeAsMarkdown(node, lines, 2);
  }

  return lines.join('\n');
}

/**
 * Recursively render a bookmark node as Markdown.
 * @param {object} node - Serialized bookmark node
 * @param {string[]} lines - Array of output lines
 * @param {number} headingLevel - Current heading level for folders (2-6)
 */
function renderNodeAsMarkdown(node, lines, headingLevel) {
  if (node.type === 'folder') {
    const prefix = '#'.repeat(Math.min(headingLevel, 6));
    lines.push(`${prefix} ${node.title || getMessage('serializer_untitled')}`);
    lines.push('');

    const children = node.children || [];
    // First render bookmarks (leaves), then subfolders
    const bookmarks = children.filter(c => c.type === 'bookmark');
    const folders = children.filter(c => c.type === 'folder');

    for (const bm of bookmarks) {
      renderNodeAsMarkdown(bm, lines, headingLevel + 1);
    }

    if (bookmarks.length > 0 && folders.length > 0) {
      lines.push('');
    }

    for (const folder of folders) {
      renderNodeAsMarkdown(folder, lines, headingLevel + 1);
    }
  } else if (node.type === 'bookmark') {
    const title = node.title || node.url;
    lines.push(`- [${title}](${node.url})`);
  }
}

/**
 * Compare two serialized bookmark JSON objects to check if they differ in content.
 * Ignores metadata like exportedAt and deviceId.
 * @param {object} a - First bookmark data
 * @param {object} b - Second bookmark data
 * @returns {boolean} true if the bookmark content is the same
 */
export function bookmarksEqual(a, b) {
  if (!a || !b) return false;
  return JSON.stringify(a.bookmarks) === JSON.stringify(b.bookmarks);
}
