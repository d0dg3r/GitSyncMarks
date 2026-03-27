/**
 * Sync History & Restore
 * Lists commit history, restores bookmarks from past commits,
 * and previews diffs between commits and current state.
 */

import { fileMapToBookmarkTree } from './bookmark-serializer.js';
import { fetchRemoteFileMapAtCommit } from './remote-fetch.js';
import { replaceLocalBookmarks } from './bookmark-replace.js';
import { getMessage } from './i18n.js';
import { getActiveProfileId, getSyncState, setSyncState } from './profile-manager.js';
import { log as debugLog } from './debug-log.js';
import {
  STORAGE_KEYS,
  getSettings,
  isConfigured,
  createApi,
  getLocalFileMap,
  DIFF_IGNORE_SUFFIXES,
  SETTINGS_ENC_PATTERN,
  getRemoteEncryptedSettingsContent,
  applyEncryptedSettings,
} from './sync-settings.js';
import {
  _acquireSyncLock,
  _releaseSyncLock,
  _suppressAutoSyncUntil,
  saveSyncStateFromMaps,
} from './sync-core.js';

// ---- Sync history & restore ----

/**
 * List recent commits that touched the bookmark path.
 * @param {{ perPage?: number }} [options]
 * @returns {Promise<Array<{sha: string, message: string, date: string, author: string}>>}
 */
export async function listSyncHistory({ perPage = 20 } = {}) {
  const settings = await getSettings();
  if (!isConfigured(settings)) return [];
  const api = createApi(settings);
  const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');
  return api.listCommits({ path: basePath, perPage });
}

/**
 * Restore local bookmarks from a specific commit SHA.
 * Fetches the file map at that commit and applies it locally (same as pull).
 * Does NOT rewrite the remote branch — just overwrites local bookmarks.
 * @param {string} commitSha
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function restoreFromCommit(commitSha) {
  if (!_acquireSyncLock()) return { success: false, message: getMessage('sync_alreadyInProgress') };

  try {
    const settings = await getSettings();
    if (!isConfigured(settings)) return { success: false, message: getMessage('sync_notConfigured') };

    const api = createApi(settings);
    const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');
    const profileId = settings.profileId || await getActiveProfileId();

    await debugLog(`restoreFromCommit() sha=${commitSha.substring(0, 7)}`);

    const remote = await fetchRemoteFileMapAtCommit(api, basePath, commitSha);
    if (!remote || Object.keys(remote.fileMap).length === 0) {
      return { success: false, message: getMessage('sync_noBookmarksOnGithub') };
    }

    const remoteSettingsEnc = await getRemoteEncryptedSettingsContent(remote.fileMap, basePath);
    await applyEncryptedSettings(remoteSettingsEnc, settings);

    const roleMap = fileMapToBookmarkTree(remote.fileMap, basePath);
    _suppressAutoSyncUntil(Date.now() + 30000);
    await replaceLocalBookmarks(roleMap, {
      githubReposEnabled: settings.githubReposEnabled,
      githubReposParent: settings.githubReposParent,
      githubReposUsername: settings.githubReposUsername,
      linkwardenSyncEnabled: settings.linkwardenSyncEnabled,
      linkwardenSyncParent: settings.linkwardenSyncParent,
      linkwardenSyncPushToGit: settings.linkwardenSyncPushToGit,
    });

    const freshLocalFiles = await getLocalFileMap(basePath, settings);
    await saveSyncStateFromMaps(profileId, freshLocalFiles, remote.shaMap, remote.commitSha);

    await debugLog(`restoreFromCommit() done — applied ${Object.keys(remote.fileMap).length} files`);
    return { success: true, message: getMessage('sync_pullSuccess') };
  } catch (err) {
    console.error('[GitSyncMarks] Restore error:', err);
    return { success: false, message: getMessage('sync_pullFailed', [err.message]) };
  } finally {
    _releaseSyncLock();
  }
}

/**
 * Get the previous commit SHA stored before the last sync apply.
 * @returns {Promise<string|null>}
 */
export async function getPreviousCommitSha() {
  const profileId = await getActiveProfileId();
  const state = await getSyncState(profileId);
  return state.previousCommitSha || null;
}

/**
 * Filter a file map to only bookmark JSON files (no _order.json, _index.json, generated files).
 */
function filterBookmarkFiles(files) {
  const filtered = {};
  for (const [path, content] of Object.entries(files)) {
    if (!path.endsWith('.json')) continue;
    if (path.endsWith('/_order.json') || path.endsWith('/_index.json')) continue;
    if (DIFF_IGNORE_SUFFIXES.some(suffix => path.endsWith(suffix))) continue;
    if (SETTINGS_ENC_PATTERN.test(path)) continue;
    filtered[path] = content;
  }
  return filtered;
}

function parseBookmarkJson(content, path) {
  try {
    const data = JSON.parse(content);
    return { title: data.title || '', url: data.url || '', path };
  } catch {
    return { title: path.split('/').pop(), url: '', path };
  }
}

/**
 * Preview the diff between a target commit and the current local bookmarks.
 * Returns structured data for the UI to display added/removed/changed bookmarks.
 * @param {string} commitSha
 * @returns {Promise<{success: boolean, summary?: object, added?: object[], removed?: object[], changed?: object[], message?: string}>}
 */
export async function getCommitDiffPreview(commitSha) {
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    return { success: false, message: getMessage('sync_notConfigured') };
  }

  const api = createApi(settings);
  const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');

  const [remote, localFiles] = await Promise.all([
    fetchRemoteFileMapAtCommit(api, basePath, commitSha),
    getLocalFileMap(basePath, settings),
  ]);

  if (!remote || Object.keys(remote.fileMap).length === 0) {
    return { success: false, message: getMessage('sync_noBookmarksOnGithub') };
  }

  const targetBm = filterBookmarkFiles(remote.fileMap);
  const localBm = filterBookmarkFiles(localFiles);

  const added = [];
  const removed = [];
  const changed = [];

  for (const [path, content] of Object.entries(targetBm)) {
    if (!(path in localBm)) {
      added.push(parseBookmarkJson(content, path));
    } else if (localBm[path] !== content) {
      const target = parseBookmarkJson(content, path);
      const local = parseBookmarkJson(localBm[path], path);
      changed.push({
        path,
        title: target.title, url: target.url,
        oldTitle: local.title, oldUrl: local.url,
      });
    }
  }

  for (const [path, content] of Object.entries(localBm)) {
    if (!(path in targetBm)) {
      removed.push(parseBookmarkJson(content, path));
    }
  }

  return {
    success: true,
    summary: { added: added.length, removed: removed.length, changed: changed.length },
    added,
    removed,
    changed,
  };
}
