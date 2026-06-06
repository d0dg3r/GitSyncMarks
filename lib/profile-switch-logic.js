/**
 * Profile switch helpers — diff push, target cache/HEAD resolution (testable, no circular imports).
 */

import { computeDiff, filterForDiff } from './sync-diff.js';

/**
 * Build file changes for push-before-switch from local tree vs stored sync base.
 * @param {Object<string, string>} localFiles
 * @param {Object<string, { sha?: string|null, content: string }>|null|undefined} lastSyncFiles
 * @returns {{ fileChanges: Object<string, string|null>, hasChanges: boolean }}
 */
export function buildSwitchPushChanges(localFiles, lastSyncFiles) {
  const baseContentMap = {};
  for (const [path, info] of Object.entries(lastSyncFiles || {})) {
    baseContentMap[path] = info.content;
  }

  const diff = computeDiff(filterForDiff(baseContentMap), filterForDiff(localFiles));
  const fileChanges = {};
  for (const [path, content] of Object.entries(diff.added)) fileChanges[path] = content;
  for (const [path, content] of Object.entries(diff.modified)) fileChanges[path] = content;
  for (const path of diff.removed) fileChanges[path] = null;

  const hasChanges =
    Object.keys(diff.added).length > 0 ||
    Object.keys(diff.modified).length > 0 ||
    diff.removed.length > 0;

  return { fileChanges, hasChanges };
}

/**
 * Merge browser file map into sync state entries, preserving blob SHAs where possible.
 * Paths removed locally stay in the base until a successful remote push (three-way diff
 * needs them as `localDiff.removed`; dropping them early causes path-8 pull to restore).
 * @param {Object<string, string>} localFiles
 * @param {Object<string, { sha?: string|null, content: string }>|null|undefined} lastSyncFiles
 * @returns {Object<string, { sha: string|null, content: string }>}
 */
export function mergeLocalIntoSyncFiles(localFiles, lastSyncFiles) {
  const syncFiles = {};
  for (const [path, info] of Object.entries(lastSyncFiles || {})) {
    if (path in localFiles) {
      syncFiles[path] = {
        sha: info.sha ?? null,
        content: localFiles[path],
      };
    } else {
      syncFiles[path] = {
        sha: info.sha ?? null,
        content: info.content,
      };
    }
  }
  for (const [path, content] of Object.entries(localFiles)) {
    if (!(path in syncFiles)) {
      syncFiles[path] = { sha: null, content };
    }
  }
  return syncFiles;
}

/**
 * Build push payload when sync base is stale (matches local) but remote still has deleted files.
 * Only used when the user edited bookmarks locally since the last successful sync.
 * @param {object} remoteDiff - from computeDiff(base, remote)
 * @param {Object<string, string>} localFiles
 * @param {Object<string, string>} remoteFiles
 * @param {(path: string) => boolean} isIgnoredPath
 * @returns {{ fileChanges: Object<string, string|null>, shouldPush: boolean }}
 */
export function buildStaleBasePushChanges(remoteDiff, localFiles, remoteFiles, isIgnoredPath) {
  const staleDeletes = Object.keys(remoteDiff.added).filter(
    (p) => !(p in localFiles) && !isIgnoredPath(p)
  );
  if (staleDeletes.length === 0) {
    return { fileChanges: {}, shouldPush: false };
  }

  const fileChanges = {};
  for (const p of staleDeletes) fileChanges[p] = null;

  const liveDiff = computeDiff(filterForDiff(remoteFiles), filterForDiff(localFiles));
  for (const [p, content] of Object.entries(liveDiff.added)) fileChanges[p] = content;
  for (const [p, content] of Object.entries(liveDiff.modified)) fileChanges[p] = content;

  return { fileChanges, shouldPush: true };
}

/**
 * @param {object} targetSettings
 * @returns {boolean}
 */
function isProfileConfigured(targetSettings) {
  return !!(
    targetSettings?.githubToken &&
    targetSettings.repoOwner &&
    targetSettings.repoName
  );
}

/**
 * @param {object} targetSettings
 * @returns {object}
 */
function createProviderOptions(targetSettings) {
  return {
    provider: targetSettings.gitProvider || 'github',
    token: targetSettings.githubToken,
    owner: targetSettings.repoOwner,
    repo: targetSettings.repoName,
    branch: targetSettings.branch,
    serverUrl: targetSettings.serverUrl || '',
  };
}

/**
 * Resolve target profile bookmark file map for switch (cache, HEAD check, delta pull).
 * @param {object} params
 * @param {object} params.targetState
 * @param {object|null} params.targetSettings
 * @param {string} params.targetBasePath
 * @param {Function} params.createGitProvider
 * @param {Function} params.fetchRemoteFileMap
 * @param {Function} [params.log]
 * @returns {Promise<{ fileMap: Object<string, string>, syncStateUpdate?: object }>}
 */
export async function loadTargetFileMapForSwitch({
  targetState,
  targetSettings,
  targetBasePath,
  createGitProvider,
  fetchRemoteFileMap,
  log,
}) {
  const hasCache =
    targetState.lastSyncFiles && Object.keys(targetState.lastSyncFiles).length > 0;

  if (hasCache) {
    const fileMap = {};
    for (const [path, info] of Object.entries(targetState.lastSyncFiles)) {
      fileMap[path] = info.content;
    }

    if (targetState.lastCommitSha && isProfileConfigured(targetSettings)) {
      try {
        const api = createGitProvider(createProviderOptions(targetSettings));
        const headSha = await api.getLatestCommitSha();
        if (headSha === targetState.lastCommitSha) {
          return { fileMap };
        }

        const remote = await fetchRemoteFileMap(api, targetBasePath, targetState.lastSyncFiles);
        if (remote && Object.keys(remote.fileMap).length > 0) {
          return {
            fileMap: remote.fileMap,
            syncStateUpdate: {
              lastSyncFiles: Object.fromEntries(
                Object.entries(remote.fileMap).map(([p, c]) => [
                  p,
                  { sha: remote.shaMap?.[p] || null, content: c },
                ])
              ),
              lastCommitSha: remote.commitSha,
            },
          };
        }
        return { fileMap };
      } catch (err) {
        log?.(`HEAD check failed, using cache: ${err?.message || err}`);
        return { fileMap };
      }
    }

    return { fileMap };
  }

  if (isProfileConfigured(targetSettings)) {
    try {
      const api = createGitProvider(createProviderOptions(targetSettings));
      const remote = await fetchRemoteFileMap(api, targetBasePath, null);
      if (remote && Object.keys(remote.fileMap).length > 0) {
        return {
          fileMap: remote.fileMap,
          syncStateUpdate: {
            lastSyncFiles: Object.fromEntries(
              Object.entries(remote.fileMap).map(([p, c]) => [
                p,
                { sha: remote.shaMap?.[p] || null, content: c },
              ])
            ),
            lastCommitSha: remote.commitSha,
          },
        };
      }
    } catch (err) {
      log?.(`Pull for target profile failed: ${err?.message || err}`);
    }
  }

  return { fileMap: {} };
}
