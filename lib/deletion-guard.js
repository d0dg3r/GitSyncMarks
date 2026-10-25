/**
 * Bulk-deletion safety checks for sync — blocks repo-wide wipes when local tree shrinks abnormally.
 */

/** Default minimum payload files deleted before the guard can trigger. */
export const DEFAULT_DELETE_GUARD_MIN_FILES = 10;

/** Default fraction of reference payload files that must be deleted to block. */
export const DEFAULT_DELETE_GUARD_MAX_FRACTION = 0.15;

/**
 * Bookmark payload paths scheduled for deletion in a file-change map.
 * @param {Object<string, string|null>} fileChanges
 * @param {(path: string) => boolean} isIgnoredPath
 * @returns {string[]}
 */
export function listPayloadDeletions(fileChanges, isIgnoredPath) {
  const out = [];
  for (const [path, content] of Object.entries(fileChanges || {})) {
    if (content !== null) continue;
    if (isIgnoredPath(path)) continue;
    if (!path.endsWith('.json')) continue;
    if (path.endsWith('/_index.json') || path.endsWith('/_order.json')) continue;
    out.push(path);
  }
  return out;
}

/**
 * @param {{ deleteCount: number, referenceCount: number, minFiles?: number, maxFraction?: number, enabled?: boolean }}
 * @returns {{ blocked: boolean, deleteCount: number, referenceCount: number, percent: number }}
 */
export function assessDeletionGuard({
  deleteCount,
  referenceCount,
  minFiles = DEFAULT_DELETE_GUARD_MIN_FILES,
  maxFraction = DEFAULT_DELETE_GUARD_MAX_FRACTION,
  enabled = true,
}) {
  const deletes = Math.max(0, deleteCount);
  const reference = Math.max(0, referenceCount);
  const percent = reference > 0 ? deletes / reference : deletes > 0 ? 1 : 0;
  const blocked =
    enabled &&
    deletes >= minFiles &&
    reference > 0 &&
    percent >= maxFraction;
  return { blocked, deleteCount: deletes, referenceCount: reference, percent };
}

/**
 * Local tree shrank far below its own sync base (stale browser state).
 * @param {{ localCount: number, baseCount: number, maxFraction?: number, enabled?: boolean }}
 * @returns {{ blocked: boolean, localCount: number, baseCount: number, percent: number }}
 */
export function assessLocalShrink({
  localCount,
  baseCount,
  maxFraction = DEFAULT_DELETE_GUARD_MAX_FRACTION,
  enabled = true,
}) {
  const local = Math.max(0, localCount);
  const base = Math.max(0, baseCount);
  if (!enabled || base === 0) {
    return { blocked: false, localCount: local, baseCount: base, percent: 0 };
  }
  const shrink = base - local;
  const percent = shrink / base;
  const blocked = shrink >= DEFAULT_DELETE_GUARD_MIN_FILES && percent >= maxFraction;
  return { blocked, localCount: local, baseCount: base, percent };
}

/** URL stored in a bookmark payload file, or null. */
export function bookmarkUrlOf(content) {
  try {
    return JSON.parse(content)?.url || null;
  } catch {
    return null;
  }
}

/**
 * Drop deletions that are moves: the same URL is written at a new path in the same change set
 * (a renamed or moved folder changes the path of every bookmark inside it).
 * Each added URL can cancel one deletion, so duplicates are matched one to one.
 * @param {string[]} deletions
 * @param {Object<string, string|null>} fileChanges
 * @param {Object<string, string>} contents - Old content of the deleted paths
 * @param {(path: string) => boolean} isIgnoredPath
 * @returns {string[]} Deletions that are real removals
 */
export function listRealPayloadDeletions(deletions, fileChanges, contents, isIgnoredPath) {
  const addedUrls = new Map();
  for (const [path, content] of Object.entries(fileChanges || {})) {
    if (content === null || isIgnoredPath(path) || !path.endsWith('.json')) continue;
    if (path.endsWith('/_index.json') || path.endsWith('/_order.json')) continue;
    const url = bookmarkUrlOf(content);
    if (url) addedUrls.set(url, (addedUrls.get(url) || 0) + 1);
  }
  return deletions.filter((path) => {
    const url = bookmarkUrlOf(contents?.[path]);
    const pending = url ? addedUrls.get(url) || 0 : 0;
    if (pending > 0) {
      addedUrls.set(url, pending - 1);
      return false;
    }
    return true;
  });
}

/**
 * Evaluate file changes against a reference payload count.
 * @param {Object<string, string|null>} fileChanges
 * @param {number} referenceCount
 * @param {(path: string) => boolean} isIgnoredPath
 * @param {{ enabled?: boolean, minFiles?: number, maxFraction?: number, contents?: Object<string, string> }} options
 *   contents: old content of paths that are deleted, used to recognise moves
 * @returns {{ blocked: boolean, deleteCount: number, referenceCount: number, percent: number, paths: string[] }}
 */
export function assessFileChangesDeletionGuard(
  fileChanges,
  referenceCount,
  isIgnoredPath,
  options = {}
) {
  let paths = listPayloadDeletions(fileChanges, isIgnoredPath);
  if (options.contents) {
    paths = listRealPayloadDeletions(paths, fileChanges, options.contents, isIgnoredPath);
  }
  const assessment = assessDeletionGuard({
    deleteCount: paths.length,
    referenceCount,
    minFiles: options.minFiles,
    maxFraction: options.maxFraction,
    enabled: options.enabled,
  });
  return { ...assessment, paths };
}
