/**
 * Profile Manager – Multiple sync profiles (Work/Personal)
 *
 * Each profile has its own GitHub repo config and bookmark set.
 * Switching profiles replaces browser bookmarks with the target profile's data.
 */

import { decryptToken, encryptToken } from './crypto.js';
import { GitHubAPI } from './github-api.js';
import {
  bookmarkTreeToFileMap,
  fileMapToBookmarkTree,
  gitTreeToShaMap,
} from './bookmark-serializer.js';
import { fetchRemoteFileMap } from './remote-fetch.js';
import { replaceLocalBookmarks } from './bookmark-replace.js';

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

export { PROFILES, ACTIVE_PROFILE_ID, PROFILE_TOKENS, SYNC_STATE, DEFAULT_PROFILE_ID };

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
    githubReposEnabled: false,
    githubReposParent: 'other',
    githubReposUsername: '',
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
  const profileIdToUse = profileId || (await getActiveProfileId());
  const profiles = await getProfiles();
  const profile = profiles[profileIdToUse];
  if (!profile) return null;

  const local = await chrome.storage.local.get({ [PROFILE_TOKENS]: {} });
  const tokens = local[PROFILE_TOKENS] || {};
  const encryptedToken = tokens[profileIdToUse] || '';
  const token = await decryptToken(encryptedToken);

  const globals = await chrome.storage.sync.get({
    autoSync: true,
    syncInterval: 15,
    syncOnStartup: false,
    syncOnFocus: false,
    syncProfile: 'normal',
    debounceDelay: 5000,
    notificationsMode: 'all',
  });

  return {
    profileId: profileIdToUse,
    githubToken: token,
    repoOwner: profile.owner || '',
    repoName: profile.repo || '',
    branch: profile.branch || 'main',
    filePath: profile.filePath || 'bookmarks',
    githubReposEnabled: profile.githubReposEnabled || false,
    githubReposParent: profile.githubReposParent || 'other',
    githubReposUsername: profile.githubReposUsername || '',
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

  profiles[id] = {
    ...profiles[id],
    name: data.name ?? profiles[id].name,
    owner: data.owner ?? profiles[id].owner,
    repo: data.repo ?? profiles[id].repo,
    branch: data.branch ?? profiles[id].branch,
    filePath: data.filePath ?? profiles[id].filePath,
    githubReposEnabled: data.githubReposEnabled ?? profiles[id].githubReposEnabled ?? false,
    githubReposParent: data.githubReposParent ?? profiles[id].githubReposParent ?? 'other',
    githubReposUsername: data.githubReposUsername ?? profiles[id].githubReposUsername ?? '',
  };

  await chrome.storage.sync.set({ [PROFILES]: profiles });

  if (data.token !== undefined && data.token !== '') {
    const encrypted = await encryptToken(data.token);
    const local = await chrome.storage.local.get({ [PROFILE_TOKENS]: {} });
    const tokens = local[PROFILE_TOKENS] || {};
    tokens[id] = encrypted;
    await chrome.storage.local.set({ [PROFILE_TOKENS]: tokens });
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
    owner: '',
    repo: '',
    branch: 'main',
    filePath: 'bookmarks',
    githubReposEnabled: false,
    githubReposParent: 'other',
    githubReposUsername: '',
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

// ---- Profile switch ----

/**
 * Switch to another profile. Saves current bookmarks to current profile, loads target profile's bookmarks.
 * Pushes current profile to repo before switch (or saves to cache on failure).
 * @param {string} targetId - Profile ID to switch to
 * @param {{ skipConfirm?: boolean }} options - skipConfirm: true for Add+Switch flows (caller handles confirm)
 */
export async function switchProfile(targetId, options = {}) {
  const profiles = await getProfiles();
  if (!profiles[targetId]) {
    throw new Error('Profile not found');
  }

  const currentId = await getActiveProfileId();
  if (currentId === targetId) return;

  const currentProfile = profiles[currentId];
  const basePath = (currentProfile?.filePath || 'bookmarks').replace(/\/+$/, '');

  const tree = await chrome.bookmarks.getTree();
  const localFiles = bookmarkTreeToFileMap(tree, basePath);

  const state = await getSyncState(currentId);
  state.lastSyncFiles = {};
  for (const [path, content] of Object.entries(localFiles)) {
    state.lastSyncFiles[path] = { sha: null, content };
  }
  await setSyncState(currentId, state);

  const settings = await getProfileSettings(currentId);
  if (settings?.githubToken && settings.repoOwner && settings.repoName) {
    try {
      const api = new GitHubAPI(
        settings.githubToken,
        settings.repoOwner,
        settings.repoName,
        settings.branch
      );
      const deviceId = (await chrome.storage.local.get('deviceId'))?.deviceId || crypto.randomUUID().substring(0, 8);
      const msg = `Bookmark sync (switch) from ${deviceId} — ${new Date().toISOString()}`;
      const fileChanges = {};
      for (const [path, content] of Object.entries(localFiles)) {
        fileChanges[path] = content;
      }
      const commitSha = await api.atomicCommit(msg, fileChanges);
      const commit = await api.getCommit(commitSha);
      const treeEntries = await api.getTree(commit.treeSha);
      const shaMap = gitTreeToShaMap(treeEntries, basePath);
      const syncFiles = {};
      for (const [path, content] of Object.entries(localFiles)) {
        syncFiles[path] = { sha: shaMap[path] || null, content };
      }
      await setSyncState(currentId, {
        lastSyncFiles: syncFiles,
        lastCommitSha: commitSha,
        lastSyncTime: new Date().toISOString(),
        lastSyncWithChangesTime: new Date().toISOString(),
        hasConflict: false,
      });
    } catch (err) {
      console.warn('[GitSyncMarks] Push before switch failed, saved to cache:', err);
    }
  }

  const targetProfile = profiles[targetId];
  const targetBasePath = (targetProfile?.filePath || 'bookmarks').replace(/\/+$/, '');
  const targetState = await getSyncState(targetId);

  let roleMap;
  if (targetState.lastSyncFiles && Object.keys(targetState.lastSyncFiles).length > 0) {
    const fileMap = {};
    for (const [path, info] of Object.entries(targetState.lastSyncFiles)) {
      fileMap[path] = info.content;
    }
    roleMap = fileMapToBookmarkTree(fileMap, targetBasePath);
  } else {
    const targetSettings = await getProfileSettings(targetId);
    if (targetSettings?.githubToken && targetSettings.repoOwner && targetSettings.repoName) {
      try {
        const api = new GitHubAPI(
          targetSettings.githubToken,
          targetSettings.repoOwner,
          targetSettings.repoName,
          targetSettings.branch
        );
        const remote = await fetchRemoteFileMap(api, targetBasePath, null);
        if (remote && Object.keys(remote.fileMap).length > 0) {
          roleMap = fileMapToBookmarkTree(remote.fileMap, targetBasePath);
          await setSyncState(targetId, {
            lastSyncFiles: Object.fromEntries(
              Object.entries(remote.fileMap).map(([p, c]) => [p, { sha: remote.shaMap?.[p] || null, content: c }])
            ),
            lastCommitSha: remote.commitSha,
          });
        } else {
          roleMap = {};
        }
      } catch (err) {
        console.warn('[GitSyncMarks] Pull for target profile failed:', err);
        roleMap = {};
      }
    } else {
      roleMap = {};
    }
  }

  await replaceLocalBookmarks(roleMap, {
    githubReposEnabled: targetProfile?.githubReposEnabled || false,
    githubReposParent: targetProfile?.githubReposParent || 'other',
    githubReposUsername: targetProfile?.githubReposUsername || '',
  });
  await setActiveProfileId(targetId);
  console.log('[GitSyncMarks] Switched to profile', targetId);
}
