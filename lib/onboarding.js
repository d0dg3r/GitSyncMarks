/**
 * Onboarding – check path setup and create minimal bookmark structure.
 * Used when a new user or profile configures GitHub: verify path exists,
 * offer to create if missing, offer to pull if bookmarks exist.
 */

import { GitHubError } from './github-api.js';
import { fetchRemoteFileMap } from './remote-fetch.js';
import { hasBookmarkPayloadFiles } from './sync-settings.js';

const REMOTE_BASELINE_RETRIES = 10;
const REMOTE_BASELINE_DELAY_MS = 500;

/**
 * Establish remote baseline by fetching the latest commit SHA.
 * Retries on 409/5xx until GitHub returns a stable state (404 = empty, 200 = has commits).
 * @param {import('./github-api.js').GitHubAPI} api
 * @returns {Promise<{empty: boolean, commitSha?: string}>}
 */
export async function waitForRemoteBaseline(api) {
  for (let attempt = 0; attempt < REMOTE_BASELINE_RETRIES; attempt++) {
    try {
      const commitSha = await api.getLatestCommitSha();
      return { empty: false, commitSha };
    } catch (err) {
      if (err instanceof GitHubError) {
        if (err.statusCode === 404) {
          return { empty: true };
        }
        const isRetryable = err.statusCode === 409 || (err.statusCode >= 500 && err.statusCode < 600);
        if (isRetryable && err.statusCode === 409 && attempt === REMOTE_BASELINE_RETRIES - 1) {
          return { empty: true };
        }
        if (!isRetryable || attempt === REMOTE_BASELINE_RETRIES - 1) {
          throw err;
        }
      } else {
        throw err;
      }
    }
    await new Promise((r) => setTimeout(r, REMOTE_BASELINE_DELAY_MS));
  }
  return { empty: true };
}

/**
 * Check if the bookmark path exists and whether it has bookmarks.
 * @param {import('./github-api.js').GitHubAPI} api
 * @param {string} basePath
 * @param {{ fetchRemoteFileMapFn?: typeof fetchRemoteFileMap }} [deps]
 * @returns {Promise<{status: 'unreachable'|'empty'|'structureReady'|'hasBookmarks', fileMap?: object, commitSha?: string}>}
 */
export async function checkPathSetup(api, basePath, deps = {}) {
  const normalizedPath = (basePath || 'bookmarks').replace(/\/+$/, '');
  const fetchRemoteFileMapFn = deps.fetchRemoteFileMapFn || fetchRemoteFileMap;
  try {
    const remote = await fetchRemoteFileMapFn(api, normalizedPath, null);
    if (!remote) {
      return { status: 'empty' };
    }
    const { fileMap, commitSha } = remote;
    const paths = Object.keys(fileMap || {});
    if (paths.length === 0) {
      return { status: 'empty' };
    }
    const hasBookmarkFiles = hasBookmarkPayloadFiles(fileMap);
    const hasStructureFiles = paths.some(
      (p) =>
        p === `${normalizedPath}/_index.json` ||
        p === `${normalizedPath}/toolbar/_order.json` ||
        p === `${normalizedPath}/other/_order.json`
    );
    return {
      status: hasBookmarkFiles ? 'hasBookmarks' : (hasStructureFiles ? 'structureReady' : 'empty'),
      fileMap,
      commitSha,
    };
  } catch (err) {
    if (err instanceof GitHubError && (err.statusCode === 404 || err.statusCode === 409)) {
      return { status: 'empty' };
    }
    throw err;
  }
}

/**
 * Validate and normalize the repository base path used for bookmark files.
 * @param {string|null|undefined} basePath
 * @returns {{ valid: boolean, normalizedPath: string, errorKey?: string }}
 */
export function validateSyncBasePath(basePath) {
  const normalizedPath = (basePath || 'bookmarks').trim().replace(/\/+$/, '');
  if (!normalizedPath) {
    return { valid: false, normalizedPath: '', errorKey: 'options_filePathInvalidEmpty' };
  }
  if (normalizedPath.startsWith('/')) {
    return { valid: false, normalizedPath, errorKey: 'options_filePathInvalidAbsolute' };
  }
  if (normalizedPath.endsWith('.json')) {
    return { valid: false, normalizedPath, errorKey: 'options_filePathInvalidJsonFile' };
  }
  return { valid: true, normalizedPath };
}

/**
 * Create the minimal bookmark structure (path -> content).
 * @param {string} basePath
 * @returns {Object<string, string>}
 */
export function createMinimalBookmarkStructure(basePath) {
  const base = (basePath || 'bookmarks').replace(/\/+$/, '');
  const files = {};
  files[`${base}/_index.json`] = JSON.stringify({ version: 2 }, null, 2);
  for (const role of ['toolbar', 'other']) {
    files[`${base}/${role}/_order.json`] = JSON.stringify([], null, 2);
  }
  return files;
}

/**
 * Initialize the remote folder with the minimal structure.
 * @param {import('./github-api.js').GitHubAPI} api
 * @param {string} basePath
 * @returns {Promise<string>} Commit SHA
 */
export async function initializeRemoteFolder(api, basePath) {
  const files = createMinimalBookmarkStructure(basePath);
  const fileChanges = {};
  for (const [path, content] of Object.entries(files)) {
    fileChanges[path] = content;
  }
  return api.atomicCommit('Initialize bookmark structure', fileChanges);
}
