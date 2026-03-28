/**
 * Bookmark Serializer
 * Converts browser bookmark trees to a per-file format (one JSON file per bookmark)
 * and reconstructs the tree from that format.
 * Supports both Chrome and Firefox via role-based root folder mapping.
 *
 * File format:
 *   bookmarks/
 *     _index.json                     ← metadata
 *     toolbar/
 *       _order.json                   ← ordering: ["github_a1b2.json", "dev-tools"]
 *       github_a1b2.json             ← { "title": "GitHub", "url": "https://github.com" }
 *       dev-tools/
 *         _order.json
 *         chrome-devtools_e5f6.json
 *     other/
 *       _order.json
 *       ...
 */

import { getMessage } from './i18n.js';

// ---- Root folder role detection ----

// Sync only toolbar + other. Chrome Other Bookmarks ↔ Firefox Bookmarks Menu.
const ROOT_FOLDER_ID_MAP = {
  '1': 'toolbar', '2': 'other', '3': 'mobile',                         // Chrome
  'toolbar_____': 'toolbar', 'menu________': 'other',                   // Firefox: Bookmarks Menu = other
  'unfiled_____': 'unfiled', 'mobile______': 'mobile',                  // Firefox: not synced
};

const ROOT_FOLDER_TITLE_PATTERNS = [
  { pattern: /toolbar|lesezeichen-symbolleiste|bookmarks bar/i, role: 'toolbar' },
  { pattern: /mobile|mobil/i, role: 'mobile' },
  { pattern: /unfiled|nicht abgelegte/i, role: 'unfiled' },
  { pattern: /menu|menü|bookmarks menu|other|weitere|sonstige/i, role: 'other' },
];

export const SYNC_ROLES = ['toolbar', 'other'];

/**
 * Detect the semantic role of a root-level bookmark folder.
 * @param {object} node - A root-level bookmark node (from chrome.bookmarks.getTree())
 * @returns {'toolbar' | 'other' | 'menu' | 'mobile' | 'unfiled' | 'unknown'}
 */
export function detectRootFolderRole(node) {
  if (node.id && ROOT_FOLDER_ID_MAP[node.id]) {
    return ROOT_FOLDER_ID_MAP[node.id];
  }
  const title = node.title || '';
  for (const { pattern, role } of ROOT_FOLDER_TITLE_PATTERNS) {
    if (pattern.test(title)) return role;
  }
  return 'unknown';
}

// ---- Slug & filename generation ----

/**
 * Create a URL-safe slug from a string.
 * @param {string} str
 * @returns {string}
 */
export function slugify(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40)
    || 'untitled';
}

/**
 * Generate a short deterministic hash from a string (FNV-1a).
 * @param {string} str
 * @returns {string} 4-character base-36 hash
 */
export function shortHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(4, '0').substring(0, 4);
}

/**
 * Generate a deterministic filename for a bookmark.
 * Format: {slug-from-title}_{hash-from-url}.json
 * @param {string} title
 * @param {string} url
 * @returns {string}
 */
export function generateFilename(title, url) {
  return `${slugify(title)}_${shortHash(url || '')}.json`;
}

/**
 * Generate a folder name slug, with dedup suffix if needed.
 * @param {string} title
 * @param {Set<string>} existingNames - Names already used in this directory
 * @returns {string}
 */
function generateFolderName(title, existingNames) {
  let name = slugify(title);
  if (!existingNames.has(name)) return name;
  let i = 2;
  while (existingNames.has(`${name}-${i}`)) i++;
  return `${name}-${i}`;
}

// ---- Browser bookmark tree → file map ----

/**
 * Convert the browser bookmark tree to a file map (path → content string).
 * Each bookmark becomes a JSON file, each folder a directory with _order.json.
 *
 * @param {chrome.bookmarks.BookmarkTreeNode[]} bookmarkTree - From chrome.bookmarks.getTree()
 * @param {string} basePath - Base directory in the repo (e.g. "bookmarks")
 * @param {object} [options] - Sync options (e.g. excludeFolders)
 * @returns {Object<string, string>} Map of file path → file content
 */
export function bookmarkTreeToFileMap(bookmarkTree, basePath, options = {}) {
  const { excludeFolders = [] } = options;
  const files = {};
  const base = basePath.replace(/\/+$/, '');
  const rootChildren = bookmarkTree[0]?.children || [];

  for (const rootFolder of rootChildren) {
    const role = detectRootFolderRole(rootFolder);
    if (!SYNC_ROLES.includes(role)) continue;
    processFolder(rootFolder, `${base}/${role}`, files, options);
  }

  // Add index metadata
  files[`${base}/_index.json`] = JSON.stringify({ version: 2 }, null, 2);

  return files;
}

/**
 * Recursively process a bookmark folder into files.
 *
 * _order.json format: array of entries, each either:
 *   - string: a bookmark filename (e.g. "github_a1b2.json")
 *   - object: a folder entry { "dir": "dev-tools", "title": "Dev Tools" }
 *
 * @param {object} folder
 * @param {string} dirPath
 * @param {Object<string, string>} files
 * @param {object} [options] - Sync options (e.g. excludeFolders)
 */
function processFolder(folder, dirPath, files, options = {}) {
  const { excludeFolders = [] } = options;
  const order = [];
  const usedNames = new Set();
  const rawChildren = folder.children || [];

  // Merge sibling folders that share the same title (dedup browser duplicates)
  const mergedChildren = [];
  const folderTitleMap = new Map();
  for (const child of rawChildren) {
    if (child.url) {
      mergedChildren.push(child);
    } else {
      if (excludeFolders.includes(child.title)) continue;
      const title = child.title || '';
      if (folderTitleMap.has(title)) {
        const existing = folderTitleMap.get(title);
        existing.children.push(...(child.children || []));
      } else {
        const merged = { title, children: [...(child.children || [])] };
        folderTitleMap.set(title, merged);
        mergedChildren.push(merged);
      }
    }
  }

  for (const child of mergedChildren) {
    if (child.url) {
      const filename = generateFilename(child.title, child.url);
      if (usedNames.has(filename)) continue;
      const content = JSON.stringify({ title: child.title || '', url: child.url }, null, 2);
      files[`${dirPath}/${filename}`] = content;
      order.push(filename);
      usedNames.add(filename);
    } else {
      const folderName = generateFolderName(child.title, usedNames);
      usedNames.add(folderName);
      processFolder(child, `${dirPath}/${folderName}`, files, options);
      order.push({ dir: folderName, title: child.title || folderName });
    }
  }

  files[`${dirPath}/_order.json`] = JSON.stringify(order, null, 2);
}

/**
 * Extract a unique key from an _order.json entry for deduplication.
 * Bookmark files use the filename string; folder entries use "dir:{name}".
 * @param {string|object} entry
 * @returns {string}
 */
export function orderEntryKey(entry) {
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object' && entry !== null && entry.dir) return `dir:${entry.dir}`;
  return JSON.stringify(entry);
}

// ---- Shared order/orphan helpers ----

/**
 * Parse _order.json from a file map for a given directory.
 * @param {Object<string, string>} files
 * @param {string} dirPath
 * @returns {Array|null} Parsed order array, or null if missing/invalid
 */
function parseOrderJson(files, dirPath) {
  const content = files[`${dirPath}/_order.json`];
  if (!content) return null;
  try {
    const order = JSON.parse(content);
    return Array.isArray(order) ? order : null;
  } catch { return null; }
}

/**
 * Classify _order.json entries into bookmark filenames and folder descriptors.
 * @param {Array} order - Parsed _order.json array
 * @returns {{ bookmarkEntries: string[], folderEntries: Array<{dir: string, title: string}>, processedFolders: Set<string> }}
 */
function classifyOrderEntries(order) {
  const bookmarkEntries = [];
  const folderEntries = [];
  const processedFolders = new Set();

  for (const entry of order) {
    if (typeof entry === 'string' && entry.endsWith('.json')) {
      bookmarkEntries.push(entry);
    } else if (typeof entry === 'object' && entry.dir) {
      folderEntries.push(entry);
      processedFolders.add(entry.dir);
    } else if (typeof entry === 'string') {
      folderEntries.push({ dir: entry, title: entry });
      processedFolders.add(entry);
    }
  }

  return { bookmarkEntries, folderEntries, processedFolders };
}

/**
 * Find orphan subfolders present in file map but not listed in _order.json.
 * @param {Object<string, string>} files
 * @param {string} dirPath
 * @param {Set<string>} processedFolders - Already-known folder names
 * @returns {Array<{folderName: string, folderPath: string, title: string}>}
 */
function findOrphanSubfolders(files, dirPath, processedFolders) {
  const orphans = [];
  const prefix = dirPath + '/';
  for (const path of Object.keys(files)) {
    if (!path.startsWith(prefix)) continue;
    const rel = path.substring(prefix.length);
    const parts = rel.split('/');
    if (parts.length >= 2 && parts[1] === '_order.json') {
      const folderName = parts[0];
      if (processedFolders.has(folderName)) continue;
      processedFolders.add(folderName);
      orphans.push({
        folderName,
        folderPath: `${dirPath}/${folderName}`,
        title: orphanFolderDisplayTitle(folderName),
      });
    }
  }
  return orphans;
}

function orphanFolderDisplayTitle(folderName) {
  return folderName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ---- File map → browser bookmark tree ----

/**
 * Convert a file map back into a bookmark tree structure that can be used
 * to create bookmarks via the browser API.
 * Returns a map of role → { children: [...] } for each root folder.
 *
 * @param {Object<string, string>} files - Map of path → content
 * @param {string} basePath - Base directory (e.g. "bookmarks")
 * @returns {Object<string, {title: string, children: object[]}>} Role → folder data
 */
export function fileMapToBookmarkTree(files, basePath) {
  const base = basePath.replace(/\/+$/, '');
  const roles = {};

  // Find root role folders
  for (const path of Object.keys(files)) {
    const rel = path.substring(base.length + 1); // e.g. "toolbar/_order.json"
    const parts = rel.split('/');
    if (parts.length >= 1) {
      const role = parts[0];
      if (SYNC_ROLES.includes(role)) {
        roles[role] = true;
      }
    }
  }

  const result = {};
  for (const role of Object.keys(roles)) {
    result[role] = {
      title: role,
      children: buildFolderChildren(files, `${base}/${role}`),
    };
  }

  return result;
}

/**
 * Build the children array for a folder by reading _order.json and file contents.
 *
 * _order.json entries:
 *   - string "file.json" → bookmark
 *   - object { dir: "name", title: "Display Name" } → folder
 *
 * @param {Object<string, string>} files
 * @param {string} dirPath
 * @returns {object[]}
 */
function buildFolderChildren(files, dirPath) {
  const order = parseOrderJson(files, dirPath);
  if (!order) return [];

  const children = [];
  const processedFolders = new Set();
  const seenKeys = new Set();
  const seenFolderTitles = new Map();

  for (const entry of order) {
    const key = orderEntryKey(entry);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    if (typeof entry === 'string' && entry.endsWith('.json')) {
      const filePath = `${dirPath}/${entry}`;
      const content = files[filePath];
      if (!content) continue;
      try {
        const data = JSON.parse(content);
        children.push({ type: 'bookmark', title: data.title || '', url: data.url || '' });
      } catch { /* skip malformed */ }
    } else if (typeof entry === 'object' && entry.dir) {
      const folderPath = `${dirPath}/${entry.dir}`;
      if (files[`${folderPath}/_order.json`] !== undefined) {
        processedFolders.add(entry.dir);
        const folderTitle = entry.title || entry.dir;
        const folderChildren = buildFolderChildren(files, folderPath);
        if (seenFolderTitles.has(folderTitle)) {
          const existingIdx = seenFolderTitles.get(folderTitle);
          children[existingIdx].children.push(...folderChildren);
          continue;
        }
        seenFolderTitles.set(folderTitle, children.length);
        children.push({
          type: 'folder',
          title: folderTitle,
          children: folderChildren,
        });
      }
    } else if (typeof entry === 'string') {
      const folderPath = `${dirPath}/${entry}`;
      if (files[`${folderPath}/_order.json`] !== undefined) {
        processedFolders.add(entry);
        const folderTitle = entry;
        if (seenFolderTitles.has(folderTitle)) {
          const existingIdx = seenFolderTitles.get(folderTitle);
          children[existingIdx].children.push(...buildFolderChildren(files, folderPath));
          continue;
        }
        seenFolderTitles.set(folderTitle, children.length);
        children.push({
          type: 'folder',
          title: entry,
          children: buildFolderChildren(files, folderPath),
        });
      }
    }
  }

  for (const orphan of findOrphanSubfolders(files, dirPath, processedFolders)) {
    if (seenFolderTitles.has(orphan.title)) {
      const existingIdx = seenFolderTitles.get(orphan.title);
      children[existingIdx].children.push(...buildFolderChildren(files, orphan.folderPath));
      continue;
    }
    seenFolderTitles.set(orphan.title, children.length);
    children.push({
      type: 'folder',
      title: orphan.title,
      children: buildFolderChildren(files, orphan.folderPath),
    });
  }

  // Orphan .json files not listed in _order.json (manually created in repo)
  const knownFiles = new Set();
  for (const entry of order) {
    if (typeof entry === 'string') knownFiles.add(entry);
    else if (typeof entry === 'object' && entry.dir) knownFiles.add(entry.dir);
  }

  const prefix = dirPath + '/';
  for (const path of Object.keys(files)) {
    if (!path.startsWith(prefix)) continue;
    const rel = path.substring(prefix.length);
    if (rel.includes('/')) continue;
    if (!rel.endsWith('.json')) continue;
    if (rel.startsWith('_')) continue;
    if (knownFiles.has(rel)) continue;
    const content = files[path];
    if (!content) continue;
    try {
      const data = JSON.parse(content);
      if (data.url) {
        children.push({ type: 'bookmark', title: data.title || '', url: data.url });
      }
    } catch { /* skip malformed */ }
  }

  return children;
}

// ---- File map → Markdown ----

/**
 * Human-readable display names for root folder roles.
 */
const ROLE_DISPLAY_NAMES = {
  toolbar: 'Bookmarks Bar',
  other: 'Other Bookmarks',
};

/**
 * Generate a human-readable Markdown representation of bookmarks from a file map.
 * This file is included in the Git repo for readability but is not used for sync logic.
 * Includes orphan subfolders (present in file map but not in parent _order.json).
 *
 * @param {Object<string, string>} files - File map (path → content)
 * @param {string} basePath - Base directory (e.g. "bookmarks")
 * @returns {string} Markdown string
 */
export function fileMapToMarkdown(files, basePath) {
  const base = basePath.replace(/\/+$/, '');
  const lines = [];

  lines.push('# Bookmarks');
  lines.push('');
  lines.push(`> Last synced: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('> Import: Download `bookmarks.html` and import it in your browser (Chrome: Bookmarks → Import; Firefox: Import and Backup → Import Bookmarks from file).');
  lines.push('');

  for (const role of SYNC_ROLES) {
    const orderPath = `${base}/${role}/_order.json`;
    if (!(orderPath in files)) continue;

    const displayName = ROLE_DISPLAY_NAMES[role] || role;
    lines.push(`## ${displayName}`);
    lines.push('');
    renderFolderAsMarkdown(files, `${base}/${role}`, lines, 3);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Recursively render a folder's contents as Markdown.
 * @param {Object<string, string>} files
 * @param {string} dirPath
 * @param {string[]} lines
 * @param {number} headingLevel - Current heading depth for subfolders (3-6)
 */
function renderFolderAsMarkdown(files, dirPath, lines, headingLevel) {
  const order = parseOrderJson(files, dirPath);
  if (!order) return;

  const { bookmarkEntries, folderEntries, processedFolders } = classifyOrderEntries(order);

  for (const filename of bookmarkEntries) {
    const content = files[`${dirPath}/${filename}`];
    if (!content) continue;
    try {
      const data = JSON.parse(content);
      const title = data.title || data.url || 'Untitled';
      lines.push(`- [${title}](${data.url})`);
    } catch { /* skip */ }
  }

  if (bookmarkEntries.length > 0 && folderEntries.length > 0) {
    lines.push('');
  }

  for (const folder of folderEntries) {
    const folderPath = `${dirPath}/${folder.dir}`;
    if (!(`${folderPath}/_order.json` in files)) continue;

    const prefix = '#'.repeat(Math.min(headingLevel, 6));
    const title = folder.title || folder.dir;
    lines.push(`${prefix} ${title}`);
    lines.push('');
    renderFolderAsMarkdown(files, folderPath, lines, headingLevel + 1);
  }

  for (const orphan of findOrphanSubfolders(files, dirPath, processedFolders)) {
    const prefix = '#'.repeat(Math.min(headingLevel, 6));
    lines.push(`${prefix} ${orphan.title}`);
    lines.push('');
    renderFolderAsMarkdown(files, orphan.folderPath, lines, headingLevel + 1);
  }
}

// ---- File map → Netscape HTML ----

/** Escape HTML special chars for Netscape bookmark file. */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate Netscape-format bookmarks HTML from a file map.
 * Chrome, Firefox, Edge, Safari can import this file directly.
 * Includes orphan subfolders (present in file map but not in parent _order.json).
 *
 * @param {Object<string, string>} files - File map (path → content)
 * @param {string} basePath - Base directory (e.g. "bookmarks")
 * @returns {string} Netscape HTML string
 */
export function fileMapToNetscapeHtml(files, basePath) {
  const base = basePath.replace(/\/+$/, '');
  const now = Math.floor(Date.now() / 1000);
  const parts = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file. Do not edit. -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ];

  for (const role of SYNC_ROLES) {
    const orderPath = `${base}/${role}/_order.json`;
    if (!(orderPath in files)) continue;

    const displayName = ROLE_DISPLAY_NAMES[role] || role;
    parts.push(`    <DT><H3 FOLDED ADD_DATE="${now}">${escapeHtml(displayName)}</H3>`);
    parts.push('    <DL><p>');
    renderFolderAsNetscapeHtml(files, `${base}/${role}`, parts, now);
    parts.push('    </DL><p>');
  }

  parts.push('</DL><p>');
  return parts.join('\n');
}

/**
 * Recursively render a folder's contents as Netscape HTML.
 * @param {Object<string, string>} files
 * @param {string} dirPath
 * @param {string[]} parts
 * @param {number} defaultDate - Unix timestamp for ADD_DATE
 */
function renderFolderAsNetscapeHtml(files, dirPath, parts, defaultDate) {
  const order = parseOrderJson(files, dirPath);
  if (!order) return;

  const { bookmarkEntries, folderEntries, processedFolders } = classifyOrderEntries(order);

  for (const filename of bookmarkEntries) {
    const content = files[`${dirPath}/${filename}`];
    if (!content) continue;
    try {
      const data = JSON.parse(content);
      if (!data.url) continue;
      const title = escapeHtml(data.title || data.url || 'Untitled');
      const url = escapeHtml(data.url);
      parts.push(`        <DT><A HREF="${url}" ADD_DATE="${defaultDate}">${title}</A>`);
    } catch { /* skip */ }
  }

  for (const folder of folderEntries) {
    const folderPath = `${dirPath}/${folder.dir}`;
    if (!(`${folderPath}/_order.json` in files)) continue;

    const title = escapeHtml(folder.title || folder.dir);
    parts.push(`        <DT><H3 FOLDED ADD_DATE="${defaultDate}">${title}</H3>`);
    parts.push('        <DL><p>');
    renderFolderAsNetscapeHtml(files, folderPath, parts, defaultDate);
    parts.push('        </DL><p>');
  }

  for (const orphan of findOrphanSubfolders(files, dirPath, processedFolders)) {
    const title = escapeHtml(orphan.title);
    parts.push(`        <DT><H3 FOLDED ADD_DATE="${defaultDate}">${title}</H3>`);
    parts.push('        <DL><p>');
    renderFolderAsNetscapeHtml(files, orphan.folderPath, parts, defaultDate);
    parts.push('        </DL><p>');
  }
}

// ---- File map → RSS 2.0 feed ----

/** Escape XML special chars for RSS feed. */
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate an RSS 2.0 feed from a file map.
 * Each bookmark becomes an <item> with title, link, and category (folder path).
 * Includes orphan subfolders (present in file map but not in parent _order.json).
 *
 * @param {Object<string, string>} files - File map (path → content)
 * @param {string} basePath - Base directory (e.g. "bookmarks")
 * @returns {string} RSS 2.0 XML string
 */
export function fileMapToRssFeed(files, basePath) {
  const base = basePath.replace(/\/+$/, '');
  const now = new Date().toUTCString();
  const items = [];

  for (const role of SYNC_ROLES) {
    const orderPath = `${base}/${role}/_order.json`;
    if (!(orderPath in files)) continue;

    const displayName = ROLE_DISPLAY_NAMES[role] || role;
    collectRssItems(files, `${base}/${role}`, displayName, items);
  }

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    '    <title>Bookmarks</title>',
    '    <description>Bookmarks synced by GitSyncMarks</description>',
    `    <lastBuildDate>${escapeXml(now)}</lastBuildDate>`,
    '    <generator>GitSyncMarks</generator>',
  ];

  for (const item of items) {
    lines.push('    <item>');
    lines.push(`      <title>${escapeXml(item.title)}</title>`);
    lines.push(`      <link>${escapeXml(item.url)}</link>`);
    lines.push(`      <category>${escapeXml(item.category)}</category>`);
    lines.push('    </item>');
  }

  lines.push('  </channel>');
  lines.push('</rss>');
  return lines.join('\n');
}

/**
 * Recursively collect bookmark items for the RSS feed.
 * @param {Object<string, string>} files
 * @param {string} dirPath
 * @param {string} categoryPath - Human-readable folder path for <category>
 * @param {Array<{title: string, url: string, category: string}>} items
 */
function collectRssItems(files, dirPath, categoryPath, items) {
  const order = parseOrderJson(files, dirPath);
  if (!order) return;

  const { bookmarkEntries, folderEntries, processedFolders } = classifyOrderEntries(order);

  for (const filename of bookmarkEntries) {
    const content = files[`${dirPath}/${filename}`];
    if (!content) continue;
    try {
      const data = JSON.parse(content);
      if (!data.url) continue;
      items.push({
        title: data.title || data.url,
        url: data.url,
        category: categoryPath,
      });
    } catch { /* skip */ }
  }

  for (const folder of folderEntries) {
    const folderPath = `${dirPath}/${folder.dir}`;
    if (!(`${folderPath}/_order.json` in files)) continue;
    collectRssItems(files, folderPath, `${categoryPath} / ${folder.title || folder.dir}`, items);
  }

  for (const orphan of findOrphanSubfolders(files, dirPath, processedFolders)) {
    collectRssItems(files, orphan.folderPath, `${categoryPath} / ${orphan.title}`, items);
  }
}

// ---- File map → Dashy YAML ----

/**
 * Check whether a YAML scalar value needs quoting.
 * Quotes strings containing characters that are special in YAML.
 */
function yamlQuote(str) {
  if (!str) return '""';
  if (/[\n\r]/.test(str)) return JSON.stringify(str);
  if (/[:#\[\]{}&*!|>'"%@`,?]/.test(str) || str !== str.trim() || str === '')
    return JSON.stringify(str);
  return str;
}

/**
 * Generate a Dashy-compatible YAML config from a file map.
 * Each bookmark folder (including nested ones and orphan subfolders) becomes a separate section.
 * Bookmarks become items with title, url, and icon: favicon.
 *
 * @param {Object<string, string>} files - File map (path → content)
 * @param {string} basePath - Base directory (e.g. "bookmarks")
 * @returns {string} YAML string for Dashy conf.yml sections
 */
export function fileMapToDashyYaml(files, basePath) {
  const base = basePath.replace(/\/+$/, '');
  const sections = [];

  for (const role of SYNC_ROLES) {
    const orderPath = `${base}/${role}/_order.json`;
    if (!(orderPath in files)) continue;

    const displayName = ROLE_DISPLAY_NAMES[role] || role;
    collectDashySections(files, `${base}/${role}`, displayName, sections);
  }

  if (sections.length === 0) return 'sections: []\n';

  const lines = ['sections:'];
  for (const section of sections) {
    lines.push(`  - name: ${yamlQuote(section.name)}`);
    if (section.items.length === 0) {
      lines.push('    items: []');
    } else {
      lines.push('    items:');
      for (const item of section.items) {
        lines.push(`      - title: ${yamlQuote(item.title)}`);
        lines.push(`        url: ${yamlQuote(item.url)}`);
        lines.push('        icon: favicon');
      }
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Recursively collect Dashy sections from a folder.
 * Each folder with bookmarks becomes a section; subfolders recurse.
 * @param {Object<string, string>} files
 * @param {string} dirPath
 * @param {string} sectionName - Human-readable path for the section name
 * @param {Array<{name: string, items: Array<{title: string, url: string}>}>} sections
 */
function collectDashySections(files, dirPath, sectionName, sections) {
  const order = parseOrderJson(files, dirPath);
  if (!order) return;

  const { bookmarkEntries, folderEntries, processedFolders } = classifyOrderEntries(order);

  const bookmarks = [];
  for (const filename of bookmarkEntries) {
    const content = files[`${dirPath}/${filename}`];
    if (!content) continue;
    try {
      const data = JSON.parse(content);
      if (!data.url) continue;
      bookmarks.push({ title: data.title || data.url, url: data.url });
    } catch { /* skip */ }
  }

  sections.push({ name: sectionName, items: bookmarks });

  for (const folder of folderEntries) {
    const folderPath = `${dirPath}/${folder.dir}`;
    if (!(`${folderPath}/_order.json` in files)) continue;
    collectDashySections(files, folderPath, `${sectionName} > ${folder.title || folder.dir}`, sections);
  }

  for (const orphan of findOrphanSubfolders(files, dirPath, processedFolders)) {
    collectDashySections(files, orphan.folderPath, `${sectionName} > ${orphan.title}`, sections);
  }
}

// ---- Git tree → file map ----

/**
 * Convert a GitHub git tree (from getTree API) into a partial file map.
 * Only includes paths under basePath. Content must be fetched separately via getBlob.
 *
 * @param {Array<{path: string, type: string, sha: string}>} treeEntries
 * @param {string} basePath
 * @returns {Object<string, string>} Map of path → blob SHA (not content!)
 */
export function gitTreeToShaMap(treeEntries, basePath) {
  const base = basePath.replace(/\/+$/, '');
  const shaMap = {};

  for (const entry of treeEntries) {
    if (entry.type === 'blob' && entry.path.startsWith(base + '/')) {
      shaMap[entry.path] = entry.sha;
    }
  }

  return shaMap;
}

// ---- Legacy format support (for import/export & migration) ----

/**
 * Serialize the browser bookmark tree to the legacy single-JSON format.
 * Used for backward-compatible import/export.
 * @param {chrome.bookmarks.BookmarkTreeNode[]} bookmarkTree
 * @param {string} deviceId
 * @returns {object}
 */
export function serializeToJson(bookmarkTree, deviceId) {
  const rootChildren = bookmarkTree[0]?.children || [];
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    deviceId,
    bookmarks: rootChildren.map(node => {
      const serialized = serializeNode(node);
      serialized.role = detectRootFolderRole(node);
      return serialized;
    }),
  };
}

function serializeNode(node) {
  const s = { title: node.title, dateAdded: node.dateAdded };
  if (node.url) {
    s.type = 'bookmark';
    s.url = node.url;
  } else {
    s.type = 'folder';
    s.children = (node.children || []).map(c => serializeNode(c));
  }
  return s;
}

/**
 * Deserialize legacy JSON format.
 * @param {object} data
 * @returns {object[]}
 */
export function deserializeFromJson(data) {
  if (!data || !data.bookmarks || data.version !== 1) {
    throw new Error(getMessage('serializer_invalidFormat'));
  }
  return data.bookmarks;
}

// ---- Utility: content hash for diff detection ----

/**
 * Fast content hash (FNV-1a) for change detection.
 * @param {string} content
 * @returns {string}
 */
export function contentHash(content) {
  let h = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
