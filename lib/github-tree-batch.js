/**
 * Split atomic-commit file changes into batches for POST /git/trees.
 * Upload entries use `content` so GitHub creates blobs server-side (no per-file POST /git/blobs).
 *
 * Used by {@link GitHubAPI#atomicCommit} and onboarding diagnostics.
 */

/** @typedef {{ path: string, content: string }} UploadEntry */

/** Max tree entries per POST /git/trees (stay under payload / server limits). */
export const ATOMIC_COMMIT_TREE_BATCH_MAX_ENTRIES = 400;

/** Rough UTF-8 byte budget per layered tree request (GitHub tree bodies are capped ~40 MiB). */
export const ATOMIC_COMMIT_TREE_BATCH_MAX_BYTES = 28 * 1024 * 1024;

/**
 * @param {string[]} deletions
 * @param {UploadEntry[]} uploads
 * @returns {Array<Array<{path: string, mode: string, type: string, sha?: null, content?: string}>>}
 */
export function chunkAtomicCommitTreeBatches(deletions, uploads) {
  const encoder = new TextEncoder();
  /** @type {Array<Array<{path: string, mode: string, type: string, sha?: null, content?: string}>>} */
  const batches = [];
  /** @type {Array<{path: string, mode: string, type: string, sha?: null, content?: string}>} */
  let batch = [];
  let approxBytes = 0;

  const flush = () => {
    if (batch.length) {
      batches.push(batch);
      batch = [];
      approxBytes = 0;
    }
  };

  const approxItemBytes = (item) => {
    let n = 64 + item.path.length * 2;
    if (item.content !== undefined) {
      n += encoder.encode(item.content).length;
    }
    return n;
  };

  const push = (item) => {
    const ib = approxItemBytes(item);
    if (batch.length > 0 &&
        (batch.length >= ATOMIC_COMMIT_TREE_BATCH_MAX_ENTRIES ||
          approxBytes + ib > ATOMIC_COMMIT_TREE_BATCH_MAX_BYTES)) {
      flush();
    }
    batch.push(item);
    approxBytes += ib;
  };

  for (const path of deletions) {
    push({ path, mode: '100644', type: 'blob', sha: null });
  }
  for (const { path, content } of uploads) {
    push({ path, mode: '100644', type: 'blob', content });
  }
  flush();
  return batches;
}
