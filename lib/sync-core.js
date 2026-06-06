/**
 * Sync Core – Push, Pull, Sync with Three-Way Merge
 * Core sync operations, diff computation, merge logic, and debounced auto-sync.
 */

import { GitHubError } from './github-api.js';
import { usesContentsApiWriteFallback } from './git-provider-common.js';
import {
  fileMapToBookmarkTree,
  orderEntryKey,
} from './bookmark-serializer.js';
import { fetchRemoteFileMap, buildRemoteMaps } from './remote-fetch.js';
import { replaceLocalBookmarks } from './bookmark-replace.js';
import { decryptToken } from './crypto.js';
import { LinkwardenAPI } from './linkwarden-api.js';
import { getMessage } from './i18n.js';
import { getActiveProfileId, getSyncState, setSyncState } from './profile-manager.js';
import { log as debugLog } from './debug-log.js';
import { computeDiff, contentEquals } from './sync-diff.js';
export { computeDiff, contentEquals } from './sync-diff.js';
import { buildStaleBasePushChanges } from './profile-switch-logic.js';
import {
  STORAGE_KEYS,
  getDeviceId,
  getSettings,
  isConfigured,
  createApi,
  getLocalFileMap,
  filterForDiff,
  isGeneratedOrSettingsPath,
  addGeneratedFiles,
  hasBookmarkPayloadFiles,
  countBookmarkPayloadFiles,
  buildEncryptedSettings,
  applyEncryptedSettings,
  getRemoteEncryptedSettingsContent,
  applyConnectionOverride,
  getSettingsForProfile,
} from './sync-settings.js';

let isSyncing = false;
let suppressAutoSyncUntil = 0;
let debounceTimer = null;
let maxWaitTimer = null;
let syncActivityListener = null;

/**
 * Register a listener notified when sync activity starts (true) or ends (false).
 * The background uses this to keep the event page / service worker alive for the
 * full duration of long operations (issue #143).
 * @param {((active: boolean) => void) | null} listener
 */
export function setSyncActivityListener(listener) {
  syncActivityListener = typeof listener === 'function' ? listener : null;
}

/**
 * Single entry point for toggling the sync lock so activity transitions are
 * reported exactly once (idempotent for nested push/pull-within-sync calls).
 * @param {boolean} value
 */
function setSyncing(value) {
  const next = Boolean(value);
  if (next === isSyncing) return;
  isSyncing = next;
  if (syncActivityListener) {
    try {
      syncActivityListener(next);
    } catch {
      /* listener must never break the sync flow */
    }
  }
}

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

async function checkStorageQuota() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local?.getBytesInUse) {
      const used = await chrome.storage.local.getBytesInUse(null);
      const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10 MB default
      const pct = Math.round((used / quota) * 100);
      if (pct >= 80) {
        await debugLog(`[sync] Storage quota warning: ${pct}% used (${used} / ${quota} bytes)`);
      }
    }
  } catch (e) {
    // Non-fatal — quota check is best-effort
  }
}

async function mirrorToLinkwarden(toPushMap) {
  const globals = await chrome.storage.sync.get({
    linkwardenToken: '',
    linkwardenEnabled: false,
    linkwardenAutoSave: false,
    linkwardenUrl: '',
    linkwardenDefaultCollectionId: '',
    linkwardenDefaultTags: '',
  });

  if (!globals.linkwardenEnabled) return;
  if (!globals.linkwardenAutoSave) return;
  if (!globals.linkwardenUrl || !globals.linkwardenToken) return;

  try {
    const plainToken = await decryptToken(globals.linkwardenToken);
    const api = new LinkwardenAPI(globals.linkwardenUrl, plainToken);
    const defaultCollection = globals.linkwardenDefaultCollectionId;
    const defaultTagsInput = globals.linkwardenDefaultTags || '';
    const tags = defaultTagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0).map(name => ({ name }));

    for (const [path, content] of Object.entries(toPushMap)) {
      if (!path.endsWith('.json') || path.endsWith('_order.json') || path.endsWith('_index.json')) continue;
      if (!content) continue; // Deleted

      try {
        const bookmark = JSON.parse(content);
        if (bookmark.url) {
          await debugLog(`[Linkwarden] Auto-saving: ${bookmark.url} (${bookmark.title})`);
          await api.saveLink({
            url: bookmark.url,
            name: bookmark.title || bookmark.url,
            collectionId: defaultCollection ? parseInt(defaultCollection, 10) : undefined,
            tags: tags.length > 0 ? tags : undefined
          });
        }
      } catch (parseErr) {
        // Ignored. Not a valid bookmark JSON or duplicate error from API.
      }
    }
  } catch (err) {
    await debugLog(`[Linkwarden] Failed to auto-save to Linkwarden: ${err.message}`);
  }
}

/**
 * Three-way merge for _order.json content.
 *
 * _order.json is an array of entries where each entry is either a bookmark
 * filename (string) or a folder descriptor ({ dir, title }).  When two devices
 * concurrently add/remove different bookmarks in the same folder, both produce
 * different _order.json content.  Instead of treating this as a conflict, we
 * merge the arrays: keep local order as the base, apply remote additions at the
 * end, and honour removals from both sides.
 *
 * @param {string|null} baseContent  - Base _order.json (null if newly created)
 * @param {string}      localContent - Local _order.json
 * @param {string}      remoteContent - Remote _order.json
 * @returns {string|null} Merged JSON string, or null if merge is not possible.
 */
export function mergeOrderJson(baseContent, localContent, remoteContent) {
  let base, local, remote;
  try {
    base = baseContent ? JSON.parse(baseContent) : [];
    local = JSON.parse(localContent);
    remote = JSON.parse(remoteContent);
  } catch {
    return null; // Malformed JSON → fall through to conflict
  }

  if (!Array.isArray(base) || !Array.isArray(local) || !Array.isArray(remote)) {
    return null;
  }

  const baseKeys = new Set(base.map(orderEntryKey));
  const localKeys = new Set(local.map(orderEntryKey));
  const remoteKeys = new Set(remote.map(orderEntryKey));

  // Determine what each side removed relative to base
  const remoteRemovedKeys = new Set(
    base.filter(e => !remoteKeys.has(orderEntryKey(e))).map(orderEntryKey)
  );
  const localRemovedKeys = new Set(
    base.filter(e => !localKeys.has(orderEntryKey(e))).map(orderEntryKey)
  );

  // Start with local order — remove entries that remote deleted
  const merged = local.filter(e => !remoteRemovedKeys.has(orderEntryKey(e)));

  // Append entries that remote added (entries in remote but not in base)
  // Skip any that are already present in merged (e.g. both sides added the same entry)
  const mergedKeys = new Set(merged.map(orderEntryKey));
  for (const entry of remote) {
    const key = orderEntryKey(entry);
    if (!baseKeys.has(key) && !mergedKeys.has(key) && !localRemovedKeys.has(key)) {
      merged.push(entry);
      mergedKeys.add(key);
    }
  }

  // Stable dedupe: if local itself contained duplicates, collapse them now
  const deduped = [];
  const finalKeys = new Set();
  for (const entry of merged) {
    const key = orderEntryKey(entry);
    if (!finalKeys.has(key)) {
      deduped.push(entry);
      finalKeys.add(key);
    }
  }

  return JSON.stringify(deduped, null, 2);
}

/**
 * Merge two diffs (local and remote) into a set of actions.
 * Implements the three-way merge rules from the plan.
 *
 * For _order.json files that both sides modified, a content-level merge is
 * attempted (combining additions/removals from both sides) instead of
 * immediately treating the change as a conflict.
 *
 * @param {object} localDiff - { added, removed, modified }
 * @param {object} remoteDiff - { added, removed, modified }
 * @param {Object<string, string>} localFiles - Full local file map
 * @param {Object<string, string>} remoteFiles - Full remote file map
 * @param {Object<string, string>} [baseFiles={}] - Base file map (for _order.json merging)
 * @returns {{
 *   toPush: Object<string, string|null>,
 *   toApplyLocal: Object<string, string|null>,
 *   conflicts: Array<{path: string, local: string|null, remote: string|null}>
 * }}
 */
export function mergeDiffs(localDiff, remoteDiff, localFiles, remoteFiles, baseFiles = {}) {
  const toPush = {};      // path → content (or null for delete) — changes to push to GitHub
  const toApplyLocal = {}; // path → content (or null for delete) — changes to apply locally
  const conflicts = [];

  // All paths that were changed on either side
  const allPaths = new Set([
    ...Object.keys(localDiff.added),
    ...localDiff.removed,
    ...Object.keys(localDiff.modified),
    ...Object.keys(remoteDiff.added),
    ...remoteDiff.removed,
    ...Object.keys(remoteDiff.modified),
  ]);

  for (const path of allPaths) {
    const localAdded = path in localDiff.added;
    const localRemoved = localDiff.removed.includes(path);
    const localModified = path in localDiff.modified;
    const remoteAdded = path in remoteDiff.added;
    const remoteRemoved = remoteDiff.removed.includes(path);
    const remoteModified = path in remoteDiff.modified;

    const localChanged = localAdded || localRemoved || localModified;
    const remoteChanged = remoteAdded || remoteRemoved || remoteModified;

    if (localChanged && !remoteChanged) {
      // Only local change → push to remote
      if (localRemoved) {
        toPush[path] = null;
      } else {
        toPush[path] = localFiles[path];
      }
    } else if (!localChanged && remoteChanged) {
      // Only remote change → apply locally
      if (remoteRemoved) {
        toApplyLocal[path] = null;
      } else {
        toApplyLocal[path] = remoteFiles[path];
      }
    } else if (localChanged && remoteChanged) {
      // Both changed — check if same change
      const localContent = localRemoved ? null : (localFiles[path] || null);
      const remoteContent = remoteRemoved ? null : (remoteFiles[path] || null);

      if (contentEquals(localContent, remoteContent)) {
        // Same change on both sides (semantically) → no conflict, no action needed
        continue;
      }

      // Attempt content-level merge for _order.json files
      if (path.endsWith('/_order.json') && localContent !== null && remoteContent !== null) {
        const baseContent = baseFiles[path] || null;
        const merged = mergeOrderJson(baseContent, localContent, remoteContent);
        if (merged !== null) {
          // Successfully merged — push merged version and apply locally
          toPush[path] = merged;
          toApplyLocal[path] = merged;
          continue;
        }
        // mergeOrderJson returned null → fall through to conflict
      }

      if (localAdded && remoteAdded) {
        // Both added different files at same path → conflict
        conflicts.push({ path, local: localContent, remote: remoteContent });
      } else if (localRemoved && remoteRemoved) {
        // Both deleted → nothing to do
        continue;
      } else {
        // One modified/added + other modified/removed → true conflict
        conflicts.push({ path, local: localContent, remote: remoteContent });
      }
    }
  }

  return { toPush, toApplyLocal, conflicts };
}

async function invokePushToMirrors(profileId, fileMap, commitSha, commitMessage) {
  try {
    const { pushToMirrors } = await import('./mirror-push.js');
    await pushToMirrors(profileId, fileMap, commitSha, commitMessage);
  } catch (err) {
    console.warn('[GitSyncMarks] Mirror push failed:', err);
    await debugLog(`[mirror] push failed: ${err.message}`);
  }
}

/**
 * Remote bookmark paths present on the server but absent from the canonical local map.
 * @param {Object<string, string>} localFiles
 * @param {Object<string, string>} remoteFileMap
 * @param {string} basePath
 * @returns {string[]}
 */
export function listRemoteOrphanPaths(localFiles, remoteFileMap, basePath) {
  const base = String(basePath || 'bookmarks').replace(/\/+$/, '');
  const prefix = `${base}/`;
  const orphans = [];
  for (const path of Object.keys(remoteFileMap || {})) {
    if (path.startsWith(prefix) && !(path in localFiles) && !isGeneratedOrSettingsPath(path)) {
      orphans.push(path);
    }
  }
  return orphans.sort();
}

/**
 * @param {string[]} orphanPaths
 * @param {string} basePath
 * @returns {{ orphanFileCount: number, orphanFolderCount: number, sampleFolders: string[] }}
 */
export function summarizeOrphanPaths(orphanPaths, basePath) {
  const base = String(basePath || 'bookmarks').replace(/\/+$/, '');
  const folders = new Set();
  for (const path of orphanPaths) {
    const rel = path.startsWith(`${base}/`) ? path.slice(base.length + 1) : path;
    const parts = rel.split('/').filter(Boolean);
    if (parts.length > 1) {
      folders.add(parts.slice(0, -1).join('/'));
    } else if (parts.length === 1) {
      folders.add(parts[0]);
    }
  }
  return {
    orphanFileCount: orphanPaths.length,
    orphanFolderCount: folders.size,
    sampleFolders: [...folders].sort().slice(0, 8),
  };
}

/**
 * Canonical bookmark file map for orphan cleanup (browser if active, else last sync cache).
 * @param {string} profileId
 * @param {object} settings
 * @returns {Promise<Object<string, string>>}
 */
async function getCanonicalFileMapForProfile(profileId, settings) {
  const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');
  const activeId = await getActiveProfileId();
  if (profileId === activeId) {
    return getLocalFileMap(basePath, settings);
  }
  const state = await getSyncState(profileId);
  if (!state.lastSyncFiles || Object.keys(state.lastSyncFiles).length === 0) {
    throw new Error(getMessage('cleanOrphans_noLocalBaseline'));
  }
  const fileMap = {};
  for (const [path, info] of Object.entries(state.lastSyncFiles)) {
    fileMap[path] = info.content;
  }
  return fileMap;
}

/**
 * Preview remote files/folders that would be removed by cleanRemoteOrphans().
 * @param {string} [profileId] - Defaults to active profile
 * @returns {Promise<object>}
 */
export async function previewRemoteOrphans(profileId) {
  const id = profileId || await getActiveProfileId();
  const settings = await getSettingsForProfile(id);
  if (!settings || !isConfigured(settings)) {
    return { success: false, message: getMessage('sync_notConfigured') };
  }

  const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');
  let localFiles;
  try {
    localFiles = await getCanonicalFileMapForProfile(id, settings);
  } catch (err) {
    return { success: false, message: err.message };
  }

  const api = createApi(settings);
  let remote;
  try {
    remote = await fetchRemoteFileMap(api, basePath, null);
  } catch (err) {
    return { success: false, message: getMessage('cleanOrphans_remoteFetchFailed', [err.message]) };
  }

  const orphanPaths = listRemoteOrphanPaths(localFiles, remote?.fileMap || {}, basePath);
  const summary = summarizeOrphanPaths(orphanPaths, basePath);

  return {
    success: true,
    profileId: id,
    localFileCount: Object.keys(localFiles).length,
    remoteFileCount: Object.keys(remote?.fileMap || {}).length,
    ...summary,
  };
}

/**
 * Delete remote bookmark files not present in the canonical local map (replace push).
 * @param {string} [profileId] - Defaults to active profile
 * @returns {Promise<object>}
 */
export async function cleanRemoteOrphans(profileId) {
  const preview = await previewRemoteOrphans(profileId);
  if (!preview.success) return preview;
  if (preview.orphanFileCount === 0) {
    return {
      success: true,
      message: getMessage('cleanOrphans_none'),
      orphanFileCount: 0,
      orphanFolderCount: 0,
    };
  }

  const id = preview.profileId || profileId || await getActiveProfileId();
  const settings = await getSettingsForProfile(id);
  const localFiles = await getCanonicalFileMapForProfile(id, settings);

  const pushResult = await pushForProfile(id, localFiles, {
    replaceRemote: true,
    message: getMessage('cleanOrphans_commitMessage'),
  });

  if (!pushResult.success) return pushResult;

  return {
    ...pushResult,
    message: getMessage('cleanOrphans_success', [
      String(preview.orphanFileCount),
      String(preview.orphanFolderCount),
    ]),
    orphanFileCount: preview.orphanFileCount,
    orphanFolderCount: preview.orphanFolderCount,
  };
}

/**
 * Push a file map to a specific profile's primary remote (for profile transfer).
 * @param {string} profileId
 * @param {Object<string, string>} fileMap
 * @param {{ replaceRemote?: boolean, message?: string, onProgress?: CommitProgressCallback }} [options]
 * @returns {Promise<{ success: boolean, message: string, commitSha?: string|null }>}
 */
export async function pushForProfile(profileId, fileMap, options = {}) {
  const { replaceRemote = true, message, onProgress } = options;
  if (isSyncing) {
    return { success: false, message: getMessage('sync_alreadyInProgress'), alreadyInProgress: true };
  }
  setSyncing(true);
  try {
    const settings = await getSettingsForProfile(profileId);
    if (!settings || !isConfigured(settings)) {
      return { success: false, message: getMessage('sync_notConfigured') };
    }

    const api = createApi(settings);
    const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');

    onProgress?.({ phase: 'fetching', current: 0, total: 0 });

    let remote = null;
    try {
      remote = await fetchRemoteFileMap(api, basePath, null);
    } catch (err) {
      console.warn('[GitSyncMarks] pushForProfile: could not fetch remote:', err);
    }

    const fileChanges = {};
    for (const [path, content] of Object.entries(fileMap)) {
      if (!remote || !remote.fileMap[path] || remote.fileMap[path] !== content) {
        fileChanges[path] = content;
      }
    }
    if (replaceRemote && remote) {
      for (const path of Object.keys(remote.fileMap)) {
        if (path.startsWith(`${basePath}/`) && !(path in fileMap) && !isGeneratedOrSettingsPath(path)) {
          fileChanges[path] = null;
        }
      }
    }

    if (Object.keys(fileChanges).length === 0) {
      await saveSyncStateFromMaps(profileId, fileMap, remote?.shaMap || {}, remote?.commitSha || null);
      return { success: true, message: getMessage('sync_noChanges'), commitSha: remote?.commitSha || null };
    }

    const changeCount = Object.keys(fileChanges).length;
    onProgress?.({ phase: 'pushing', current: 0, total: changeCount });

    const deviceId = await getDeviceId();
    const commitMsg = message || `Bookmark sync from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
    const newCommitSha = await commitBookmarkChanges(api, commitMsg, fileChanges, onProgress);
    let finalCommitSha = newCommitSha;
    await saveSyncState(profileId, api, basePath, fileMap, newCommitSha);

    if (replaceRemote) {
      try {
        const verifyRemote = await fetchRemoteFileMap(api, basePath, null);
        const orphans = listRemoteOrphanPaths(fileMap, verifyRemote?.fileMap || {}, basePath);
        if (orphans.length > 0) {
          const orphanChanges = Object.fromEntries(orphans.map((path) => [path, null]));
          onProgress?.({ phase: 'pushing', current: 0, total: orphans.length });
          const cleanupSha = await commitBookmarkChanges(
            api,
            `${commitMsg} — remove orphan files`,
            orphanChanges,
            onProgress
          );
          finalCommitSha = cleanupSha || newCommitSha;
          await saveSyncState(profileId, api, basePath, fileMap, finalCommitSha);
        }
      } catch (err) {
        console.warn('[GitSyncMarks] pushForProfile orphan sweep failed:', err);
      }
    }

    await invokePushToMirrors(profileId, fileMap, finalCommitSha, commitMsg);

    return { success: true, message: getMessage('sync_pushSuccess'), commitSha: finalCommitSha };
  } catch (err) {
    console.error('[GitSyncMarks] pushForProfile error:', err);
    await setSyncState(profileId, { lastError: err.message });
    return { success: false, message: getMessage('sync_pushFailed', [err.message]) };
  } finally {
    setSyncing(false);
  }
}

/**
 * Full push: upload all local bookmarks as individual files.
 * Used for initial sync or force-push.
 * @param {{ fromSync?: boolean }} [options] - fromSync: true when called from sync() (skip lock to avoid race)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function push(options = {}) {
  if (!options.fromSync) {
    if (isSyncing) return { success: false, message: getMessage('sync_alreadyInProgress'), alreadyInProgress: true };
    setSyncing(true);
  }

  await debugLog('push() start');

  try {
    const baseSettings = await getSettings();
    const settings = applyConnectionOverride(baseSettings, options.connectionOverride);
    if (!isConfigured(settings)) return { success: false, message: getMessage('sync_notConfigured') };

    const api = createApi(settings);
    const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');
    const localFiles = await getLocalFileMap(basePath, settings);
    const deviceId = await getDeviceId();

    // Get current remote state to determine what to change
    options.onProgress?.({ phase: 'fetching', current: 0, total: 0 });
    let remote;
    try {
      remote = await fetchRemoteFileMap(api, basePath, null);
    } catch (err) {
      console.warn('[GitSyncMarks] Could not fetch remote state for push:', err);
      remote = null;
    }

    // Build file changes: add/update all local files, delete remote files not in local
    const fileChanges = {};
    for (const [path, content] of Object.entries(localFiles)) {
      if (!remote || !remote.fileMap[path] || remote.fileMap[path] !== content) {
        fileChanges[path] = content;
      }
    }
    if (remote) {
      for (const path of Object.keys(remote.fileMap)) {
        if (path.startsWith(basePath + '/') && !(path in localFiles) && !isGeneratedOrSettingsPath(path)) {
          fileChanges[path] = null; // delete
        }
      }
    }

    addGeneratedFiles(fileChanges, localFiles, basePath, settings, 'auto', remote?.fileMap || null);

    const encSettings = await buildEncryptedSettings(settings);
    if (encSettings) {
      fileChanges[`${basePath}/${encSettings.filename}`] = encSettings.content;
    }

    // Linkwarden Auto-Save (Mirroring)
    await mirrorToLinkwarden(fileChanges);

    await debugLog(`push() fileChanges count: ${Object.keys(fileChanges).length}`);

    if (Object.keys(fileChanges).length === 0) {
      return { success: true, message: getMessage('sync_noChanges') };
    }

    const commitMsg = `Bookmark sync (push) from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
    const t0 = performance.now();
    const newCommitSha = await commitBookmarkChanges(api, commitMsg, fileChanges, options.onProgress);
    const tCommit = performance.now() - t0;
    await debugLog(`push() committed: newCommitSha=${newCommitSha?.substring(0, 7)} [${tCommit.toFixed(2)}ms]`);

    const profileId = settings.profileId || await getActiveProfileId();
    // Save sync state
    await saveSyncState(profileId, api, basePath, localFiles, newCommitSha);
    await invokePushToMirrors(profileId, localFiles, newCommitSha, commitMsg);

    return { success: true, message: getMessage('sync_pushSuccess') };
  } catch (err) {
    console.error('[GitSyncMarks] Push error:', err);
    const profileId = await getActiveProfileId();
    await setSyncState(profileId, { lastError: err.message });
    return { success: false, message: getMessage('sync_pushFailed', [err.message]) };
  } finally {
    if (!options.fromSync) setSyncing(false);
  }
}

/**
 * Generate all enabled files (mode !== 'off') and push them to the repo.
 * Used for the "Generate now" button — generates files in both 'manual' and 'auto' modes.
 */
export async function generateFilesNow({ onProgress } = {}) {
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    return { success: false, message: getMessage('sync_notConfigured') };
  }

  const basePath = settings[STORAGE_KEYS.FILE_PATH];
  const deviceId = await getDeviceId();
  const api = createApi(settings);
  onProgress?.({ phase: 'generating', current: 0, total: 0 });
  const localFiles = await getLocalFileMap(basePath, settings);
  const fileChanges = {};
  addGeneratedFiles(fileChanges, localFiles, basePath, settings, 'notOff');

  if (Object.keys(fileChanges).length === 0) {
    return { success: true, message: getMessage('sync_noChanges') };
  }

  try {
    const commitMsg = `Generate files from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
    await commitBookmarkChanges(api, commitMsg, fileChanges, onProgress);
    return { success: true, message: getMessage('sync_pushSuccess') };
  } catch (err) {
    console.error('[GitSyncMarks] Generate files error:', err);
    return { success: false, message: getMessage('sync_pushFailed', [err.message]) };
  }
}

/**
 * Full pull: replace all local bookmarks with remote data.
 * @param {{ fromSync?: boolean }} [options] - fromSync: true when called from sync() (skip lock to avoid race)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function pull(options = {}) {
  if (!options.fromSync) {
    if (isSyncing) return { success: false, message: getMessage('sync_alreadyInProgress'), alreadyInProgress: true };
    setSyncing(true);
  }

  await debugLog('pull() start');

  let profileId;
  try {
    const baseSettings = await getSettings();
    const settings = applyConnectionOverride(baseSettings, options.connectionOverride);
    if (!isConfigured(settings)) return { success: false, message: getMessage('sync_notConfigured') };

    const api = createApi(settings);
    const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');
    profileId = settings.profileId || await getActiveProfileId();

    options.onProgress?.({ phase: 'fetching', current: 0, total: 0 });
    const tFetch = performance.now();
    const remote = await fetchRemoteFileMap(api, basePath, null);
    const fetchMs = performance.now() - tFetch;

    const remoteCount = remote ? Object.keys(remote.fileMap).length : 0;
    await debugLog(`pull() remote: fileCount=${remoteCount} commitSha=${remote?.commitSha?.substring(0, 7) ?? 'null'} [${fetchMs.toFixed(2)}ms]`);

    if (!remote || Object.keys(remote.fileMap).length === 0) {
      return { success: false, message: getMessage('sync_noBookmarksOnRemote') };
    }

    // Apply encrypted settings from remote (before bookmarks, so profile config is current)
    const remoteSettingsEnc = await getRemoteEncryptedSettingsContent(remote.fileMap, basePath);
    await applyEncryptedSettings(remoteSettingsEnc, settings);

    // Save previous commit SHA for undo
    const prevState = await getSyncState(profileId);
    if (prevState.lastCommitSha) {
      await setSyncState(profileId, { previousCommitSha: prevState.lastCommitSha });
    }

    const bookmarkCount = countBookmarkPayloadFiles(remote.fileMap);
    options.onProgress?.({ phase: 'applying', current: 0, total: bookmarkCount });

    // Convert remote files to bookmark tree and apply
    const roleMap = fileMapToBookmarkTree(remote.fileMap, basePath);
    suppressAutoSyncUntil = Date.now() + 30000;
    await replaceLocalBookmarks(roleMap, {
      githubReposEnabled: settings.githubReposEnabled,
      githubReposParent: settings.githubReposParent,
      githubReposUsername: settings.githubReposUsername,
      linkwardenSyncEnabled: settings.linkwardenSyncEnabled,
      linkwardenSyncParent: settings.linkwardenSyncParent,
      linkwardenSyncPushToGit: settings.linkwardenSyncPushToGit,
    });

    options.onProgress?.({ phase: 'applying', current: bookmarkCount, total: bookmarkCount });

    // Re-generate local file map (to capture exact state with any normalization)
    const freshLocalFiles = await getLocalFileMap(basePath, settings);

    // Save sync state with the fresh local files (content matches what browser has)
    // but use remote SHAs for the stored state so remote diff is clean
    await saveSyncStateFromMaps(profileId, freshLocalFiles, remote.shaMap, remote.commitSha);

    return { success: true, message: getMessage('sync_loadedFromRemote') };
  } catch (err) {
    console.error('[GitSyncMarks] Pull error:', err);
    if (profileId) await setSyncState(profileId, { lastError: err.message });
    return { success: false, message: getMessage('sync_pullFailed', [err.message]) };
  } finally {
    if (!options.fromSync) setSyncing(false);
  }
}

/**
 * Bidirectional sync with three-way merge.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sync(options = {}) {
  if (isSyncing) return { success: false, message: getMessage('sync_alreadyInProgress'), alreadyInProgress: true };
  setSyncing(true);

  let profileId;
  try {
    await debugLog('sync() start');
    await checkStorageQuota();
    const baseSettings = await getSettings();
    const settings = applyConnectionOverride(baseSettings, options.connectionOverride);
    if (!isConfigured(settings)) return { success: false, message: getMessage('sync_notConfigured') };

    const api = createApi(settings);
    const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');
    const deviceId = await getDeviceId();
    profileId = settings.profileId || await getActiveProfileId();

    // 1. Load base state
    const stored = await getSyncState(profileId);
    const baseFiles = stored.lastSyncFiles || null;
    const baseCommitSha = stored.lastCommitSha || null;
    if (baseFiles) {
      await debugLog(`sync() loaded baseCount=${Object.keys(baseFiles).length} baseCommitSha=${baseCommitSha?.substring(0, 7) ?? 'null'}`);
    }

    // 2. Get local file map
    const localFiles = await getLocalFileMap(basePath, settings);

    // 3. Get remote file map (optimized: uses base SHAs to skip unchanged blobs)
    options.onProgress?.({ phase: 'fetching', current: 0, total: 0 });
    const tFetch = performance.now();
    const remote = await fetchRemoteFileMap(api, basePath, baseFiles);
    const fetchMs = performance.now() - tFetch;
    if (remote) {
      await debugLog(`sync() fetchRemote done: remoteCommitSha=${remote.commitSha?.substring(0, 7)} [${fetchMs.toFixed(2)}ms]`);
    }

    // 4. Handle special cases

    // 4a. No base state (first sync)
    if (!baseFiles) {
      const hasRemote = remote ? hasBookmarkPayloadFiles(remote.fileMap) : false;
      const hasLocal = hasBookmarkPayloadFiles(localFiles);

      if (!hasRemote && hasLocal) {
        // First sync, no remote data → push everything (hold lock to avoid concurrent sync)
        console.log('[GitSyncMarks] First sync: pushing local bookmarks');
        return await push({
          fromSync: true,
          connectionOverride: options.connectionOverride,
          onProgress: options.onProgress,
        });
      }
      if (hasRemote && !hasLocal) {
        // Remote has data, local is empty → pull (hold lock to avoid concurrent sync)
        console.log('[GitSyncMarks] First sync: pulling remote bookmarks');
        return await pull({ fromSync: true, connectionOverride: options.connectionOverride });
      }
      if (hasRemote && hasLocal) {
        // Both have data, no base → can't merge, user must choose
        console.log('[GitSyncMarks] First sync: both sides have data, conflict');
        await setSyncState(profileId, { hasConflict: true });
        return { success: false, message: getMessage('sync_conflictBothModified'), conflict: true };
      }
      // Neither has data
      return { success: true, message: getMessage('sync_allInSync') };
    }

    // 4b. Extract base content map (path → content) from stored state
    const baseContentMap = {};
    for (const [path, info] of Object.entries(baseFiles)) {
      baseContentMap[path] = info.content;
    }

    const remoteFiles = remote ? remote.fileMap : {};
    const baseCount = Object.keys(baseContentMap).length;
    const localCount = Object.keys(localFiles).length;
    const remoteCount = Object.keys(remoteFiles).length;
    await debugLog(`sync() baseFiles: ${baseCount} localFiles: ${localCount} remoteFiles: ${remoteCount}`);

    // 5. Compute diffs (excluding generated files like README.md)
    const tDiff = performance.now();
    const localDiff = computeDiff(filterForDiff(baseContentMap), filterForDiff(localFiles));
    const remoteDiff = computeDiff(filterForDiff(baseContentMap), filterForDiff(remoteFiles));
    const diffMs = performance.now() - tDiff;

    await debugLog(`sync() localDiff: added=${Object.keys(localDiff.added).length} removed=${localDiff.removed.length} modified=${Object.keys(localDiff.modified).length} [${diffMs.toFixed(2)}ms]`);
    await debugLog(`sync() remoteDiff: added=${Object.keys(remoteDiff.added).length} removed=${remoteDiff.removed.length} modified=${Object.keys(remoteDiff.modified).length}`);

    const localHasChanges = Object.keys(localDiff.added).length > 0 ||
      localDiff.removed.length > 0 || Object.keys(localDiff.modified).length > 0;
    const remoteHasChanges = Object.keys(remoteDiff.added).length > 0 ||
      remoteDiff.removed.length > 0 || Object.keys(remoteDiff.modified).length > 0;

    console.log('[GitSyncMarks] Sync analysis:', {
      localChanges: {
        added: Object.keys(localDiff.added).length,
        removed: localDiff.removed.length,
        modified: Object.keys(localDiff.modified).length,
      },
      remoteChanges: {
        added: Object.keys(remoteDiff.added).length,
        removed: remoteDiff.removed.length,
        modified: Object.keys(remoteDiff.modified).length,
      },
    });

    // 6. No changes on either side
    if (!localHasChanges && !remoteHasChanges) {
      // Refresh stored commit SHA when remote HEAD moved (e.g. after profile transfer push)
      // but three-way base still matches local/remote content.
      if (remote?.commitSha && remote.commitSha !== baseCommitSha) {
        await saveSyncStateFromMaps(profileId, localFiles, remote.shaMap, remote.commitSha);
      } else {
        await setSyncState(profileId, { lastSyncTime: new Date().toISOString(), lastError: null });
      }
      return { success: true, message: getMessage('sync_allInSync') };
    }

    // 7. Only local changes → push
    if (localHasChanges && !remoteHasChanges) {
      const fileChanges = {};
      for (const [p, c] of Object.entries(localDiff.added)) fileChanges[p] = c;
      for (const [p, c] of Object.entries(localDiff.modified)) fileChanges[p] = c;
      for (const p of localDiff.removed) fileChanges[p] = null;

      addGeneratedFiles(fileChanges, localFiles, basePath, settings, 'auto', remoteFiles);

      const encSettings7 = await buildEncryptedSettings(settings);
      if (encSettings7) fileChanges[`${basePath}/${encSettings7.filename}`] = encSettings7.content;

      const msg = `Bookmark sync from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
      const tCommit = performance.now();
      const newCommitSha = await commitBookmarkChanges(api, msg, fileChanges, options.onProgress);
      const commitMs = performance.now() - tCommit;

      await debugLog(`sync() path7 push: newCommitSha=${newCommitSha?.substring(0, 7)} [${commitMs.toFixed(2)}ms]`);
      await saveSyncState(profileId, api, basePath, localFiles, newCommitSha);
      await setSyncState(profileId, { localModifiedSinceSync: false });
      await invokePushToMirrors(profileId, localFiles, newCommitSha, msg);

      return { success: true, message: getMessage('sync_pushSuccess') };
    }

    // 8. Only remote changes → apply locally (or push stale-base deletes when user edited locally)
    if (!localHasChanges && remoteHasChanges) {
      const syncState = await getSyncState(profileId);
      if (syncState.localModifiedSinceSync) {
        const { fileChanges, shouldPush } = buildStaleBasePushChanges(
          remoteDiff,
          localFiles,
          remoteFiles,
          isGeneratedOrSettingsPath
        );
        if (shouldPush) {
          addGeneratedFiles(fileChanges, localFiles, basePath, settings, 'auto', remoteFiles);

          const encSettings8 = await buildEncryptedSettings(settings);
          if (encSettings8) fileChanges[`${basePath}/${encSettings8.filename}`] = encSettings8.content;

          const msg = `Bookmark sync from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
          await debugLog(`sync() path8 stale-base push: deletes=${Object.values(fileChanges).filter((v) => v === null).length}`);
          const newCommitSha = await commitBookmarkChanges(api, msg, fileChanges, options.onProgress);
          await saveSyncState(profileId, api, basePath, localFiles, newCommitSha);
          await setSyncState(profileId, { localModifiedSinceSync: false });
          await invokePushToMirrors(profileId, localFiles, newCommitSha, msg);

          return { success: true, message: getMessage('sync_pushSuccess') };
        }
      }

      // Guard: our fetch may have returned stale data (e.g. right after our own push,
      // or the remote advanced mid-fetch). Obtain a STABLE remote snapshot before
      // overwriting local bookmarks. Since local has no changes vs base, applying the
      // latest remote is always safe — so we re-fetch instead of silently skipping.
      let effRemote = remote;
      for (let attempt = 0; attempt < 3; attempt++) {
        const verifySha = await api.getLatestCommitSha();
        if (verifySha === effRemote.commitSha) break;
        await debugLog(`sync() path8 guard: remote advanced (${effRemote.commitSha?.substring(0, 7)} -> ${verifySha?.substring(0, 7)}), re-fetching (attempt ${attempt + 1})`);
        const refetched = await fetchRemoteFileMap(api, basePath, baseFiles);
        if (!refetched) { effRemote = null; break; }
        effRemote = refetched;
      }

      if (!effRemote) {
        // Remote disappeared/emptied between fetches — do not claim in-sync.
        await debugLog('sync() path8: remote unavailable after re-fetch — asking for retry');
        return { success: false, message: getMessage('sync_remoteChangedRetry') };
      }

      const finalHead = await api.getLatestCommitSha();
      if (finalHead !== effRemote.commitSha) {
        // Remote is still moving. Don't silently report "all in sync" (which hid
        // pending remote changes before); ask the caller to retry shortly.
        await debugLog(`sync() path8: remote still changing (head=${finalHead?.substring(0, 7)}) — asking for retry`);
        await setSyncState(profileId, { lastSyncTime: new Date().toISOString() });
        return { success: false, message: getMessage('sync_remoteChangedRetry') };
      }

      // Save previous commit SHA for undo
      if (baseCommitSha) {
        await setSyncState(profileId, { previousCommitSha: baseCommitSha });
      }

      // Apply encrypted settings from remote
      const remoteSettingsEnc8 = await getRemoteEncryptedSettingsContent(effRemote.fileMap, basePath);
      await applyEncryptedSettings(remoteSettingsEnc8, settings);

      const roleMap = fileMapToBookmarkTree(effRemote.fileMap, basePath);
      suppressAutoSyncUntil = Date.now() + 30000;
      await replaceLocalBookmarks(roleMap, {
        githubReposEnabled: settings.githubReposEnabled,
        githubReposParent: settings.githubReposParent,
        githubReposUsername: settings.githubReposUsername,
        linkwardenSyncEnabled: settings.linkwardenSyncEnabled,
        linkwardenSyncParent: settings.linkwardenSyncParent,
        linkwardenSyncPushToGit: settings.linkwardenSyncPushToGit,
      });

      const freshLocal = await getLocalFileMap(basePath, settings);
      await debugLog(`sync() path8 pull: remoteCommitSha=${effRemote.commitSha?.substring(0, 7)}`);
      await saveSyncStateFromMaps(profileId, freshLocal, effRemote.shaMap, effRemote.commitSha);
      await setSyncState(profileId, { localModifiedSinceSync: false });

      return { success: true, message: getMessage('sync_loadedFromRemote') };
    }

    // 9. Both changed → three-way merge
    const { toPush, toApplyLocal, conflicts } = mergeDiffs(
      localDiff, remoteDiff, localFiles, remoteFiles, baseContentMap
    );

    await debugLog(`sync() merge result: toPush=${Object.keys(toPush).length} toApplyLocal=${Object.keys(toApplyLocal).length} conflicts=${conflicts.length}`);

    if (conflicts.length > 0) {
      for (const c of conflicts) {
        const localPreview = c.local ? String(c.local).slice(0, 80) + (c.local.length > 80 ? '...' : '') : 'null';
        const remotePreview = c.remote ? String(c.remote).slice(0, 80) + (c.remote.length > 80 ? '...' : '') : 'null';
        await debugLog(`sync() conflict path=${c.path} local=${localPreview} remote=${remotePreview}`);
      }
      console.log('[GitSyncMarks] Merge conflicts:', conflicts.map(c => c.path));
      await setSyncState(profileId, { hasConflict: true });
      return { success: false, message: getMessage('sync_conflictBothModified'), conflict: true };
    }

    // Apply remote encrypted settings if present
    const remoteSettingsEnc9 = await getRemoteEncryptedSettingsContent(remoteFiles, basePath);
    await applyEncryptedSettings(remoteSettingsEnc9, settings);

    // Apply non-conflicting changes

    // Build merged file map (local + toApplyLocal) — used for replace and push
    const mergedFiles = { ...localFiles };
    for (const [path, content] of Object.entries(toApplyLocal)) {
      if (content === null) {
        delete mergedFiles[path];
      } else {
        mergedFiles[path] = content;
      }
    }

    // Save previous commit SHA for undo (before applying any changes)
    if (Object.keys(toApplyLocal).length > 0 && baseCommitSha) {
      await setSyncState(profileId, { previousCommitSha: baseCommitSha });
    }

    // Apply remote changes locally
    if (Object.keys(toApplyLocal).length > 0) {
      const roleMap = fileMapToBookmarkTree(mergedFiles, basePath);
      suppressAutoSyncUntil = Date.now() + 30000;
      await replaceLocalBookmarks(roleMap, {
        githubReposEnabled: settings.githubReposEnabled,
        githubReposParent: settings.githubReposParent,
        githubReposUsername: settings.githubReposUsername,
        linkwardenSyncEnabled: settings.linkwardenSyncEnabled,
        linkwardenSyncParent: settings.linkwardenSyncParent,
        linkwardenSyncPushToGit: settings.linkwardenSyncPushToGit,
      });
    }

    // Push local changes to remote
    if (Object.keys(toPush).length > 0) {
      // Ensure remote matches merged state: delete paths on remote that are not in merged
      for (const path of Object.keys(remoteFiles)) {
        if (!(path in mergedFiles) && !isGeneratedOrSettingsPath(path)) {
          toPush[path] = null;
        }
      }
      addGeneratedFiles(toPush, mergedFiles, basePath, settings, 'auto', remoteFiles);

      const encSettings9 = await buildEncryptedSettings(settings);
      if (encSettings9) toPush[`${basePath}/${encSettings9.filename}`] = encSettings9.content;

      // Linkwarden Auto-Save (Mirroring)
      await mirrorToLinkwarden(toPush);

      const tCommit = performance.now();
      const msg = `Bookmark merge from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
      const newCommitSha = await commitBookmarkChanges(api, msg, toPush, options.onProgress);
      const commitMs = performance.now() - tCommit;

      const freshLocal = await getLocalFileMap(basePath, settings);
      await saveSyncState(profileId, api, basePath, freshLocal, newCommitSha);
      await invokePushToMirrors(profileId, freshLocal, newCommitSha, msg);
      await debugLog(`sync() saved state: savedCount=${Object.keys(freshLocal).length} commitSha=${newCommitSha.substring(0, 7)} [${commitMs.toFixed(2)}ms push]`);
    } else if (Object.keys(toApplyLocal).length > 0) {
      const freshLocal = await getLocalFileMap(basePath);
      await saveSyncStateFromMaps(profileId, freshLocal, remote.shaMap, remote.commitSha);
      await debugLog(`sync() saved state: savedCount=${Object.keys(freshLocal).length} commitSha=${remote.commitSha?.substring(0, 7)} [pull only]`);
    }
    // Note: hasConflict: false is already set in saveSyncStateFromMaps — no redundant setSyncState

    await debugLog('sync() done (merged successfully)');
    await setSyncState(profileId, { localModifiedSinceSync: false });
    const resultMessage =
      Object.keys(toPush).length > 0
        ? getMessage('sync_pushSuccess')
        : Object.keys(toApplyLocal).length > 0
          ? getMessage('sync_loadedFromRemote')
          : getMessage('sync_allInSync');
    return { success: true, message: resultMessage };

  } catch (err) {
    if (profileId) await setSyncState(profileId, { lastError: err.message });
    return { success: false, message: getMessage('sync_syncFailed', [err.message]) };
  } finally {
    setSyncing(false);
  }
}

/**
 * Save sync state after a push (fetches fresh SHAs from remote tree).
 */
export async function saveSyncState(profileId, api, basePath, localFiles, commitSha) {
  const { shaMap } = await buildRemoteMaps(api, basePath, null, commitSha);
  await saveSyncStateFromMaps(profileId, localFiles, shaMap, commitSha);
}

/**
 * Save sync state from pre-computed maps.
 */
export async function saveSyncStateFromMaps(profileId, localFiles, shaMap, commitSha) {
  const syncFiles = {};
  for (const [path, content] of Object.entries(localFiles)) {
    // Base state only needs files that participate in diffs/merges. Generated and
    // settings files are excluded from diffing, so storing their content only wastes
    // local-storage quota (which is tight for very large bookmark sets).
    if (isGeneratedOrSettingsPath(path)) continue;
    syncFiles[path] = {
      sha: shaMap[path] || null,
      content,
    };
  }

  const now = new Date().toISOString();
  const baseState = {
    lastCommitSha: commitSha,
    lastSyncTime: now,
    lastSyncWithChangesTime: now,
    hasConflict: false,
    lastError: null,
  };

  try {
    await setSyncState(profileId, { ...baseState, lastSyncFiles: syncFiles });
  } catch (err) {
    // chrome.storage.local quota exceeded while persisting the base file map.
    // Save the lightweight state without it so we don't lose the commit pointer;
    // the next sync re-fetches the full remote (no data loss, just slower).
    await debugLog(`saveSyncState: persisting base file map failed (${err?.message}); saving without lastSyncFiles`);
    await setSyncState(profileId, { ...baseState, lastSyncFiles: null });
  }
}

export async function getSyncStatus() {
  const profileId = await getActiveProfileId();
  const state = await getSyncState(profileId);
  const settings = await getSettings();
  const mirrors = settings?.mirrors || [];
  const mirrorState = state.mirrors || {};
  const mirrorStatuses = mirrors.map((m) => ({
    id: m.id,
    label: m.label || m.repo || m.id,
    paused: !!m.paused,
    lastPushedCommitSha: mirrorState[m.id]?.lastPushedCommitSha || null,
    lastError: mirrorState[m.id]?.lastError || null,
    lastPushTime: mirrorState[m.id]?.lastPushTime || null,
  }));
  const mirrorOk = mirrorStatuses.filter((m) => !m.paused && !m.lastError).length;
  const mirrorActive = mirrorStatuses.filter((m) => !m.paused).length;
  return {
    configured: isConfigured(settings),
    lastSyncTime: state.lastSyncTime || null,
    lastSyncWithChangesTime: state.lastSyncWithChangesTime || null,
    lastCommitSha: state.lastCommitSha || null,
    hasConflict: state.hasConflict || false,
    lastError: state.lastError || null,
    autoSync: settings[STORAGE_KEYS.AUTO_SYNC],
    repoOwner: settings[STORAGE_KEYS.REPO_OWNER] || '',
    repoName: settings[STORAGE_KEYS.REPO_NAME] || '',
    gitProvider: settings[STORAGE_KEYS.GIT_PROVIDER] || 'github',
    serverUrl: settings[STORAGE_KEYS.SERVER_URL] || '',
    mirrorStatuses,
    mirrorSummary: mirrorActive > 0 ? `${mirrorOk}/${mirrorActive}` : null,
  };
}

export function isSyncInProgress() { return isSyncing; }

export function isAutoSyncSuppressed() { return Date.now() < suppressAutoSyncUntil; }

export function _acquireSyncLock() {
  if (isSyncing) return false;
  setSyncing(true);
  return true;
}
export function _releaseSyncLock() { setSyncing(false); }
export function _suppressAutoSyncUntil(ts) { suppressAutoSyncUntil = ts; }

/**
 * Max wait: sync at latest after 30s or 6× debounce delay (prevents infinite deferral).
 */
const MAX_WAIT_MULTIPLIER = 6;
const MAX_WAIT_MIN_MS = 30000;

export function debouncedSync(delayMs = 5000, onComplete = null) {
  const maxWaitMs = Math.max(MAX_WAIT_MIN_MS, MAX_WAIT_MULTIPLIER * delayMs);

  const runSync = async () => {
    // Coalesce: if a sync is already running, re-arm the debounce so changes made
    // during the in-flight sync are not lost. Keep the max-wait timer bounding total
    // deferral so we cannot starve indefinitely.
    if (isSyncing) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSync, delayMs);
      if (!maxWaitTimer) maxWaitTimer = setTimeout(runSync, maxWaitMs);
      return;
    }

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = null;
    if (maxWaitTimer) clearTimeout(maxWaitTimer);
    maxWaitTimer = null;

    const settings = await getSettings();
    if (settings[STORAGE_KEYS.AUTO_SYNC]) {
      console.log('[GitSyncMarks] Auto-sync triggered');
      const result = await sync();
      console.log('[GitSyncMarks] Auto-sync result:', result.message);
      if (result.success) {
        chrome.action.setBadgeText({ text: '' });
      } else {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
      }
      if (onComplete) onComplete(result);
    }
  };

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runSync, delayMs);

  if (!maxWaitTimer) {
    maxWaitTimer = setTimeout(runSync, maxWaitMs);
  }
}

// Legacy alias for backward compatibility
export const debouncedPush = debouncedSync;

/**
 * Deterministic bootstrap entry for onboarding first sync.
 * Uses the normal sync merge path (no dedicated push loop).
 * @param {import('./connection-settings.js').ConnectionFormFields|null|undefined} [connectionOverride]
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function bootstrapFirstSync(connectionOverride = null, { onProgress } = {}) {
  let result = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    result = await sync({ connectionOverride, onProgress });
    const msg = String(result?.message || '');
    if (result?.success) break;
    if (!/modified in the meantime/i.test(msg)) break;
  }
  return result;
}

export { replaceLocalBookmarks, createBookmarkTree } from './bookmark-replace.js';
