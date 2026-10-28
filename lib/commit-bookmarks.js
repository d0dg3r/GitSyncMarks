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

/**
 * True when a write failed because the remote has no branch/commits yet.
 * @param {unknown} err
 * @returns {boolean}
 */
export function isEmptyRepoWriteError(err) {
  const status = err instanceof GitHubError ? err.statusCode : Number(err?.statusCode) || 0;
  const msg = String(err?.message || '');
  return (
    status === 409 ||
    status === 422 ||
    /empty|no commits|no branch|initial branch|api_repoEmpty|api_emptyRepoInitFailed/i.test(msg)
  );
}

/**
 * Per-file Contents API writes (createOrUpdateFile). Used for empty GitHub repos where git-data
 * createTree stays 409; also a safe path when every path is a new file (sha null).
 * @param {import('./providers/github-api.js').GitHubAPI} api
 * @param {Object<string, string|null>} fileChanges
 * @param {string} commitMsg
 * @param {CommitProgressCallback} [onProgress]
 * @returns {Promise<string>}
 */
async function commitViaCreateOrUpdateFile(api, fileChanges, commitMsg, onProgress) {
  let lastCommitSha = null;
  const entries = Object.entries(fileChanges)
    .filter(([, content]) => content !== null)
    .sort(([a], [b]) => a.localeCompare(b));
  const total = entries.length;
  let current = 0;
  onProgress?.({ phase: 'pushing', current: 0, total });
  for (const [path, content] of entries) {
    const result = await api.createOrUpdateFile(path, content, commitMsg, null);
    if (result?.commitSha) lastCommitSha = result.commitSha;
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

/**
 * Gitea-family fallback: one atomicCommit per file (provider then uses Contents internally).
 * @param {import('./providers/github-api.js').GitHubAPI} api
 * @param {Object<string, string|null>} fileChanges
 * @param {string} commitMsg
 * @param {CommitProgressCallback} [onProgress]
 * @returns {Promise<string>}
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
 * Empty GitHub (and similar) repos fall back to Contents createOrUpdateFile after empty-repo 409/422.
 * @param {import('./providers/github-api.js').GitHubAPI} api
 * @param {string} message
 * @param {Object<string, string|null>} fileChanges
 * @param {CommitProgressCallback} [onProgress]
 * @param {{ expectedParentSha?: string }} [commitOptions] - Head the changes were planned against (GitHub guard)
 * @returns {Promise<string>}
 */
export async function commitBookmarkChanges(api, message, fileChanges, onProgress, commitOptions = {}) {
  const total = Object.keys(fileChanges).length;
  const report = onProgress
    ? (current) => onProgress({ phase: 'pushing', current, total })
    : null;
  try {
    report?.(0);
    const sha = await api.atomicCommit(message, fileChanges, report, commitOptions);
    report?.(total);
    return sha;
  } catch (err) {
    const isModifiedConflict = /modified in the meantime/i.test(String(err?.message || ''));
    const isGiteaFallback =
      usesContentsApiWriteFallback(api.providerId) &&
      err instanceof GitHubError &&
      (GITEA_WRITE_FALLBACK_STATUSES.has(err.statusCode) || isModifiedConflict);
    const isEmptyRepoFallback =
      !isGiteaFallback &&
      typeof api.createOrUpdateFile === 'function' &&
      isEmptyRepoWriteError(err);

    if (!isGiteaFallback && !isEmptyRepoFallback) throw err;

    const detail =
      err instanceof GitHubError
        ? `HTTP ${err.statusCode}: ${err.message}`
        : String(err?.message || err);
    const label = isEmptyRepoFallback ? 'empty-repo' : 'gitea-write';
    console.warn(
      `[GitSyncMarks] ${label} atomic commit failed (${detail}); ` +
        `retrying via Contents API one file at a time (${total} file(s)).`
    );
    debugLog(
      `[${label}] atomicCommit threw (${detail}); per-file Contents fallback, ${total} file(s)`
    ).catch(() => {});

    const commitSha = isEmptyRepoFallback
      ? await commitViaCreateOrUpdateFile(api, fileChanges, message, onProgress)
      : await commitViaContentsApi(api, fileChanges, message, onProgress);
    if (!commitSha) throw err;
    return commitSha;
  }
}
