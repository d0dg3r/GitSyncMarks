/**
 * Sync Core – Push, Pull, Sync with Three-Way Merge
 * Core sync operations, diff computation, merge logic, and debounced auto-sync.
 */

import { GitHubError } from './github-api.js';
import {
  fileMapToBookmarkTree,
  orderEntryKey,
  gitTreeToShaMap,
} from './bookmark-serializer.js';
import { fetchRemoteFileMap } from './remote-fetch.js';
import { replaceLocalBookmarks, createBookmarkTree } from './bookmark-replace.js';
import { decryptToken } from './crypto.js';
import { LinkwardenAPI } from './linkwarden-api.js';
import { getMessage } from './i18n.js';
import { getActiveProfileId, getSyncState, setSyncState } from './profile-manager.js';
import { log as debugLog } from './debug-log.js';
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
  buildEncryptedSettings,
  applyEncryptedSettings,
  getRemoteEncryptedSettingsContent,
} from './sync-settings.js';

let isSyncing = false;
let suppressAutoSyncUntil = 0;
let debounceTimer = null;
let maxWaitTimer = null;

async function commitViaContentsApi(api, fileChanges, commitMsg) {
  let lastCommitSha = null;
  const entries = Object.entries(fileChanges).sort(([a], [b]) => a.localeCompare(b));
  for (const [path, content] of entries) {
    if (content === null) continue;
    let sha = null;
    try {
      const existing = await api.getFile(path);
      sha = existing?.sha || null;
    } catch (err) {
      const notFound = err instanceof GitHubError && err.statusCode === 404;
      if (!notFound) throw err;
    }
    const res = await api.createOrUpdateFile(path, content, commitMsg, sha);
    lastCommitSha = res?.commitSha || lastCommitSha;
  }
  return lastCommitSha;
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
 * Compute the diff between a base file map and a current file map.
 * @param {Object<string, string>} base - Base file map (path → content)
 * @param {Object<string, string>} current - Current file map
 * @returns {{added: Object<string, string>, removed: string[], modified: Object<string, string>}}
 */
export function computeDiff(base, current) {
  const added = {};
  const removed = [];
  const modified = {};

  // Find added and modified
  for (const [path, content] of Object.entries(current)) {
    if (!(path in base)) {
      added[path] = content;
    } else if (base[path] !== content) {
      modified[path] = content;
    }
  }

  // Find removed
  for (const path of Object.keys(base)) {
    if (!(path in current)) {
      removed.push(path);
    }
  }

  return { added, removed, modified };
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

      if (localContent === remoteContent) {
        // Same change on both sides → no conflict, no action needed
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

/**
 * Full push: upload all local bookmarks as individual files.
 * Used for initial sync or force-push.
 * @param {{ fromSync?: boolean }} [options] - fromSync: true when called from sync() (skip lock to avoid race)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function push(options = {}) {
  if (!options.fromSync) {
    if (isSyncing) return { success: false, message: getMessage('sync_alreadyInProgress'), alreadyInProgress: true };
    isSyncing = true;
  }

  await debugLog('push() start');

  try {
    const settings = await getSettings();
    if (!isConfigured(settings)) return { success: false, message: getMessage('sync_notConfigured') };

    const api = createApi(settings);
    const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');
    const localFiles = await getLocalFileMap(basePath, settings);
    const deviceId = await getDeviceId();

    // Get current remote state to determine what to change
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

    addGeneratedFiles(fileChanges, localFiles, basePath, settings, 'auto');

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

    const t0 = performance.now();
    const commitMsg = `Bookmark sync (push) from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
    let newCommitSha;
    try {
      newCommitSha = await api.atomicCommit(commitMsg, fileChanges);
    } catch (err) {
      const isModifiedConflict = /modified in the meantime/i.test(String(err?.message || ''));
      const remoteIsEmpty = !remote || Object.keys(remote.fileMap || {}).length === 0;
      if (!(isModifiedConflict && remoteIsEmpty)) throw err;
      newCommitSha = await commitViaContentsApi(api, fileChanges, commitMsg);
      if (!newCommitSha) throw err;
    }
    const tCommit = performance.now() - t0;
    await debugLog(`push() committed: newCommitSha=${newCommitSha?.substring(0, 7)} [${tCommit.toFixed(2)}ms]`);

    const profileId = settings.profileId || await getActiveProfileId();
    // Save sync state
    await saveSyncState(profileId, api, basePath, localFiles, newCommitSha);

    return { success: true, message: getMessage('sync_pushSuccess') };
  } catch (err) {
    console.error('[GitSyncMarks] Push error:', err);
    const profileId = await getActiveProfileId();
    await setSyncState(profileId, { lastError: err.message });
    return { success: false, message: getMessage('sync_pushFailed', [err.message]) };
  } finally {
    if (!options.fromSync) isSyncing = false;
  }
}

/**
 * Generate all enabled files (mode !== 'off') and push them to the repo.
 * Used for the "Generate now" button — generates files in both 'manual' and 'auto' modes.
 */
export async function generateFilesNow() {
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    return { success: false, message: getMessage('sync_notConfigured') };
  }

  const basePath = settings[STORAGE_KEYS.FILE_PATH];
  const deviceId = await getDeviceId();
  const api = createApi(settings);
  const localFiles = await getLocalFileMap(basePath, settings);
  const fileChanges = {};
  addGeneratedFiles(fileChanges, localFiles, basePath, settings, 'notOff');

  if (Object.keys(fileChanges).length === 0) {
    return { success: true, message: getMessage('sync_noChanges') };
  }

  try {
    const commitMsg = `Generate files from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
    await api.atomicCommit(commitMsg, fileChanges);
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
    isSyncing = true;
  }

  await debugLog('pull() start');

  let profileId;
  try {
    const settings = await getSettings();
    if (!isConfigured(settings)) return { success: false, message: getMessage('sync_notConfigured') };

    const api = createApi(settings);
    const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');
    profileId = settings.profileId || await getActiveProfileId();

    const tFetch = performance.now();
    const remote = await fetchRemoteFileMap(api, basePath, null);
    const fetchMs = performance.now() - tFetch;

    const remoteCount = remote ? Object.keys(remote.fileMap).length : 0;
    await debugLog(`pull() remote: fileCount=${remoteCount} commitSha=${remote?.commitSha?.substring(0, 7) ?? 'null'} [${fetchMs.toFixed(2)}ms]`);

    if (!remote || Object.keys(remote.fileMap).length === 0) {
      return { success: false, message: getMessage('sync_noBookmarksOnGithub') };
    }

    // Apply encrypted settings from remote (before bookmarks, so profile config is current)
    const remoteSettingsEnc = await getRemoteEncryptedSettingsContent(remote.fileMap, basePath);
    await applyEncryptedSettings(remoteSettingsEnc, settings);

    // Save previous commit SHA for undo
    const prevState = await getSyncState(profileId);
    if (prevState.lastCommitSha) {
      await setSyncState(profileId, { previousCommitSha: prevState.lastCommitSha });
    }

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

    // Re-generate local file map (to capture exact state with any normalization)
    const freshLocalFiles = await getLocalFileMap(basePath, settings);

    // Save sync state with the fresh local files (content matches what browser has)
    // but use remote SHAs for the stored state so remote diff is clean
    await saveSyncStateFromMaps(profileId, freshLocalFiles, remote.shaMap, remote.commitSha);

    return { success: true, message: getMessage('sync_pullSuccess') };
  } catch (err) {
    console.error('[GitSyncMarks] Pull error:', err);
    if (profileId) await setSyncState(profileId, { lastError: err.message });
    return { success: false, message: getMessage('sync_pullFailed', [err.message]) };
  } finally {
    if (!options.fromSync) isSyncing = false;
  }
}

/**
 * Bidirectional sync with three-way merge.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sync() {
  if (isSyncing) return { success: false, message: getMessage('sync_alreadyInProgress'), alreadyInProgress: true };
  isSyncing = true;

  let profileId;
  try {
    await debugLog('sync() start');
    await checkStorageQuota();
    const settings = await getSettings();
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
        return await push({ fromSync: true });
      }
      if (hasRemote && !hasLocal) {
        // Remote has data, local is empty → pull (hold lock to avoid concurrent sync)
        console.log('[GitSyncMarks] First sync: pulling remote bookmarks');
        return await pull({ fromSync: true });
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
      await setSyncState(profileId, { lastSyncTime: new Date().toISOString() });
      return { success: true, message: getMessage('sync_allInSync') };
    }

    // 7. Only local changes → push
    if (localHasChanges && !remoteHasChanges) {
      const fileChanges = {};
      for (const [p, c] of Object.entries(localDiff.added)) fileChanges[p] = c;
      for (const [p, c] of Object.entries(localDiff.modified)) fileChanges[p] = c;
      for (const p of localDiff.removed) fileChanges[p] = null;

      addGeneratedFiles(fileChanges, localFiles, basePath, settings, 'auto');

      const encSettings7 = await buildEncryptedSettings(settings);
      if (encSettings7) fileChanges[`${basePath}/${encSettings7.filename}`] = encSettings7.content;

      const tCommit = performance.now();
      const msg = `Bookmark sync from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
      const newCommitSha = await api.atomicCommit(msg, fileChanges);
      const commitMs = performance.now() - tCommit;

      await debugLog(`sync() path7 push: newCommitSha=${newCommitSha?.substring(0, 7)} [${commitMs.toFixed(2)}ms]`);
      await saveSyncState(profileId, api, basePath, localFiles, newCommitSha);

      return { success: true, message: getMessage('sync_pushSuccess') };
    }

    // 8. Only remote changes → apply locally
    if (!localHasChanges && remoteHasChanges) {
      // Guard: our fetch may have returned stale/cached data (e.g. right after our push).
      // Re-fetch branch HEAD; if it differs from what we got, the remote we have is stale—don't overwrite.
      const verifySha = await api.getLatestCommitSha();
      if (verifySha !== remote.commitSha) {
        await debugLog(`sync() path8 guard: remote.commitSha=${remote.commitSha?.substring(0, 7)} != verifySha=${verifySha?.substring(0, 7)} — skipping pull (stale fetch)`);
        await setSyncState(profileId, { lastSyncTime: new Date().toISOString() });
        return { success: true, message: getMessage('sync_allInSync') };
      }
      // Save previous commit SHA for undo
      if (baseCommitSha) {
        await setSyncState(profileId, { previousCommitSha: baseCommitSha });
      }

      // Apply encrypted settings from remote
      const remoteSettingsEnc8 = await getRemoteEncryptedSettingsContent(remoteFiles, basePath);
      await applyEncryptedSettings(remoteSettingsEnc8, settings);

      const roleMap = fileMapToBookmarkTree(remoteFiles, basePath);
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
      await debugLog(`sync() path8 pull: remoteCommitSha=${remote.commitSha?.substring(0, 7)}`);
      await saveSyncStateFromMaps(profileId, freshLocal, remote.shaMap, remote.commitSha);

      return { success: true, message: getMessage('sync_pullSuccess') };
    }

    // 9. Both changed → three-way merge
    const { toPush, toApplyLocal, conflicts } = mergeDiffs(
      localDiff, remoteDiff, localFiles, remoteFiles, baseContentMap
    );

    await debugLog(`sync() merge result: toPush=${Object.keys(toPush).length} toApplyLocal=${Object.keys(toApplyLocal).length} conflicts=${conflicts.length}`);
    // #region agent log
    const pushFolders = Object.keys(toPush).filter(p => p.endsWith('/_order.json'));
    const applyFolders = Object.keys(toApplyLocal).filter(p => p.endsWith('/_order.json'));
    console.info(`[GitSyncMarks][debug-f0a9cb] MERGE_FOLDERS toPush_order_jsons=${JSON.stringify(pushFolders)} toApplyLocal_order_jsons=${JSON.stringify(applyFolders)}`);
    for (const p of Object.keys(toPush).filter(k => k.includes('githubrepos') || k.includes('-2/'))) {
      console.info(`[GitSyncMarks][debug-f0a9cb] MERGE_TOPUSH path=${p} isNull=${toPush[p] === null}`);
    }
    // #endregion

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
      addGeneratedFiles(toPush, mergedFiles, basePath, settings, 'auto');

      const encSettings9 = await buildEncryptedSettings(settings);
      if (encSettings9) toPush[`${basePath}/${encSettings9.filename}`] = encSettings9.content;

      // Linkwarden Auto-Save (Mirroring)
      await mirrorToLinkwarden(toPush);

      const tCommit = performance.now();
      const msg = `Bookmark merge from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
      const newCommitSha = await api.atomicCommit(msg, toPush);
      const commitMs = performance.now() - tCommit;

      const freshLocal = await getLocalFileMap(basePath, settings);
      await saveSyncState(profileId, api, basePath, freshLocal, newCommitSha);
      await debugLog(`sync() saved state: savedCount=${Object.keys(freshLocal).length} commitSha=${newCommitSha.substring(0, 7)} [${commitMs.toFixed(2)}ms push]`);
    } else if (Object.keys(toApplyLocal).length > 0) {
      const freshLocal = await getLocalFileMap(basePath);
      await saveSyncStateFromMaps(profileId, freshLocal, remote.shaMap, remote.commitSha);
      await debugLog(`sync() saved state: savedCount=${Object.keys(freshLocal).length} commitSha=${remote.commitSha?.substring(0, 7)} [pull only]`);
    }
    // Note: hasConflict: false is already set in saveSyncStateFromMaps — no redundant setSyncState

    await debugLog('sync() done (merged successfully)');
    const resultMessage =
      Object.keys(toPush).length > 0
        ? getMessage('sync_pushSuccess')
        : Object.keys(toApplyLocal).length > 0
          ? getMessage('sync_pullSuccess')
          : getMessage('sync_allInSync');
    return { success: true, message: resultMessage };

  } catch (err) {
    if (profileId) await setSyncState(profileId, { lastError: err.message });
    return { success: false, message: getMessage('sync_syncFailed', [err.message]) };
  } finally {
    isSyncing = false;
  }
}

/**
 * Save sync state after a push (fetches fresh SHAs from remote tree).
 */
export async function saveSyncState(profileId, api, basePath, localFiles, commitSha) {
  const commit = await api.getCommit(commitSha);
  const treeEntries = await api.getTree(commit.treeSha);
  const shaMap = gitTreeToShaMap(treeEntries, basePath);

  await saveSyncStateFromMaps(profileId, localFiles, shaMap, commitSha);
}

/**
 * Save sync state from pre-computed maps.
 */
export async function saveSyncStateFromMaps(profileId, localFiles, shaMap, commitSha) {
  const syncFiles = {};
  for (const [path, content] of Object.entries(localFiles)) {
    syncFiles[path] = {
      sha: shaMap[path] || null,
      content,
    };
  }

  const now = new Date().toISOString();
  await setSyncState(profileId, {
    lastSyncFiles: syncFiles,
    lastCommitSha: commitSha,
    lastSyncTime: now,
    lastSyncWithChangesTime: now,
    hasConflict: false,
    lastError: null,
  });
}

export async function getSyncStatus() {
  const profileId = await getActiveProfileId();
  const state = await getSyncState(profileId);
  const settings = await getSettings();
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
  };
}

export function isSyncInProgress() { return isSyncing; }

export function isAutoSyncSuppressed() { return Date.now() < suppressAutoSyncUntil; }

export function _acquireSyncLock() {
  if (isSyncing) return false;
  isSyncing = true;
  return true;
}
export function _releaseSyncLock() { isSyncing = false; }
export function _suppressAutoSyncUntil(ts) { suppressAutoSyncUntil = ts; }

/**
 * Max wait: sync at latest after 30s or 6× debounce delay (prevents infinite deferral).
 */
const MAX_WAIT_MULTIPLIER = 6;
const MAX_WAIT_MIN_MS = 30000;

export function debouncedSync(delayMs = 5000, onComplete = null) {
  const maxWaitMs = Math.max(MAX_WAIT_MIN_MS, MAX_WAIT_MULTIPLIER * delayMs);

  const runSync = async () => {
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
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function bootstrapFirstSync() {
  let result = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    result = await sync();
    const msg = String(result?.message || '');
    if (result?.success) break;
    if (!/modified in the meantime/i.test(msg)) break;
  }
  return result;
}

export { replaceLocalBookmarks, createBookmarkTree } from './bookmark-replace.js';
