/**
 * Git commit helpers for bookmark file changes.
 * Leaf module (no sync-core / mirror-push imports) so MV3 service workers can load it statically.
 */

import { GitHubError } from './github-api.js';
import { usesContentsApiWriteFallback } from './git-provider-common.js';
import { log as debugLog } from './debug-log.js';

/**
 * @typedef {{ phase?: string, current: number, total: number }} CommitProgress
 * @typedef {(progress: CommitProgress) => void} CommitProgressCallback
 */

async function commitViaContentsApi(api, fileChanges, commitMsg, onProgress) {
  let lastCommitSha = null;
  const entries = Object.entries(fileChanges).sort(([a], [b]) => a.localeCompare(b));
  const total = entries.length;
  let current = 0;
  onProgress?.({ phase: 'pushing', current: 0, total });
  for (const [path, content] of entries) {
    // One file per atomicCommit so deletes (content === null) are applied on Gitea fallback too.
    const commitSha = await api.atomicCommit(commitMsg, { [path]: content });
    if (commitSha) lastCommitSha = commitSha;
    current += 1;
    onProgress?.({ phase: 'pushing', current, total });
  }
  if (!lastCommitSha && typeof api.getLatestCommitSha === 'function') {
    try {
      lastCommitSha = await api.getLatestCommitSha();
    } catch {
      /* optional */
    }
  }
  return lastCommitSha;
}

const GITEA_WRITE_FALLBACK_STATUSES = new Set([401, 404, 405, 422, 501]);

/**
 * Commit bookmark file changes; Gitea-family providers try git-data writes in atomicCommit with an extra per-file Contents fallback here if that still fails.
 * @param {import('./providers/github-api.js').GitHubAPI} api
 * @param {string} message
 * @param {Object<string, string|null>} fileChanges
 * @param {CommitProgressCallback} [onProgress]
 * @returns {Promise<string>}
 */
export async function commitBookmarkChanges(api, message, fileChanges, onProgress) {
  const total = Object.keys(fileChanges).length;
  const report = onProgress
    ? (current) => onProgress({ phase: 'pushing', current, total })
    : null;
  try {
    report?.(0);
    const sha = await api.atomicCommit(message, fileChanges, report);
    report?.(total);
    return sha;
  } catch (err) {
    const isModifiedConflict = /modified in the meantime/i.test(String(err?.message || ''));
    const isGiteaFallback =
      usesContentsApiWriteFallback(api.providerId) &&
      err instanceof GitHubError &&
      (GITEA_WRITE_FALLBACK_STATUSES.has(err.statusCode) || isModifiedConflict);
    if (!isGiteaFallback) throw err;
    const detail =
      err instanceof GitHubError
        ? `HTTP ${err.statusCode}: ${err.message}`
        : String(err?.message || err);
    console.warn(
      `[GitSyncMarks] Gitea atomic commit failed (${detail}); ` +
        `retrying via Contents API one file at a time (${total} file(s)).`
    );
    debugLog(
      `[gitea-write] atomicCommit threw (${detail}); per-file Contents fallback, ${total} file(s)`
    ).catch(() => {});
    const commitSha = await commitViaContentsApi(api, fileChanges, message, onProgress);
    if (!commitSha) throw err;
    return commitSha;
  }
}
