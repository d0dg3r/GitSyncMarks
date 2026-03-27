/**
 * Sync Migration
 * Handles migration from the legacy single-file bookmark format
 * to the per-file sync format.
 */

import { bookmarkTreeToFileMap } from './bookmark-serializer.js';
import { getActiveProfileId } from './profile-manager.js';
import { STORAGE_KEYS, getDeviceId } from './sync-settings.js';
import { saveSyncState } from './sync-core.js';

/**
 * Check if we need to migrate from the old single-file format.
 * @param {GitHubAPI} api
 * @param {string} basePath
 * @returns {Promise<boolean>} true if migration was performed
 */
export async function migrateFromLegacyFormat(api, basePath) {
  const base = basePath.replace(/\/+$/, '');
  const legacyPath = `${base}/bookmarks.json`;

  let legacyFile;
  try {
    legacyFile = await api.getFile(legacyPath);
  } catch {
    return false;
  }

  if (!legacyFile) return false;

  console.log('[GitSyncMarks] Legacy bookmarks.json found, migrating to per-file format...');

  try {
    const data = JSON.parse(legacyFile.content);
    if (!data || data.version !== 1 || !data.bookmarks) return false;

    // The local bookmarks should already match (or the user needs to sync first).
    // We'll push the current local bookmarks as individual files and delete the old files.
    const tree = await chrome.bookmarks.getTree();
    const localFiles = bookmarkTreeToFileMap(tree, base);

    // Build file changes: add all new per-file entries, delete legacy files
    const fileChanges = {};
    for (const [path, content] of Object.entries(localFiles)) {
      fileChanges[path] = content;
    }

    // Delete old legacy files
    const legacyFiles = [
      `${base}/bookmarks.json`,
      `${base}/README.md`,
      `${base}/sync_meta.json`,
    ];
    for (const lf of legacyFiles) {
      try {
        const existing = await api.getFile(lf);
        if (existing) {
          fileChanges[lf] = null; // delete
        }
      } catch { /* ignore */ }
    }

    if (Object.keys(fileChanges).length === 0) return false;

    const deviceId = await getDeviceId();
    const msg = `Migrate to per-file format from ${deviceId.substring(0, 8)}`;
    const newCommitSha = await api.atomicCommit(msg, fileChanges);

    const profileId = await getActiveProfileId();
    // Save sync state
    await saveSyncState(profileId, api, base, localFiles, newCommitSha);

    // Clean up legacy storage keys
    await chrome.storage.local.remove([
      STORAGE_KEYS.LAST_SYNC_DATA,
      STORAGE_KEYS.LAST_REMOTE_SHA_JSON,
      STORAGE_KEYS.LAST_REMOTE_SHA_MD,
      STORAGE_KEYS.LAST_REMOTE_SHA_META,
    ]);

    console.log('[GitSyncMarks] Migration complete');
    return true;
  } catch (err) {
    console.error('[GitSyncMarks] Migration error:', err);
    return false;
  }
}
