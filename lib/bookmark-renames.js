/**
 * Renames are detected by URL, not by file name. A bookmark whose title changes gets a new
 * file name (the slug is part of it), so one edit shows up as "removed at P1, added at P2".
 * When both sides rename the same bookmark differently, that is one conflict, not two bookmarks.
 */

import { bookmarkUrlOf } from './deletion-guard.js';

/** URL → paths, for the given paths (only bookmark files with a URL). */
function pathsByUrl(paths, files, isBookmarkFile) {
  const byUrl = new Map();
  for (const path of paths) {
    if (!isBookmarkFile(path)) continue;
    const url = bookmarkUrlOf(files[path]);
    if (!url) continue;
    byUrl.set(url, [...(byUrl.get(url) || []), path]);
  }
  return byUrl;
}

/**
 * Old path → new path for every bookmark that one side removed at one path and added at another.
 * Only unambiguous pairs count (one removal and one addition with the same URL).
 * @param {string[]} removed - Base paths removed on this side
 * @param {string[]} added - Paths added on this side
 * @param {Object<string, string>} baseFiles - Base content (old path → content)
 * @param {Object<string, string>} files - This side's content (new path → content)
 * @param {(path: string) => boolean} isBookmarkFile
 * @returns {Map<string, string>}
 */
export function findRenames(removed, added, baseFiles, files, isBookmarkFile) {
  const removedByUrl = pathsByUrl(removed, baseFiles, isBookmarkFile);
  const addedByUrl = pathsByUrl(added, files, isBookmarkFile);
  const renames = new Map();
  for (const [url, oldPaths] of removedByUrl) {
    const newPaths = addedByUrl.get(url);
    if (oldPaths.length === 1 && newPaths?.length === 1) renames.set(oldPaths[0], newPaths[0]);
  }
  return renames;
}

/**
 * Pull out renames that conflict: both sides renamed the same bookmark to different paths.
 * Those paths are removed from both diffs so the path-based merge does not act on them again.
 * @returns {{ conflicts: Array<object>, localDiff: object, remoteDiff: object }}
 *   conflict: { path (old path), localPath, remotePath, local, remote } — content null = deleted
 */
export function extractRenameConflicts({ localDiff, remoteDiff, baseFiles, localFiles, remoteFiles, isBookmarkFile }) {
  const localRenames = findRenames(localDiff.removed, Object.keys(localDiff.added), baseFiles, localFiles, isBookmarkFile);
  const remoteRenames = findRenames(remoteDiff.removed, Object.keys(remoteDiff.added), baseFiles, remoteFiles, isBookmarkFile);

  const conflicts = [];
  const dropLocal = new Set();
  const dropRemote = new Set();
  for (const [oldPath, localPath] of localRenames) {
    const remotePath = remoteRenames.get(oldPath);
    if (!remotePath || remotePath === localPath) continue;
    conflicts.push({
      path: oldPath,
      localPath,
      remotePath,
      local: localFiles[localPath] ?? null,
      remote: remoteFiles[remotePath] ?? null,
    });
    dropLocal.add(oldPath).add(localPath);
    dropRemote.add(oldPath).add(remotePath);
  }

  const prune = (diff, drop) => ({
    added: Object.fromEntries(Object.entries(diff.added).filter(([path]) => !drop.has(path))),
    removed: diff.removed.filter((path) => !drop.has(path)),
    modified: Object.fromEntries(Object.entries(diff.modified).filter(([path]) => !drop.has(path))),
  });

  return {
    conflicts,
    localDiff: conflicts.length ? prune(localDiff, dropLocal) : localDiff,
    remoteDiff: conflicts.length ? prune(remoteDiff, dropRemote) : remoteDiff,
  };
}
