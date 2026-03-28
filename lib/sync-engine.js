/**
 * Sync Engine – Per-file bookmark sync with Three-Way-Merge
 *
 * Barrel module: re-exports from focused sub-modules.
 *
 * - sync-settings.js: Storage keys, presets, settings, file map filtering, encrypted settings sync
 * - sync-core.js: Push, pull, sync, three-way merge, debounced auto-sync
 * - sync-history.js: Commit history, restore, diff preview
 * - sync-migration.js: Legacy format migration
 */

// ---- Settings & Configuration ----
export {
  STORAGE_KEYS,
  SYNC_PRESETS,
  getDeviceId,
  normalizeGenMode,
  getSettings,
  isConfigured,
  createApi,
  getLocalFileMap,
  DIFF_IGNORE_SUFFIXES,
  SETTINGS_ENC_PATTERN,
  filterForDiff,
  isGeneratedOrSettingsPath,
  addGeneratedFiles,
  hasBookmarkPayloadFiles,
  buildEncryptedSettings,
  applyEncryptedSettings,
  getRemoteEncryptedSettingsContent,
  listSettingsProfilesFromRepo,
  listRemoteDeviceConfigs,
  importSettingsProfile,
  syncCurrentSettingsToProfile,
  createSettingsProfile,
  deleteSettingsProfile,
  readSettingsIndex,
  writeSettingsIndex,
  importDeviceConfig,
} from './sync-settings.js';

// ---- Core Sync Operations ----
export {
  mergeOrderJson,
  computeDiff,
  mergeDiffs,
  push,
  generateFilesNow,
  pull,
  sync,
  saveSyncState,
  saveSyncStateFromMaps,
  getSyncStatus,
  isSyncInProgress,
  isAutoSyncSuppressed,
  debouncedSync,
  debouncedPush,
  bootstrapFirstSync,
  replaceLocalBookmarks,
  createBookmarkTree,
} from './sync-core.js';

// ---- Sync History & Restore ----
export {
  listSyncHistory,
  restoreFromCommit,
  getPreviousCommitSha,
  getCommitDiffPreview,
} from './sync-history.js';

// ---- Migration ----
export { migrateFromLegacyFormat } from './sync-migration.js';

// ---- Backward compatibility re-export ----
export { fetchRemoteFileMap } from './remote-fetch.js';
