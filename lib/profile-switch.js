/**
 * Profile switch — push current profile, load target bookmarks, apply to browser.
 * Separate from profile-manager.js so switch can statically import commit/sync helpers
 * without creating sync-core ↔ profile-manager cycles in the MV3 service worker.
 */

import { createGitProvider } from './git-provider.js';
import {
  bookmarkTreeToFileMap,
  fileMapToBookmarkTree,
} from './bookmark-serializer.js';
import { fetchRemoteFileMap } from './remote-fetch.js';
import { replaceLocalBookmarks } from './bookmark-replace.js';
import { commitBookmarkChanges } from './commit-bookmarks.js';
import {
  saveSyncState,
  _acquireSyncLock,
  _releaseSyncLock,
  _suppressAutoSyncUntil,
} from './sync-core.js';
import {
  buildSwitchPushChanges,
  mergeLocalIntoSyncFiles,
  loadTargetFileMapForSwitch,
} from './profile-switch-logic.js';
import {
  getProfiles,
  getActiveProfileId,
  setActiveProfileId,
  getSyncState,
  setSyncState,
  getProfileSettings,
  clearPendingLocalDeletes,
} from './profile-manager.js';
import { getMessage } from './i18n.js';
import { clearApplyInProgress } from './bookmark-replace.js';

/** @typedef {{ phase?: string, step?: number, totalSteps?: number, current?: number, total?: number }} ProfileSwitchProgress */

const PROFILE_SWITCH_STEPS = 3;

/**
 * Switch to another profile. Saves current bookmarks to current profile, loads target profile's bookmarks.
 * Pushes current profile to repo before switch (or saves to cache on failure).
 * @param {string} targetId - Profile ID to switch to
 * @param {{ skipConfirm?: boolean, onProgress?: (progress: ProfileSwitchProgress) => void }} options
 */
export async function switchProfile(targetId, options = {}) {
  const { onProgress } = options;
  const reportStep = (step, extra = {}) => {
    onProgress?.({ phase: 'switching', step, totalSteps: PROFILE_SWITCH_STEPS, ...extra });
  };
  if (!_acquireSyncLock()) {
    return { success: false, alreadyInProgress: true, message: getMessage('sync_alreadyInProgress') };
  }
  try {
  const profiles = await getProfiles();
  if (!profiles[targetId]) {
    throw new Error('Profile not found');
  }

  const currentId = await getActiveProfileId();
  if (currentId === targetId) return { success: true };

  const currentProfile = profiles[currentId];
  const basePath = (currentProfile?.filePath || 'bookmarks').replace(/\/+$/, '');

  const tree = await chrome.bookmarks.getTree();
  const localFiles = bookmarkTreeToFileMap(tree, basePath);

  const currentState = await getSyncState(currentId);

  const targetProfile = profiles[targetId];
  const targetState = await getSyncState(targetId);
  const targetSettings = await getProfileSettings(targetId);
  const targetIsEmpty =
    !targetState.lastSyncFiles || Object.keys(targetState.lastSyncFiles).length === 0;
  const targetHasNoConfig =
    !targetSettings?.githubToken || !targetSettings.repoOwner || !targetSettings.repoName;

  // When switching to an empty, unconfigured profile: skip remote push to avoid slow API calls.
  const skipPush = targetIsEmpty && targetHasNoConfig;

  reportStep(1);

  const settings = await getProfileSettings(currentId);
  if (
    settings?.githubToken &&
    settings.repoOwner &&
    settings.repoName &&
    !skipPush
  ) {
    try {
      const api = createGitProvider({
        provider: settings.gitProvider || 'github',
        token: settings.githubToken,
        owner: settings.repoOwner,
        repo: settings.repoName,
        branch: settings.branch,
        serverUrl: settings.serverUrl || '',
      });
      const deviceId = (await chrome.storage.local.get('deviceId'))?.deviceId || crypto.randomUUID().substring(0, 8);
      const msg = `Bookmark sync (switch) from ${deviceId} — ${new Date().toISOString()}`;
      const { fileChanges, hasChanges } = buildSwitchPushChanges(
        localFiles,
        currentState.lastSyncFiles,
        settings.bitwardenBackupPath
      );

      if (!hasChanges) {
        await setSyncState(currentId, {
          lastSyncFiles: mergeLocalIntoSyncFiles(localFiles, currentState.lastSyncFiles),
          lastSyncTime: new Date().toISOString(),
          hasConflict: false,
        });
      } else {
        const commitSha = await commitBookmarkChanges(api, msg, fileChanges, (payload) => {
          if (payload?.phase === 'pushing') {
            onProgress?.({
              phase: 'pushing',
              step: 1,
              totalSteps: PROFILE_SWITCH_STEPS,
              current: payload.current,
              total: payload.total,
            });
          }
        });
        await saveSyncState(currentId, api, basePath, localFiles, commitSha);
        await setSyncState(currentId, { hasConflict: false });
        await clearPendingLocalDeletes(currentId);
      }
    } catch (err) {
      console.warn('[GitSyncMarks] Push before switch failed, saved to cache:', err);
      await setSyncState(currentId, {
        lastSyncFiles: mergeLocalIntoSyncFiles(localFiles, currentState.lastSyncFiles),
        lastSyncTime: new Date().toISOString(),
      });
    }
  } else {
    await setSyncState(currentId, {
      lastSyncFiles: mergeLocalIntoSyncFiles(localFiles, currentState.lastSyncFiles),
      lastSyncTime: new Date().toISOString(),
    });
  }

  const targetBasePath = (targetProfile?.filePath || 'bookmarks').replace(/\/+$/, '');

  reportStep(2);

  const { fileMap: targetFileMap, syncStateUpdate } = await loadTargetFileMapForSwitch({
    targetState,
    targetSettings,
    targetBasePath,
    createGitProvider,
    fetchRemoteFileMap,
    log: (message) => console.warn('[GitSyncMarks]', message),
  });

  if (syncStateUpdate) {
    await setSyncState(targetId, syncStateUpdate);
  }

  const roleMap = fileMapToBookmarkTree(targetFileMap, targetBasePath);

  reportStep(3);

  _suppressAutoSyncUntil(Date.now() + 30000);
  await setActiveProfileId(targetId);
  await replaceLocalBookmarks(roleMap, {
    githubReposEnabled: targetProfile?.githubReposEnabled || false,
    githubReposParent: targetProfile?.githubReposParent || 'other',
    githubReposUsername: targetProfile?.githubReposUsername || '',
    profileId: targetId,
    commitSha: syncStateUpdate?.lastCommitSha || targetState.lastCommitSha || null,
  });
  await clearApplyInProgress();
  await clearPendingLocalDeletes(currentId);
  await clearPendingLocalDeletes(targetId);
  console.log('[GitSyncMarks] Switched to profile', targetId);
  return { success: true };
  } finally {
    _releaseSyncLock();
  }
}
