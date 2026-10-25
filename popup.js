/**
 * Popup Logic
 * Handles manual sync buttons, status display, and conflict resolution.
 */

import { initI18n, applyI18n, getMessage } from './lib/i18n.js';
import { clearElement } from './lib/dom-utils.js';
import { formatSyncProgress, runSyncPortAction } from './lib/sync-progress.js';
import { initTheme } from './lib/theme.js';
import { initUiDensity } from './lib/ui-density.js';
import { mountWhatsNewIfPending } from './lib/whats-new-ui.js';
import { buildCommitUrl } from './lib/git-provider.js';

// DOM elements
const notConfiguredEl = document.getElementById('not-configured');
const configuredEl = document.getElementById('configured');
const statusArea = document.getElementById('status-area');
const profileSelect = document.getElementById('profile-select');
const statusMessage = document.getElementById('status-message');
const lastDataChangeEl = document.getElementById('last-data-change');
const lastCommitWrap = document.getElementById('last-commit-wrap');
const mirrorStatusEl = document.getElementById('mirror-status');
const tokenExpiryEl = document.getElementById('token-expiry');
const offlineStatusEl = document.getElementById('offline-status');
const conflictBox = document.getElementById('conflict-box');
const conflictDescription = document.getElementById('conflict-description');
const conflictFilesEl = document.getElementById('conflict-files');
const autoSyncDot = document.getElementById('auto-sync-dot');
const autoSyncText = document.getElementById('auto-sync-text');

const syncBtn = document.getElementById('sync-btn');
const syncSpinner = document.getElementById('sync-spinner');
const syncText = document.getElementById('sync-text');
const pushBtn = document.getElementById('push-btn');
const pullBtn = document.getElementById('pull-btn');
const forcePushBtn = document.getElementById('force-push-btn');
const forcePullBtn = document.getElementById('force-pull-btn');
const openSettingsBtn = document.getElementById('open-settings-btn');
const restoreBackupBtn = document.getElementById('restore-backup-btn');
const confirmBox = document.getElementById('confirm-box');
const confirmText = document.getElementById('confirm-text');
const confirmYesBtn = document.getElementById('confirm-yes-btn');
const confirmNoBtn = document.getElementById('confirm-no-btn');
const settingsLink = document.getElementById('settings-link');
const nextSyncCountdownEl = document.getElementById('next-sync-countdown');

const ALARM_NAME = 'bookmarkSyncPull';
let countdownInterval = null;

let isSyncing = false;
/** True while a push/pull preview is loading (see confirmedAction). */
let isPreviewing = false;

// Demo mode: show configured UI for screenshots without real storage (?demo=1)
const isDemoMode = () =>
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search || '').get('demo') === '1';

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  await initTheme();
  await initUiDensity();
  await initI18n();
  applyI18n();
  if (isDemoMode()) {
    showDemoUI();
    return;
  }
  await loadStatus();
  await mountWhatsNewIfPending(document.body, {
    getMessage,
    manifestVersion: chrome.runtime.getManifest().version,
  });
});

// Keep the popup in step with background syncs (auto-sync, alarm, context menu) while it is open.
// Key of the per-profile sync state in chrome.storage.local (see lib/profile-manager.js).
const SYNC_STATE_KEY = 'syncState';
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[SYNC_STATE_KEY] && !isSyncing) {
    loadStatus();
  }
});

async function loadStatus() {
  try {
    const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
    updateUI(status);
  } catch (err) {
    console.error('Could not load status:', err);
    showNotConfigured();
  }
}

function updateUI(status) {
  if (!status || !status.configured) {
    showNotConfigured();
    return;
  }
  setSyncControlsDisabled(isSyncing);
  restoreBackupBtn.style.display = status.localBackup ? '' : 'none';

  notConfiguredEl.style.display = 'none';
  configuredEl.style.display = 'block';

  // Profile selector (only when 2+ profiles)
  const profiles = status.profiles || [];
  const activeProfileId = status.activeProfileId;
  if (profiles.length >= 2) {
    clearElement(profileSelect);
    for (const p of profiles) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name || p.id;
      if (p.id === activeProfileId) opt.selected = true;
      profileSelect.appendChild(opt);
    }
    profileSelect.style.display = '';
  } else {
    profileSelect.style.display = 'none';
    clearElement(profileSelect);
  }

  // Status message
  if (status.hasConflict) {
    setStatus('⚠️', getMessage('popup_conflictDetected'), 'status-warning');
    conflictBox.style.display = 'block';
    if (status.conflictReason === 'bulkDelete' && status.pendingDelete) {
      conflictDescription.textContent = getMessage('popup_bulkDeleteWarning', [
        String(status.pendingDelete.count),
        String(status.pendingDelete.total),
      ]);
    } else {
      conflictDescription.textContent = getMessage('popup_conflictDescription');
    }
    renderConflictFiles(status.conflicts || [], status.conflictChoices || {});
  } else if (status.lastError) {
    setStatus('❌', status.lastError, 'status-error');
    conflictBox.style.display = 'none';
  } else if (status.lastSyncTime) {
    setStatus('✅', getMessage('popup_synced'), 'status-ok');
    conflictBox.style.display = 'none';
  } else {
    setStatus('📋', getMessage('popup_notSyncedYet'), 'status-ok');
    conflictBox.style.display = 'none';
  }

  // Last data change (timestamp)
  const dataChangeTime = status.lastSyncWithChangesTime || status.lastSyncTime;
  if (dataChangeTime) {
    lastDataChangeEl.textContent = getMessage('popup_lastDataChange', [formatRelativeTime(new Date(dataChangeTime))]);
    lastDataChangeEl.style.display = '';
  } else {
    lastDataChangeEl.style.display = 'none';
  }

  // Last commit (hash as link)
  if (status.lastCommitSha && status.repoOwner && status.repoName) {
    const shortSha = status.lastCommitSha.substring(0, 7);
    const url = buildCommitUrl({
      provider: status.gitProvider || 'github',
      serverUrl: status.serverUrl || '',
      owner: status.repoOwner,
      repo: status.repoName,
      commitSha: status.lastCommitSha,
    });
    clearElement(lastCommitWrap);
    lastCommitWrap.appendChild(document.createTextNode(getMessage('popup_lastCommit') + ' '));
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'commit-link';
    a.textContent = shortSha;
    lastCommitWrap.appendChild(a);
    lastCommitWrap.style.display = '';
  } else {
    clearElement(lastCommitWrap);
    lastCommitWrap.style.display = 'none';
  }

  // Token expiry (GitHub fine-grained tokens): warn in the last two weeks and once expired.
  if (status.tokenExpiresAt) {
    const daysLeft = Math.ceil((new Date(status.tokenExpiresAt).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) {
      tokenExpiryEl.textContent = getMessage('popup_tokenExpired');
      tokenExpiryEl.style.display = '';
    } else if (daysLeft <= 14) {
      tokenExpiryEl.textContent = getMessage('popup_tokenExpiring', [String(daysLeft)]);
      tokenExpiryEl.style.display = '';
    } else {
      tokenExpiryEl.style.display = 'none';
    }
  } else {
    tokenExpiryEl.style.display = 'none';
  }

  if (mirrorStatusEl) {
    if (status.mirrorSummary) {
      let text = getMessage('popup_mirrorStatus', [status.mirrorSummary]);
      const failed = (status.mirrorStatuses || []).filter((m) => !m.paused && m.lastError);
      if (failed.length) {
        text += ` — ${failed.map((m) => m.lastError).join('; ')}`;
      }
      mirrorStatusEl.textContent = text;
      mirrorStatusEl.style.display = '';
    } else {
      mirrorStatusEl.style.display = 'none';
    }
  }

  // Auto-sync status
  if (status.autoSync) {
    autoSyncDot.className = 'dot dot-active';
    autoSyncText.textContent = getMessage('popup_autoSyncActive');
    startCountdown();
  } else {
    autoSyncDot.className = 'dot dot-inactive';
    autoSyncText.textContent = getMessage('popup_autoSyncDisabled');
    autoSyncText.style.display = '';
    stopCountdown();
    nextSyncCountdownEl.style.display = 'none';
  }
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function updateCountdown() {
  const alarm = await chrome.alarms.get(ALARM_NAME);
  if (!alarm || !alarm.scheduledTime) {
    nextSyncCountdownEl.style.display = 'none';
    autoSyncText.style.display = '';
    return;
  }
  const remaining = alarm.scheduledTime - Date.now();
  if (remaining <= 0) {
    nextSyncCountdownEl.textContent = getMessage('popup_nextSyncIn', [formatCountdown(0)]);
  } else {
    nextSyncCountdownEl.textContent = getMessage('popup_nextSyncIn', [formatCountdown(remaining)]);
  }
  nextSyncCountdownEl.style.display = '';
  autoSyncText.style.display = 'none';
}

function startCountdown() {
  stopCountdown();
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

function stopCountdownUi() {
  nextSyncCountdownEl.style.display = 'none';
  autoSyncText.style.display = '';
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  stopCountdownUi();
}

function showNotConfigured() {
  notConfiguredEl.style.display = 'block';
  configuredEl.style.display = 'none';
}

function showDemoUI() {
  notConfiguredEl.style.display = 'none';
  configuredEl.style.display = 'block';
  profileSelect.style.display = 'none';
  setStatus('✅', getMessage('popup_synced'), 'status-ok');
  conflictBox.style.display = 'none';
  lastDataChangeEl.textContent = getMessage('popup_lastDataChange', [
    getMessage('popup_minAgo', [5]),
  ]);
  lastDataChangeEl.style.display = '';
  clearElement(lastCommitWrap);
  lastCommitWrap.appendChild(document.createTextNode(getMessage('popup_lastCommit') + ' '));
  const a = document.createElement('a');
  a.href = 'https://github.com/example/repo/commit/abc1234';
  a.target = '_blank';
  a.rel = 'noopener';
  a.className = 'commit-link';
  a.textContent = 'abc1234';
  lastCommitWrap.appendChild(a);
  lastCommitWrap.style.display = '';
  autoSyncDot.className = 'dot dot-active';
  autoSyncText.textContent = getMessage('popup_autoSyncActive');
  nextSyncCountdownEl.style.display = 'none';
}

function setStatus(_icon, message, boxClass) {
  statusMessage.textContent = message;
  const stateClass = boxClass === 'status-error' || boxClass === 'status-warning' ? ` ${boxClass}` : '';
  statusArea.className = `status-area${stateClass}`;
}

/** Readable form of one side of a conflict: its URL, or "(deleted)". */
function describeConflictSide(side) {
  return side ? side.url || side.title || '' : getMessage('popup_conflictDeleted');
}

/**
 * One row per conflicting bookmark with "keep this browser" / "keep repository".
 * A choice is stored and a sync runs at once, so the conflict clears as soon as every file is decided.
 */
function renderConflictFiles(conflicts, choices) {
  clearElement(conflictFilesEl);
  for (const conflict of conflicts) {
    const item = document.createElement('li');
    item.className = 'conflict-file';

    const title = document.createElement('div');
    title.className = 'conflict-file-title';
    title.textContent = conflict.local?.title || conflict.remote?.title || conflict.path.split('/').pop();

    const versions = document.createElement('div');
    versions.className = 'conflict-file-versions';
    versions.textContent = [
      getMessage('popup_conflictThisBrowser', [describeConflictSide(conflict.local)]),
      getMessage('popup_conflictRepository', [describeConflictSide(conflict.remote)]),
    ].join(' · ');

    const actions = document.createElement('div');
    actions.className = 'conflict-actions';
    const keepButton = (label, choice) => {
      const button = document.createElement('button');
      button.className = choices[conflict.path] === choice ? 'btn btn-small btn-warning' : 'btn btn-small btn-secondary';
      button.textContent = label;
      button.addEventListener('click', async () => {
        if (isSyncing) return;
        await chrome.runtime.sendMessage({ action: 'resolveConflictFile', path: conflict.path, choice });
        await handleAction('sync');
        await loadStatus();
      });
      return button;
    };
    actions.append(
      keepButton(getMessage('popup_keepLocal'), 'local'),
      keepButton(getMessage('popup_keepRemote'), 'remote')
    );

    item.append(title, versions, actions);
    conflictFilesEl.appendChild(item);
  }
}

/**
 * Inline confirmation (no native dialog). Resolves true when the user confirms.
 * @param {string} message
 * @param {string} [confirmKey] - i18n key for the confirm button label
 * @returns {Promise<boolean>}
 */
function askConfirm(message, confirmKey = 'popup_confirmBtn') {
  return new Promise((resolve) => {
    confirmText.textContent = message;
    confirmYesBtn.textContent = getMessage(confirmKey);
    confirmBox.style.display = 'block';
    confirmNoBtn.focus();

    const finish = (answer) => {
      confirmBox.style.display = 'none';
      confirmYesBtn.removeEventListener('click', onYes);
      confirmNoBtn.removeEventListener('click', onNo);
      resolve(answer);
    };
    const onYes = () => finish(true);
    const onNo = () => finish(false);
    confirmYesBtn.addEventListener('click', onYes);
    confirmNoBtn.addEventListener('click', onNo);
  });
}

function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);

  if (diffMin < 1) return getMessage('popup_justNow');
  if (diffMin < 60) return getMessage('popup_minAgo', [diffMin]);
  if (diffHours < 24) return getMessage('popup_hoursAgo', [diffHours]);
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---- Button handlers ----

/** Sync buttons are unusable while a sync runs or while the browser is offline. */
function setSyncControlsDisabled(busy) {
  const disabled = busy || isPreviewing || navigator.onLine === false;
  syncBtn.disabled = disabled;
  pushBtn.disabled = disabled;
  pullBtn.disabled = disabled;
  forcePushBtn.disabled = disabled;
  forcePullBtn.disabled = disabled;
  offlineStatusEl.style.display = navigator.onLine === false ? '' : 'none';
}

window.addEventListener('online', () => setSyncControlsDisabled(isSyncing));
window.addEventListener('offline', () => setSyncControlsDisabled(isSyncing));

function setLoading(loading, progressText = null) {
  isSyncing = loading;
  setSyncControlsDisabled(loading);
  profileSelect.disabled = loading;
  syncSpinner.style.display = loading ? 'inline-block' : 'none';
  const label = progressText || (loading ? getMessage('popup_syncing') : getMessage('popup_syncNow'));
  syncText.textContent = loading ? label : getMessage('popup_syncNow');
  if (loading) {
    statusMessage.textContent = label;
    statusArea.classList.add('status-loading');
  } else {
    statusArea.classList.remove('status-loading');
  }
}

function updateSyncProgress(payload) {
  if (!isSyncing) return;
  const text = formatSyncProgress(payload);
  syncText.textContent = text;
  statusMessage.textContent = text;
}

const SYNC_PORT_ACTIONS = new Set(['sync', 'push', 'pull', 'bootstrapFirstSync']);

async function handleAction(action) {
  if (isSyncing) return;
  setLoading(true);

  try {
    const result = SYNC_PORT_ACTIONS.has(action)
      ? await runSyncPortAction(action, {}, updateSyncProgress)
      : await chrome.runtime.sendMessage({ action });

    if (result.success) {
      await loadStatus();
      setStatus('✅', result.message, 'status-ok');
      conflictBox.style.display = 'none';
    } else if (result.alreadyInProgress) {
      // A background sync holds the lock; this is information, not an error.
      setStatus('⏳', result.message, 'status-warning');
    } else {
      if (result.conflict) {
        setStatus('⚠️', result.message, 'status-warning');
        conflictBox.style.display = 'block';
      } else {
        setStatus('❌', result.message, 'status-error');
      }
    }
  } catch (err) {
    setStatus('❌', getMessage('popup_error', [err.message]), 'status-error');
  } finally {
    setLoading(false);
  }
}

// Push and pull replace the whole other side, so they ask first. Sync Now merges and does not.
const CONFIRM_MESSAGE_KEYS = { push: 'popup_confirmPush', pull: 'popup_confirmPull' };
const PREVIEW_MESSAGE_KEYS = { push: 'popup_previewPush', pull: 'popup_previewPull' };

/** Question shown before a push or pull: exact counts when the preview works, generic text otherwise. */
async function confirmationFor(action) {
  const preview = await chrome.runtime.sendMessage({ action: 'previewSync' }).catch(() => null);
  const counts = preview?.success ? preview[action] : null;
  if (counts) return getMessage(PREVIEW_MESSAGE_KEYS[action], [String(counts.added), String(counts.removed)]);
  return getMessage(CONFIRM_MESSAGE_KEYS[action]);
}

async function confirmedAction(action) {
  if (isSyncing || isPreviewing) return;
  if (CONFIRM_MESSAGE_KEYS[action]) {
    // The preview reads the remote; keep the sync buttons locked so a double click cannot
    // open a second confirmation.
    isPreviewing = true;
    setSyncControlsDisabled(true);
    let message;
    try {
      setStatus('⏳', getMessage('popup_checkingChanges'), 'status-ok');
      message = await confirmationFor(action);
      await loadStatus();
    } finally {
      isPreviewing = false;
      setSyncControlsDisabled(isSyncing);
    }
    if (!(await askConfirm(message))) return;
  }
  await handleAction(action);
}

syncBtn.addEventListener('click', () => handleAction('sync'));

// Undo for the last local replace: restores the snapshot taken before the last pull or merge.
restoreBackupBtn.addEventListener('click', async () => {
  if (isSyncing) return;
  const latest = await chrome.runtime.sendMessage({ action: 'getStatus' }).catch(() => null);
  if (!latest?.localBackup) return;
  const when = new Date(latest.localBackup.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  if (!(await askConfirm(getMessage('popup_confirmRestoreBackup', [when])))) return;
  setLoading(true);
  try {
    const result = await chrome.runtime.sendMessage({ action: 'restoreLocalBackup' });
    await loadStatus();
    setStatus(result?.success ? '✅' : '❌', result?.message || '', result?.success ? 'status-ok' : 'status-error');
  } catch (err) {
    setStatus('❌', getMessage('popup_error', [err.message]), 'status-error');
  } finally {
    setLoading(false);
  }
});
pushBtn.addEventListener('click', () => confirmedAction('push'));
pullBtn.addEventListener('click', () => confirmedAction('pull'));

// Profile switch
profileSelect.addEventListener('change', async (e) => {
  const targetId = e.target.value;
  const status = await chrome.runtime.sendMessage({ action: 'getStatus' }).catch(() => null);
  const activeId = status?.activeProfileId;
  if (!activeId || targetId === activeId) return;
  if (isSyncing) {
    profileSelect.value = activeId;
    return;
  }
  // Switching replaces the local bookmarks, so honour the "switch without confirmation" setting.
  if (!status?.profileSwitchWithoutConfirm) {
    const targetName = profileSelect.options[profileSelect.selectedIndex]?.textContent || targetId;
    const confirmed = await askConfirm(
      getMessage('options_profileSwitchConfirm', [targetName]),
      'options_profileSwitchConfirmBtn'
    );
    if (!confirmed) {
      profileSelect.value = activeId;
      return;
    }
  }
  setLoading(true);
  syncText.textContent = getMessage('popup_profileSwitching');
  try {
    const result = await chrome.runtime.sendMessage({ action: 'switchProfile', targetId });
    if (result?.success) {
      await loadStatus();
      setStatus('✅', result.message, 'status-ok');
      conflictBox.style.display = 'none';
    } else {
      setStatus('❌', result?.message || getMessage('popup_error', ['Switch failed']), 'status-error');
      profileSelect.value = activeId;
    }
  } catch (err) {
    setStatus('❌', getMessage('popup_error', [err.message]), 'status-error');
    profileSelect.value = activeId;
  } finally {
    setLoading(false);
  }
});
forcePushBtn.addEventListener('click', () => confirmedAction('push'));
forcePullBtn.addEventListener('click', () => confirmedAction('pull'));

// Settings links (close popup after opening options)
openSettingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// Copies a plain-text summary for bug reports (no tokens, no repository names).
document.getElementById('diagnostics-link').addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    const result = await chrome.runtime.sendMessage({ action: 'getDiagnostics' });
    if (!result?.success) throw new Error(result?.message || 'diagnostics');
    await navigator.clipboard.writeText(result.text);
    setStatus('✅', getMessage('popup_diagnosticsCopied'), 'status-ok');
  } catch (err) {
    setStatus('❌', getMessage('popup_error', [err.message]), 'status-error');
  }
});

settingsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
  window.close();
});
