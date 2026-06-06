/**
 * Diff utilities for sync — no profile-manager dependency (safe for profile switch).
 */

/** Files excluded from diff calculations (generated/meta). */
export const DIFF_IGNORE_SUFFIXES = ['/README.md', '/_index.json', '/bookmarks.html', '/feed.xml', '/dashy-conf.yml'];
export const SETTINGS_ENC_PATTERN = /\/(?:settings(?:-[^/]+)?\.enc|profiles\/[^/]+\/settings\.enc)$/;
/** Repo-root Bitwarden backup files (default path); custom dirs use same helper in sync-settings. */
export const BITWARDEN_BACKUP_DEFAULT_PATTERN = /^backups\/bitwarden\//;

/**
 * Filter a file map to exclude generated/meta files from diff calculations.
 * @param {Object<string, string>} files
 * @returns {Object<string, string>}
 */
export function filterForDiff(files) {
  const filtered = {};
  for (const [path, content] of Object.entries(files)) {
    if (DIFF_IGNORE_SUFFIXES.some((suffix) => path.endsWith(suffix))) continue;
    if (SETTINGS_ENC_PATTERN.test(path)) continue;
    if (BITWARDEN_BACKUP_DEFAULT_PATTERN.test(path)) continue;
    filtered[path] = content;
  }
  return filtered;
}

/**
 * @param {*} value
 * @returns {*}
 */
function canonicalizeValue(value) {
  if (Array.isArray(value)) return value.map(canonicalizeValue);
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = canonicalizeValue(value[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * @param {string} content
 * @returns {string|null}
 */
function canonicalJson(content) {
  try {
    return JSON.stringify(canonicalizeValue(JSON.parse(content)));
  } catch {
    return null;
  }
}

/**
 * @param {string|null} a
 * @param {string|null} b
 * @returns {boolean}
 */
export function contentEquals(a, b) {
  if (a === b) return true;
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ca = canonicalJson(a);
  if (ca === null) return false;
  const cb = canonicalJson(b);
  if (cb === null) return false;
  return ca === cb;
}

/**
 * @param {Object<string, string>} base
 * @param {Object<string, string>} current
 * @returns {{added: Object<string, string>, removed: string[], modified: Object<string, string>}}
 */
export function computeDiff(base, current) {
  const added = {};
  const removed = [];
  const modified = {};

  for (const [path, content] of Object.entries(current)) {
    if (!(path in base)) {
      added[path] = content;
    } else if (!contentEquals(base[path], content)) {
      modified[path] = content;
    }
  }

  for (const path of Object.keys(base)) {
    if (!(path in current)) {
      removed.push(path);
    }
  }

  return { added, removed, modified };
}
