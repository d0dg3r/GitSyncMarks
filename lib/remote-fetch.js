/**
 * Remote file map fetching – fetches bookmark files from GitHub.
 * Extracted to avoid circular imports (profile-manager needs this without importing sync-engine).
 */

import { GitHubAPI, GitHubError } from './github-api.js';
import { gitTreeToShaMap } from './bookmark-serializer.js';
import { getMessage } from './i18n.js';

/**
 * Parallel blob GETs per batch. Unbounded concurrency triggers GitHub secondary rate limits
 * when many bookmark files exist (history preview, restore, pull).
 * Matches upload batching in GitHubAPI.atomicCommit (issue #51 pattern).
 */
const BLOB_FETCH_CONCURRENCY = 5;

/** @type {Map<string, { at: number, payload: { shaMap: object, fileMap: object } }>} */
const commitFileMapCache = new Map();
const COMMIT_CACHE_MAX_ENTRIES = 4;
const COMMIT_CACHE_TTL_MS = 3 * 60 * 1000;

function commitCacheKey(api, basePath, commitSha) {
  return `${api.owner}\0${api.repo}\0${basePath}\0${commitSha}`;
}

function commitCacheGet(api, basePath, commitSha) {
  const key = commitCacheKey(api, basePath, commitSha);
  const hit = commitFileMapCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > COMMIT_CACHE_TTL_MS) {
    commitFileMapCache.delete(key);
    return null;
  }
  return hit.payload;
}

function commitCacheSet(api, basePath, commitSha, shaMap, fileMap) {
  const key = commitCacheKey(api, basePath, commitSha);
  commitFileMapCache.set(key, { at: Date.now(), payload: { shaMap, fileMap } });
  while (commitFileMapCache.size > COMMIT_CACHE_MAX_ENTRIES) {
    const first = commitFileMapCache.keys().next().value;
    if (first === undefined) break;
    commitFileMapCache.delete(first);
  }
}

/**
 * Fetch blob contents in batches. Reuses baseFiles when blob SHA matches.
 * @param {GitHubAPI} api
 * @param {Array<[string, string]>} pathBlobPairs
 * @param {Object<string, {sha: string, content: string}>|null|undefined} baseFiles
 * @returns {Promise<Object<string, string>>}
 */
async function fetchBlobsBatched(api, pathBlobPairs, baseFiles) {
  const fileMap = {};
  const toFetch = [];

  for (const [path, blobSha] of pathBlobPairs) {
    if (baseFiles && baseFiles[path] && baseFiles[path].sha === blobSha) {
      fileMap[path] = baseFiles[path].content;
    } else {
      toFetch.push([path, blobSha]);
    }
  }

  for (let i = 0; i < toFetch.length; i += BLOB_FETCH_CONCURRENCY) {
    const batch = toFetch.slice(i, i + BLOB_FETCH_CONCURRENCY);
    await Promise.all(
      batch.map(([path, blobSha]) =>
        api.getBlob(blobSha).then((content) => {
          fileMap[path] = content;
        })
      )
    );
  }

  return fileMap;
}

/**
 * Resolve recursive tree entries for a commit (provider-specific fast path optional).
 * @param {import('./github-api.js').GitHubAPI} api
 * @param {string} commitSha
 * @returns {Promise<{ tree: Array<{path: string, type: string, sha: string}>, truncated: boolean }>}
 */
export async function fetchTreeEntriesForCommit(api, commitSha) {
  if (api.providerId === 'gitea') {
    throw new GitHubError('Gitea uses Contents API for remote reads', 422);
  }
  if (typeof api.getRecursiveTreeForCommit === 'function') {
    const direct = await api.getRecursiveTreeForCommit(commitSha);
    if (direct) {
      return { tree: direct.tree, truncated: direct.truncated };
    }
  }
  const treeSha = await api.getCommitTreeSha(commitSha);
  return api.getTree(treeSha);
}

/**
 * Build sha/file maps from git tree or provider-specific Contents API fallback.
 * @param {import('./github-api.js').GitHubAPI} api
 * @param {string} basePath
 * @param {Object<string, {sha: string, content: string}>|null|undefined} baseFiles
 * @param {string} commitSha
 * @returns {Promise<{ shaMap: object, fileMap: object }>}
 */
export async function buildRemoteMaps(api, basePath, baseFiles, commitSha) {
  const loadViaContents = async (primaryErr) => {
    if (typeof api.fetchFileMapViaContents !== 'function') {
      if (primaryErr) throw primaryErr;
      return { shaMap: {}, fileMap: {} };
    }
    try {
      return await api.fetchFileMapViaContents(basePath, commitSha);
    } catch (contentsErr) {
      const primaryMsg = primaryErr?.message || 'tree read unavailable';
      const contentsMsg = contentsErr?.message || 'contents read failed';
      const statusCode =
        contentsErr instanceof GitHubError
          ? contentsErr.statusCode
          : primaryErr instanceof GitHubError
            ? primaryErr.statusCode
            : 422;
      throw new GitHubError(
        `Remote read failed (tree: ${primaryMsg}; contents: ${contentsMsg})`,
        statusCode
      );
    }
  };

  // Gitea/Forgejo: Contents API is reliable for reads; git/trees metadata is often missing.
  if (api.providerId === 'gitea' && typeof api.fetchFileMapViaContents === 'function') {
    return loadViaContents(null);
  }

  try {
    const { tree: treeEntries, truncated } = await fetchTreeEntriesForCommit(api, commitSha);
    if (truncated) {
      throw new GitHubError(getMessage('api_treeTruncated'), 422);
    }
    const shaMap = gitTreeToShaMap(treeEntries, basePath);
    if (Object.keys(shaMap).length === 0) {
      return loadViaContents(new GitHubError('Git tree listing empty under base path', 422));
    }
    const fileMap = await fetchBlobsBatched(api, Object.entries(shaMap), baseFiles);
    return { shaMap, fileMap };
  } catch (err) {
    return loadViaContents(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Fetch the remote file map from GitHub.
 * @param {GitHubAPI} api
 * @param {string} basePath
 * @param {Object<string, {sha: string, content: string}>|null} baseFiles
 * @returns {Promise<{shaMap: object, fileMap: object, commitSha: string}|null>}
 */
export async function fetchRemoteFileMap(api, basePath, baseFiles) {
  let commitSha;
  try {
    commitSha = await api.getLatestCommitSha();
  } catch (err) {
    if (err instanceof GitHubError && (err.statusCode === 404 || err.statusCode === 409)) {
      return null;
    }
    throw err;
  }

  const { shaMap, fileMap } = await buildRemoteMaps(api, basePath, baseFiles, commitSha);

  return { shaMap, fileMap, commitSha };
}

/**
 * Fetch the remote file map at a specific commit SHA (for history restore / preview).
 * Results are cached briefly to avoid duplicate blob traffic when preview and restore
 * target the same commit.
 * @param {GitHubAPI} api
 * @param {string} basePath
 * @param {string} commitSha
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Promise<{shaMap: object, fileMap: object, commitSha: string}>}
 */
export async function fetchRemoteFileMapAtCommit(api, basePath, commitSha, options = {}) {
  if (!options.skipCache) {
    const cached = commitCacheGet(api, basePath, commitSha);
    if (cached) {
      return { shaMap: cached.shaMap, fileMap: cached.fileMap, commitSha };
    }
  }

  const { shaMap, fileMap } = await buildRemoteMaps(api, basePath, null, commitSha);

  if (!options.skipCache) {
    commitCacheSet(api, basePath, commitSha, shaMap, fileMap);
  }

  return { shaMap, fileMap, commitSha };
}
