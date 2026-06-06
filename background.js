/**
 * Background Service Worker
 * Listens to bookmark events for auto-sync, manages periodic sync via alarms,
 * handles messages from popup/options pages, and triggers migration on first run.
 */

const browserObj = typeof browser !== 'undefined' ? browser : chrome;

import { initI18n, getMessage } from './lib/i18n.js';
import { WHATS_NEW_STORAGE_KEY } from './lib/whats-new.js';
import {
  debouncedSync,
  sync,
  push,
  pull,
  bootstrapFirstSync,
  getSyncStatus,
  getSettings,
  isConfigured,
  generateFilesNow,
  isSyncInProgress,
  isAutoSyncSuppressed,
  migrateFromLegacyFormat,
  listRemoteDeviceConfigs,
  importDeviceConfig,
  listSettingsProfilesFromRepo,
  importSettingsProfile,
  syncCurrentSettingsToProfile,
  createSettingsProfile,
  deleteSettingsProfile,
  listSyncHistory,
  restoreFromCommit,
  getPreviousCommitSha,
  getCommitDiffPreview,
  setSyncActivityListener,
  previewRemoteOrphans,
  cleanRemoteOrphans,
  pushBitwardenBackup,
  listBitwardenBackups,
  downloadBitwardenBackup,
  deleteBitwardenBackup,
  STORAGE_KEYS,
} from './lib/sync-engine.js';
import { startKeepAlive, stopKeepAlive } from './lib/keep-alive.js';
import { log as debugLog, getLogAsString, getDebugLogExportContent } from './lib/debug-log.js';
import { createApi } from './lib/sync-settings.js';
import { previewTransfer, transferBookmarks } from './lib/profile-transfer.js';
import { testMirrorConnection } from './lib/mirror-push.js';
import { migrateTokenIfNeeded } from './lib/crypto.js';
import { migrateToProfiles, getActiveProfileId, getActiveProfile, getProfiles, switchProfile, getSyncState, markLocalBookmarksModified } from './lib/profile-manager.js';
import {
  setupContextMenus,
  handleContextMenuClick,
  refreshProfileMenuItems,
  refreshContextMenuDynamicItemsDebounced,
} from './lib/context-menu.js';

const ALARM_NAME = 'bookmarkSyncPull';
const NOTIFICATION_ID = 'gitsyncmarks-sync';

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'profileTransfer') {
    port.onMessage.addListener((msg) => {
      void handleProfileTransferPortMessage(port, msg);
    });
    return;
  }
  if (port.name === 'syncProgress') {
    port.onMessage.addListener((msg) => {
      void handleSyncProgressPortMessage(port, msg);
    });
  }
});

/**
 * @param {chrome.runtime.Port} port
 * @param {{ action?: string, params?: object }} msg
 */
async function handleProfileTransferPortMessage(port, msg) {
  const onProgress = (progress) => {
    try {
      port.postMessage({ type: 'transferProgress', ...progress });
    } catch {
      /* options page closed */
    }
  };

  try {
    if (msg.action === 'previewTransfer') {
      const result = await previewTransfer(msg.params, onProgress);
      port.postMessage({ type: 'transferDone', result });
      return;
    }
    if (msg.action === 'transferBookmarks') {
      const result = await transferBookmarks(msg.params, onProgress);
      port.postMessage({ type: 'transferDone', result });
      return;
    }
    port.postMessage({ type: 'transferDone', error: 'Unknown action' });
  } catch (err) {
    port.postMessage({ type: 'transferDone', error: err?.message || String(err) });
  }
}

/**
 * @param {chrome.runtime.Port} port
 * @param {{ action?: string, params?: object }} msg
 */
async function handleSyncProgressPortMessage(port, msg) {
  const onProgress = (progress) => {
    try {
      port.postMessage({ type: 'syncProgress', ...progress });
    } catch {
      /* popup/options closed */
    }
  };

  try {
    const params = msg.params || {};
    if (msg.action === 'sync') {
      const result = await sync({ onProgress });
      await updateSyncStatusBadge(result);
      await showNotificationIfEnabled(result);
      port.postMessage({ type: 'syncDone', result });
      return;
    }
    if (msg.action === 'push') {
      const result = await push({ onProgress });
      await updateSyncStatusBadge(result);
      await showNotificationIfEnabled(result);
      port.postMessage({ type: 'syncDone', result });
      return;
    }
    if (msg.action === 'bootstrapFirstSync') {
      const result = await bootstrapFirstSync(params.connection || null, { onProgress });
      await updateSyncStatusBadge(result);
      port.postMessage({ type: 'syncDone', result });
      return;
    }
    if (msg.action === 'pull') {
      const result = await pull({ onProgress, connectionOverride: params.connection || null });
      await updateSyncStatusBadge(result);
      await showNotificationIfEnabled(result);
      port.postMessage({ type: 'syncDone', result });
      return;
    }
    if (msg.action === 'generateFilesNow') {
      startKeepAlive();
      try {
        const result = await generateFilesNow({ onProgress });
        await updateSyncStatusBadge(result);
        await showNotificationIfEnabled(result);
        port.postMessage({ type: 'syncDone', result });
      } finally {
        stopKeepAlive();
      }
      return;
    }
    port.postMessage({ type: 'syncDone', error: 'Unknown action' });
  } catch (err) {
    port.postMessage({ type: 'syncDone', error: err?.message || String(err) });
  }
}

const ONBOARDING_WIZARD_COMPLETED = 'onboardingWizardCompleted';
const ONBOARDING_WIZARD_DISMISSED = 'onboardingWizardDismissed';

// Keep the non-persistent background alive while any sync/push/pull/restore runs,
// so long operations are not terminated mid-flight (issue #143).
setSyncActivityListener((active) => {
  if (active) startKeepAlive();
  else stopKeepAlive();
});

async function shouldAutoOpenOnboardingWizard() {
  const state = await chrome.storage.sync.get({
    [ONBOARDING_WIZARD_COMPLETED]: false,
    [ONBOARDING_WIZARD_DISMISSED]: false,
  });
  return state[ONBOARDING_WIZARD_COMPLETED] !== true && state[ONBOARDING_WIZARD_DISMISSED] !== true;
}

async function showNotificationIfEnabled(result) {
  try {
    const settings = await getSettings();
    const mode = settings[STORAGE_KEYS.NOTIFICATIONS_MODE] ?? 'all';
    if (mode === 'off') return;
    if (mode === 'errorsOnly' && result.success) return;
    const title = result.success ? getMessage('notification_titleSuccess') : getMessage('notification_titleFailure');
    await chrome.notifications.create(NOTIFICATION_ID, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128-plain.png'),
      title,
      message: result.message || '',
    });
  } catch (err) {
    console.warn('[GitSyncMarks] Failed to show notification:', err);
  }
}

/**
 * Update the extension icon badge and tooltip based on sync result.
 * Orange badge '!' for errors, clear for success.
 */
async function updateSyncStatusBadge(result) {
  try {
    if (result.success) {
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({ title: 'GitSyncMarks' });
    } else {
      await chrome.action.setBadgeText({ text: '!' });
      await chrome.action.setBadgeBackgroundColor({ color: '#FF9800' }); // Orange / Amber
      await chrome.action.setTitle({ title: `Sync Error: ${result.message || 'Unknown error'}` });
    }
  } catch (err) {
    console.warn('[GitSyncMarks] Failed to update badge:', err);
  }
}

// ---- Context menu click handler (top-level for SW persistence) ----

browserObj.contextMenus.onClicked.addListener(handleContextMenuClick);

// ---- Bookmark event listeners ----

chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log('[GitSyncMarks] Bookmark created:', bookmark.title);
  refreshContextMenuDynamicItemsDebounced();
  markLocalBookmarksModified().catch(() => {});
  triggerAutoSync();
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  console.log('[GitSyncMarks] Bookmark removed:', id);
  refreshContextMenuDynamicItemsDebounced();
  markLocalBookmarksModified().catch(() => {});
  triggerAutoSync();
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  console.log('[GitSyncMarks] Bookmark changed:', id, changeInfo);
  refreshContextMenuDynamicItemsDebounced();
  markLocalBookmarksModified().catch(() => {});
  triggerAutoSync();
});

chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  console.log('[GitSyncMarks] Bookmark moved:', id);
  refreshContextMenuDynamicItemsDebounced();
  markLocalBookmarksModified().catch(() => {});
  triggerAutoSync();
});

/**
 * Trigger auto-sync if enabled (debounced).
 * Now uses debouncedSync (three-way merge) instead of debouncedPush.
 */
async function triggerAutoSync() {
  if (isSyncInProgress()) return;
  if (isAutoSyncSuppressed()) return;

  const settings = await getSettings();
  if (settings[STORAGE_KEYS.AUTO_SYNC] && isConfigured(settings)) {
    await debugLog('background: auto-sync triggered (bookmark event)');
    const delayMs = settings[STORAGE_KEYS.DEBOUNCE_DELAY] ?? 5000;
    debouncedSync(delayMs, showNotificationIfEnabled);
  }
}

// ---- Alarm for periodic sync ----

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await debugLog('background: periodic sync alarm triggered');
    console.log('[GitSyncMarks] Periodic sync triggered');
    const settings = await getSettings();
    if (isConfigured(settings) && settings[STORAGE_KEYS.AUTO_SYNC]) {
      const result = await sync();
      console.log('[GitSyncMarks] Periodic sync result:', result.message);

      await updateSyncStatusBadge(result);
      await showNotificationIfEnabled(result);
    }
  }
});

// ---- Sync on browser focus ----

const FOCUS_SYNC_COOLDOWN_MS = 60000; // 60 seconds

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE || windowId < 0) return;

  const settings = await getSettings();
  if (!settings[STORAGE_KEYS.SYNC_ON_FOCUS] || !isConfigured(settings)) return;

  const profileId = settings.profileId || await getActiveProfileId();
  const syncState = await getSyncState(profileId);
  const lastSync = syncState.lastSyncTime;
  if (lastSync) {
    const elapsed = Date.now() - new Date(lastSync).getTime();
    if (elapsed < FOCUS_SYNC_COOLDOWN_MS) return;
  }

  if (isSyncInProgress()) return;

  await debugLog('background: sync on focus triggered');
  console.log('[GitSyncMarks] Sync on focus triggered');
  const result = await sync();
  await updateSyncStatusBadge(result);
  await showNotificationIfEnabled(result);
});

async function setupAlarm() {
  const settings = await getSettings();
  const interval = settings[STORAGE_KEYS.SYNC_INTERVAL] || 15;

  await chrome.alarms.clear(ALARM_NAME);

  if (settings[STORAGE_KEYS.AUTO_SYNC] && isConfigured(settings)) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: interval });
    console.log(`[GitSyncMarks] Periodic sync alarm set: every ${interval} minutes`);
  }
}

// ---- Migration check ----

async function checkAndMigrate() {
  try {
    const settings = await getSettings();
    if (!isConfigured(settings)) return;

    // Check if we already have the new format state (per-profile after migrateToProfiles)
    const profileId = settings.profileId || await getActiveProfileId();
    const syncState = await getSyncState(profileId);
    const hasNewFormat = syncState?.lastSyncFiles && typeof syncState.lastSyncFiles === 'object'
      && Object.keys(syncState.lastSyncFiles).length > 0;
    if (hasNewFormat) return; // Already migrated

    const api = createApi(settings);
    const basePath = settings[STORAGE_KEYS.FILE_PATH] || 'bookmarks';

    const migrated = await migrateFromLegacyFormat(api, basePath);
    if (migrated) {
      console.log('[GitSyncMarks] Successfully migrated to per-file format');
    }
  } catch (err) {
    console.warn('[GitSyncMarks] Migration check failed:', err);
  }
}

// ---- Message handler for popup/options ----

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sync') {
    sync().then(async (result) => {
      await updateSyncStatusBadge(result);
      await showNotificationIfEnabled(result);
      sendResponse(result);
    });
    return true;
  }
  if (message.action === 'push') {
    push().then(async (result) => {
      await updateSyncStatusBadge(result);
      await showNotificationIfEnabled(result);
      sendResponse(result);
    });
    return true;
  }
  if (message.action === 'bootstrapFirstSync') {
    bootstrapFirstSync(message.connection || null)
      .then(async (result) => {
        await updateSyncStatusBadge(result);
        sendResponse(result);
      })
      .catch((err) => sendResponse({ success: false, message: err?.message || 'Bootstrap failed' }));
    return true;
  }
  if (message.action === 'generateFilesNow') {
    startKeepAlive();
    generateFilesNow()
      .then(async (result) => {
        await updateSyncStatusBadge(result);
        await showNotificationIfEnabled(result);
        sendResponse(result);
      })
      .catch((err) => sendResponse({ success: false, message: err?.message || 'Generate failed' }))
      .finally(() => stopKeepAlive());
    return true;
  }
  if (message.action === 'pull') {
    pull().then(async (result) => {
      await updateSyncStatusBadge(result);
      await showNotificationIfEnabled(result);
      sendResponse(result);
    });
    return true;
  }
  if (message.action === 'getStatus') {
    Promise.all([getSyncStatus(), getActiveProfile(), getProfiles(), getActiveProfileId()])
      .then(([status, profile, profiles, activeProfileId]) => {
        const profileList = Object.entries(profiles || {}).map(([id, p]) => ({ id, name: p.name || id }));
        sendResponse({
          ...status,
          profileName: profile?.name || null,
          profiles: profileList,
          activeProfileId: activeProfileId || null,
        });
      })
      .catch((err) => {
        console.error('[GitSyncMarks] getStatus failed:', err);
        sendResponse({ configured: false, hasConflict: false, profileName: null, profiles: [], activeProfileId: null });
      });
    return true;
  }
  if (message.action === 'previewTransfer') {
    previewTransfer(message.params)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (message.action === 'transferBookmarks') {
    transferBookmarks(message.params)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'previewRemoteOrphans') {
    previewRemoteOrphans(message.profileId)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'cleanRemoteOrphans') {
    cleanRemoteOrphans(message.profileId)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'testMirror') {
    testMirrorConnection(message.profileId, message.mirror, message.token || null)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, message: err.message }));
    return true;
  }
  if (message.action === 'switchProfile') {
    const { targetId } = message;
    if (!targetId) {
      sendResponse({ success: false, message: 'Missing targetId' });
      return false;
    }
    switchProfile(targetId)
      .then(async () => {
        await refreshProfileMenuItems();
        sendResponse({ success: true, message: getMessage('sync_loadedFromRemote') });
      })
      .catch((err) => {
        console.error('[GitSyncMarks] switchProfile failed:', err);
        sendResponse({ success: false, message: err.message || 'Switch failed' });
      });
    return true;
  }
  if (message.action === 'createRepository') {
    const { token, owner, repo, branch, gitProvider, serverUrl } = message;
    if (!token || !owner || !repo) {
      sendResponse({ success: false, message: 'Missing token/owner/repo' });
      return false;
    }
    const api = createApi({
      [STORAGE_KEYS.GITHUB_TOKEN]: token,
      [STORAGE_KEYS.REPO_OWNER]: owner,
      [STORAGE_KEYS.REPO_NAME]: repo,
      [STORAGE_KEYS.BRANCH]: branch || 'main',
      [STORAGE_KEYS.GIT_PROVIDER]: gitProvider || 'github',
      [STORAGE_KEYS.SERVER_URL]: serverUrl || '',
    });
    api.validateToken()
      .then(async (tokenResult) => {
        if (!tokenResult?.valid) {
          throw new Error('Invalid token');
        }
        const normalizedOwner = String(owner).toLowerCase();
        const normalizedUser = String(tokenResult.username || '').toLowerCase();
        if (!normalizedUser || normalizedOwner !== normalizedUser) {
          sendResponse({
            success: false,
            code: 'OWNER_MISMATCH',
            message: `Auto-create supports user repositories only. Owner must match authenticated user (${tokenResult.username}).`,
          });
          return;
        }
        const created = await api.createRepository({ name: repo, private: true });
        sendResponse({ success: true, created });
      })
      .catch((err) => sendResponse({ success: false, message: err.message || 'Repository creation failed' }));
    return true;
  }
  if (message.action === 'setSettingsSyncPassword') {
    chrome.storage.local.set({ settingsSyncPassword: message.password }).then(async () => {
      if (message.triggerPush) {
        const result = await push();
        sendResponse(result);
      } else {
        sendResponse({ ok: true });
      }
    });
    return true;
  }
  if (message.action === 'clearSettingsSyncPassword') {
    chrome.storage.local.remove('settingsSyncPassword').then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.action === 'listDeviceConfigs') {
    listRemoteDeviceConfigs()
      .then(configs => sendResponse({ success: true, configs }))
      .catch(err => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'listSettingsProfiles') {
    listSettingsProfilesFromRepo()
      .then(configs => sendResponse({ success: true, configs }))
      .catch(err => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'importDeviceConfig') {
    importDeviceConfig(message.filename, message.password || '')
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'importSettingsProfile') {
    importSettingsProfile(message.filename, message.password || '')
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'syncSettingsToProfile') {
    syncCurrentSettingsToProfile({
      filename: message.filename,
      password: message.password || '',
      name: message.name || '',
    })
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'createSettingsProfile') {
    createSettingsProfile({
      name: message.name || '',
      password: message.password || '',
    })
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'deleteSettingsProfile') {
    deleteSettingsProfile(message.filename || '')
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'getPreviousCommitSha') {
    getPreviousCommitSha()
      .then(sha => sendResponse({ success: true, sha }))
      .catch(err => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'listSyncHistory') {
    listSyncHistory({ perPage: message.perPage || 20 })
      .then(commits => sendResponse({ success: true, commits }))
      .catch(err => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'previewCommitDiff') {
    getCommitDiffPreview(message.commitSha)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'restoreFromCommit') {
    restoreFromCommit(message.commitSha)
      .then(async (result) => {
        await updateSyncStatusBadge(result);
        await showNotificationIfEnabled(result);
        sendResponse(result);
      })
      .catch(err => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'setBitwardenBackupPassword') {
    import('./lib/storage-keys.js')
      .then(({ bitwardenBackupPasswordKey }) => {
        const key = bitwardenBackupPasswordKey(message.profileId);
        return chrome.storage.local.set({ [key]: message.password || '' });
      })
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, message: err.message }));
    return true;
  }
  if (message.action === 'pushBitwardenBackup') {
    pushBitwardenBackup({
      content: message.content || '',
      reEncrypt: !!message.reEncrypt,
      password: message.password || '',
      backupPath: message.backupPath,
    })
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'listBitwardenBackups') {
    listBitwardenBackups(message.backupPath)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'downloadBitwardenBackup') {
    downloadBitwardenBackup(message.path, message.password || '')
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'deleteBitwardenBackup') {
    deleteBitwardenBackup(message.path)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, message: err.message }));
    return true;
  }
  if (message.action === 'settingsChanged') {
    setupAlarm().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.action === 'getDebugLog') {
    Promise.resolve(getLogAsString()).then((content) => sendResponse({ content }));
    return true; // keep channel open for async response
  }
  if (message.action === 'getDebugLogExport') {
    getDebugLogExportContent().then((content) => sendResponse({ content }));
    return true; // keep channel open for async response
  }
  if (message.action === 'captureScreenshot') {
    const { windowId } = message;
    const targetWindowId = windowId ? parseInt(windowId, 10) : null;
    (async () => {
      try {
        // Focus the source window so captureVisibleTab captures the right content
        if (targetWindowId) {
          await chrome.windows.update(targetWindowId, { focused: true });
          // Brief delay for the window to actually paint
          await new Promise(r => setTimeout(r, 300));
        }
        const dataUrl = await chrome.tabs.captureVisibleTab(targetWindowId || null, { format: 'png' });
        sendResponse(dataUrl);
      } catch (err) {
        console.warn('[GitSyncMarks] captureScreenshot failed:', err);
        sendResponse(null);
      }
    })();
    return true;
  }
  if (message.action === 'refreshContextMenus') {
    setupContextMenus();
    sendResponse({ ok: true });
    return true;
  }
});

// ---- Refresh context menu when profiles change ----

chrome.storage.onChanged.addListener((changes, area) => {
  if (
    area === 'sync' &&
    (changes.profiles ||
      changes.activeProfileId ||
      changes.contextMenuItems ||
      changes.contextMenuSubmenus ||
      changes.linkwardenEnabled)
  ) {
    setupContextMenus();
  }
});

// ---- Keyboard shortcuts ----

chrome.commands?.onCommand?.addListener?.((command) => {
  if (command === 'quick-sync') {
    if (!isSyncInProgress()) {
      sync().then(async (result) => {
        await updateSyncStatusBadge(result);
        await showNotificationIfEnabled(result);
      });
    }
  } else if (command === 'open-options') {
    chrome.runtime.openOptionsPage();
  }
});

// ---- Extension install/startup ----

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[GitSyncMarks] Extension installed/updated:', details.reason);
  await migrateTokenIfNeeded();
  await migrateToProfiles();
  await initI18n();
  setupContextMenus();
  await setupAlarm();
  await checkAndMigrate();
  if (details.reason === 'install' && await shouldAutoOpenOnboardingWizard()) {
    chrome.runtime.openOptionsPage();
  }
  if (details.reason === 'update') {
    const v = chrome.runtime.getManifest().version;
    await chrome.storage.local.set({ [WHATS_NEW_STORAGE_KEY]: v });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[GitSyncMarks] Browser started');
  await migrateTokenIfNeeded();
  await migrateToProfiles();
  await initI18n();
  // Rebuild the full static + dynamic context menu; SW restarts and browser
  // startup do not fire onInstalled, so this must not rely on refresh* alone.
  setupContextMenus();
  await setupAlarm();
  await checkAndMigrate();
  if (await shouldAutoOpenOnboardingWizard()) {
    chrome.runtime.openOptionsPage();
  }

  const settings = await getSettings();
  if (settings[STORAGE_KEYS.SYNC_ON_STARTUP] && isConfigured(settings)) {
    setTimeout(() => {
      sync().then(async (result) => {
        await updateSyncStatusBadge(result);
        await showNotificationIfEnabled(result);
      });
    }, 2000);
  }
});

// Initial setup — every service worker start (not only install/update)
migrateTokenIfNeeded().then(() =>
  migrateToProfiles().then(() => {
    initI18n();
    setupContextMenus();
    setupAlarm();
    checkAndMigrate();
  })
);
