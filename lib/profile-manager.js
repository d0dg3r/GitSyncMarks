/**
 * Profile Manager – Multiple sync profiles (Work/Personal)
 *
 * Each profile has its own GitHub repo config and bookmark set.
 * Switching profiles replaces browser bookmarks with the target profile's data.
 */

import { decryptToken, encryptToken } from './crypto.js';
import { DEFAULT_DELETE_GUARD_MAX_FRACTION } from './deletion-guard.js';

// ---- Storage keys ----

const PROFILES = 'profiles';
const ACTIVE_PROFILE_ID = 'activeProfileId';
const PROFILE_TOKENS = 'profileTokens';
const SYNC_STATE = 'syncState';
const MAX_PROFILES = 10;
const DEFAULT_PROFILE_ID = 'default';

// Legacy keys for migration
const LEGACY_KEYS = {
  GITHUB_TOKEN: 'githubToken',
  REPO_OWNER: 'repoOwner',
  REPO_NAME: 'repoName',
  BRANCH: 'branch',
  FILE_PATH: 'filePath',
  LAST_SYNC_FILES: 'lastSyncFiles',
  LAST_COMMIT_SHA: 'lastCommitSha',
  LAST_SYNC_TIME: 'lastSyncTime',
  LAST_SYNC_WITH_CHANGES_TIME: 'lastSyncWithChangesTime',
  HAS_CONFLICT: 'hasConflict',
};

export { PROFILES, ACTIVE_PROFILE_ID, PROFILE_TOKENS, SYNC_STATE, DEFAULT_PROFILE_ID, MAX_PROFILES };

/**
 * Migrate legacy flat profileTokens[profileId] string to { primary: string }.
 * @returns {Promise<boolean>}
 */
export async function migrateProfileTokens() {
  const local = await chrome.storage.local.get({ [PROFILE_TOKENS]: {} });
  const tokens = local[PROFILE_TOKENS] || {};
  let changed = false;
  for (const [profileId, value] of Object.entries(tokens)) {
    if (typeof value === 'string' && value) {
      tokens[profileId] = { primary: value, mirrors: {} };
      changed = true;
    } else if (value && typeof value === 'object' && !value.primary && typeof value.mirrors !== 'object') {
      tokens[profileId] = { primary: '', mirrors: {} };
      changed = true;
    }
  }
  if (changed) {
    await chrome.storage.local.set({ [PROFILE_TOKENS]: tokens });
  }
  return changed;
}

/**
 * @param {string} profileId
 * @param {'primary'|string} slot
 * @returns {Promise<string>} encrypted token or empty
 */
export async function getEncryptedProfileToken(profileId, slot = 'primary') {
  await migrateProfileTokens();
  const local = await chrome.storage.local.get({ [PROFILE_TOKENS]: {} });
  const entry = local[PROFILE_TOKENS]?.[profileId];
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  if (slot === 'primary') return entry.primary || '';
  return entry.mirrors?.[slot] || '';
}

/**
 * @param {string} profileId
 * @param {string} encrypted
 * @param {'primary'|string} slot
 */
export async function setEncryptedProfileToken(profileId, encrypted, slot = 'primary') {
  await migrateProfileTokens();
  const local = await chrome.storage.local.get({ [PROFILE_TOKENS]: {} });
  const tokens = local[PROFILE_TOKENS] || {};
  let entry = tokens[profileId];
  if (!entry || typeof entry === 'string') {
    entry = { primary: typeof entry === 'string' ? entry : '', mirrors: {} };
  }
  if (slot === 'primary') {
    entry.primary = encrypted;
  } else {
    entry.mirrors = entry.mirrors || {};
    if (encrypted) {
      entry.mirrors[slot] = encrypted;
    } else {
      delete entry.mirrors[slot];
    }
  }
  tokens[profileId] = entry;
  await chrome.storage.local.set({ [PROFILE_TOKENS]: tokens });
}

/**
 * @param {string} profileId
 * @param {'primary'|string} [slot]
 * @returns {Promise<string>} decrypted token
 */
export async function getProfileToken(profileId, slot = 'primary') {
  const encrypted = await getEncryptedProfileToken(profileId, slot);
  return encrypted ? decryptToken(encrypted) : '';
}

// ---- Migration ----

/**
 * Migrate legacy single-config to profiles format.
 * @returns {Promise<boolean>} true if migration was performed
 */
export async function migrateToProfiles() {
  const sync = await chrome.storage.sync.get([
    PROFILES,
    ACTIVE_PROFILE_ID,
    LEGACY_KEYS.REPO_OWNER,
    LEGACY_KEYS.REPO_NAME,
    LEGACY_KEYS.BRANCH,
    LEGACY_KEYS.FILE_PATH,
  ]);

  if (sync[PROFILES] && Object.keys(sync[PROFILES]).length > 0) {
    return false;
  }

  const local = await chrome.storage.local.get([
    LEGACY_KEYS.GITHUB_TOKEN,
    LEGACY_KEYS.LAST_SYNC_FILES,
    LEGACY_KEYS.LAST_COMMIT_SHA,
  ]);

  const defaultProfile = {
    id: DEFAULT_PROFILE_ID,
    name: 'Default',
    owner: sync[LEGACY_KEYS.REPO_OWNER] || '',
    repo: sync[LEGACY_KEYS.REPO_NAME] || '',
    branch: sync[LEGACY_KEYS.BRANCH] || 'main',
    filePath: sync[LEGACY_KEYS.FILE_PATH] || 'bookmarks',
    gitProvider: 'github',
    serverUrl: '',
    githubReposEnabled: false,
    githubReposParent: 'other',
    githubReposUsername: '',
    contextQuickFolderIds: [],
    mirrors: [],
    deleteGuardEnabled: true,
    deleteGuardMaxFraction: DEFAULT_DELETE_GUARD_MAX_FRACTION,
  };

  const profiles = { [DEFAULT_PROFILE_ID]: defaultProfile };
  const profileTokens = local[LEGACY_KEYS.GITHUB_TOKEN]
    ? { [DEFAULT_PROFILE_ID]: local[LEGACY_KEYS.GITHUB_TOKEN] }
    : {};
  const syncState = {};
  if (local[LEGACY_KEYS.LAST_SYNC_FILES] || local[LEGACY_KEYS.LAST_COMMIT_SHA]) {
    syncState[DEFAULT_PROFILE_ID] = {
      lastSyncFiles: local[LEGACY_KEYS.LAST_SYNC_FILES] || null,
      lastCommitSha: local[LEGACY_KEYS.LAST_COMMIT_SHA] || null,
      lastSyncTime: (await chrome.storage.local.get(LEGACY_KEYS.LAST_SYNC_TIME))[LEGACY_KEYS.LAST_SYNC_TIME] || null,
      lastSyncWithChangesTime: (await chrome.storage.local.get(LEGACY_KEYS.LAST_SYNC_WITH_CHANGES_TIME))[LEGACY_KEYS.LAST_SYNC_WITH_CHANGES_TIME] || null,
      hasConflict: (await chrome.storage.local.get(LEGACY_KEYS.HAS_CONFLICT))[LEGACY_KEYS.HAS_CONFLICT] || false,
    };
  }

  await chrome.storage.sync.set({
    [PROFILES]: profiles,
    [ACTIVE_PROFILE_ID]: DEFAULT_PROFILE_ID,
  });
  await chrome.storage.local.set({
    [PROFILE_TOKENS]: profileTokens,
    [SYNC_STATE]: syncState,
  });
  await chrome.storage.local.remove([
    LEGACY_KEYS.GITHUB_TOKEN,
    LEGACY_KEYS.LAST_SYNC_FILES,
    LEGACY_KEYS.LAST_COMMIT_SHA,
    LEGACY_KEYS.LAST_SYNC_TIME,
    LEGACY_KEYS.LAST_SYNC_WITH_CHANGES_TIME,
    LEGACY_KEYS.HAS_CONFLICT,
  ]);

  console.log('[GitSyncMarks] Migrated to profiles format');
  return true;
}

// ---- Profile CRUD ----

export async function getProfiles() {
  const result = await chrome.storage.sync.get({ [PROFILES]: {} });
  return result[PROFILES] || {};
}

export async function getActiveProfileId() {
  const result = await chrome.storage.sync.get({ [ACTIVE_PROFILE_ID]: DEFAULT_PROFILE_ID });
  return result[ACTIVE_PROFILE_ID] || DEFAULT_PROFILE_ID;
}

export async function setActiveProfileId(id) {
  await chrome.storage.sync.set({ [ACTIVE_PROFILE_ID]: id });
}

export async function getActiveProfile() {
  const profiles = await getProfiles();
  const activeId = await getActiveProfileId();
  return profiles[activeId] || null;
}

/**
 * Get profile config + decrypted token for sync-engine.
 * Merged with global settings from sync storage.
 */
export async function getProfileSettings(profileId) {
  await migrateToProfiles();
  await migrateProfileTokens();
  const profileIdToUse = profileId || (await getActiveProfileId());
  const profiles = await getProfiles();
  const profile = profiles[profileIdToUse];
  if (!profile) return null;

  const token = await getProfileToken(profileIdToUse, 'primary');

  const globals = await chrome.storage.sync.get({
    autoSync: true,
    syncInterval: 15,
    syncOnStartup: false,
    syncOnFocus: false,
    syncProfile: 'normal',
    debounceDelay: 5000,
    notificationsMode: 'all',
    generateReadmeMd: 'auto',
    generateBookmarksHtml: 'auto',
    generateFeedXml: 'auto',
    generateDashyYml: 'off',
    syncSettingsToGit: false,
    settingsSyncMode: 'individual',
    settingsSyncGlobalWriteEnabled: false,
    bitwardenBackupPath: 'backups/bitwarden',
  });

  return {
    profileId: profileIdToUse,
    githubToken: token,
    gitProvider: profile.gitProvider || 'github',
    serverUrl: profile.serverUrl || '',
    repoOwner: profile.owner || '',
    repoName: profile.repo || '',
    branch: profile.branch || 'main',
    filePath: profile.filePath || 'bookmarks',
    githubReposEnabled: profile.githubReposEnabled || false,
    githubReposParent: profile.githubReposParent || 'other',
    githubReposUsername: profile.githubReposUsername || '',
    contextQuickFolderIds: Array.isArray(profile.contextQuickFolderIds)
      ? profile.contextQuickFolderIds.slice(0, 3)
      : [],
    mirrors: Array.isArray(profile.mirrors) ? profile.mirrors : [],
    deleteGuardEnabled: profile.deleteGuardEnabled !== false,
    deleteGuardMaxFraction:
      typeof profile.deleteGuardMaxFraction === 'number'
        ? profile.deleteGuardMaxFraction
        : DEFAULT_DELETE_GUARD_MAX_FRACTION,
    ...globals,
  };
}

/**
 * Get settings for the active profile (used by sync-engine).
 */
export async function getSettingsForSync() {
  return getProfileSettings(null);
}

export async function saveProfile(id, data) {
  const profiles = await getProfiles();
  if (!profiles[id]) {
    console.warn('[GitSyncMarks] saveProfile: profile not found', id);
    return;
  }

  const oldPath = (profiles[id].filePath || 'bookmarks').replace(/\/+$/, '');
  const oldOwner = profiles[id].owner || '';
  const oldRepo = profiles[id].repo || '';

  profiles[id] = {
    ...profiles[id],
    name: data.name ?? profiles[id].name,
    gitProvider: data.gitProvider ?? profiles[id].gitProvider ?? 'github',
    serverUrl: data.serverUrl ?? profiles[id].serverUrl ?? '',
    owner: data.owner ?? profiles[id].owner,
    repo: data.repo ?? profiles[id].repo,
    branch: data.branch ?? profiles[id].branch,
    filePath: data.filePath ?? profiles[id].filePath,
    githubReposEnabled: data.githubReposEnabled ?? profiles[id].githubReposEnabled ?? false,
    githubReposParent: data.githubReposParent ?? profiles[id].githubReposParent ?? 'other',
    githubReposUsername: data.githubReposUsername ?? profiles[id].githubReposUsername ?? '',
    contextQuickFolderIds: Array.isArray(data.contextQuickFolderIds)
      ? data.contextQuickFolderIds.slice(0, 3)
      : (profiles[id].contextQuickFolderIds ?? []),
    mirrors: Array.isArray(data.mirrors) ? data.mirrors : (profiles[id].mirrors ?? []),
    deleteGuardEnabled:
      data.deleteGuardEnabled !== undefined
        ? data.deleteGuardEnabled
        : profiles[id].deleteGuardEnabled !== false,
    deleteGuardMaxFraction:
      typeof data.deleteGuardMaxFraction === 'number'
        ? data.deleteGuardMaxFraction
        : profiles[id].deleteGuardMaxFraction ?? DEFAULT_DELETE_GUARD_MAX_FRACTION,
  };

  const newPath = (profiles[id].filePath || 'bookmarks').replace(/\/+$/, '');
  const newOwner = profiles[id].owner || '';
  const newRepo = profiles[id].repo || '';

  // Invalidate sync state whenever the target repository or path changes.
  // This prevents stale commit SHAs from a previous (possibly deleted/recreated) repo
  // from being carried over and breaking the wizard or first sync (issue #51).
  const repoChanged = newOwner !== oldOwner || newRepo !== oldRepo;
  const pathChanged = newPath !== oldPath;
  if (repoChanged || pathChanged) {
    await setSyncState(id, { lastSyncFiles: null, lastCommitSha: null, hasConflict: false });
    console.log('[GitSyncMarks] Sync state cleared: repo or path changed', { repoChanged, pathChanged });
  }

  await chrome.storage.sync.set({ [PROFILES]: profiles });

  if (data.token !== undefined && data.token !== '') {
    const encrypted = await encryptToken(data.token);
    await setEncryptedProfileToken(id, encrypted, 'primary');
  }
}

export async function addProfile(name = 'New Profile') {
  const profiles = await getProfiles();
  if (Object.keys(profiles).length >= MAX_PROFILES) {
    throw new Error('Maximum number of profiles reached');
  }

  const id = crypto.randomUUID();
  profiles[id] = {
    id,
    name,
    gitProvider: 'github',
    serverUrl: '',
    owner: '',
    repo: '',
    branch: 'main',
    filePath: 'bookmarks',
    githubReposEnabled: false,
    githubReposParent: 'other',
    githubReposUsername: '',
    contextQuickFolderIds: [],
    mirrors: [],
    deleteGuardEnabled: true,
    deleteGuardMaxFraction: DEFAULT_DELETE_GUARD_MAX_FRACTION,
  };
  await chrome.storage.sync.set({ [PROFILES]: profiles });
  return id;
}

export async function deleteProfile(id) {
  const profiles = await getProfiles();
  const activeId = await getActiveProfileId();

  if (Object.keys(profiles).length <= 1) {
    throw new Error('Cannot delete the last profile');
  }

  delete profiles[id];
  const local = await chrome.storage.local.get({ [PROFILE_TOKENS]: {}, [SYNC_STATE]: {} });
  const tokens = local[PROFILE_TOKENS] || {};
  const syncState = local[SYNC_STATE] || {};
  delete tokens[id];
  delete syncState[id];
  await chrome.storage.local.set({ [PROFILE_TOKENS]: tokens, [SYNC_STATE]: syncState });
  await chrome.storage.sync.set({ [PROFILES]: profiles });

  if (activeId === id) {
    const newActive = Object.keys(profiles)[0];
    await setActiveProfileId(newActive);
  }
}

// ---- Sync state (per profile) ----

export async function getSyncState(profileId) {
  const id = profileId || (await getActiveProfileId());
  const local = await chrome.storage.local.get({ [SYNC_STATE]: {} });
  const state = local[SYNC_STATE] || {};
  return state[id] || {};
}

export async function setSyncState(profileId, state) {
  const id = profileId || (await getActiveProfileId());
  const local = await chrome.storage.local.get({ [SYNC_STATE]: {} });
  const allState = local[SYNC_STATE] || {};
  allState[id] = { ...allState[id], ...state };
  await chrome.storage.local.set({ [SYNC_STATE]: allState });
}

export async function getHasConflict(profileId) {
  const state = await getSyncState(profileId);
  return state.hasConflict || false;
}

/**
 * Mark that the user changed browser bookmarks since the last successful sync.
 * Used to prefer pushing local deletes over pulling stale remote files (path 8 guard).
 * @param {string|null} [profileId]
 */
export async function markLocalBookmarksModified(profileId = null) {
  const id = profileId || (await getActiveProfileId());
  await setSyncState(id, { localModifiedSinceSync: true });
}
