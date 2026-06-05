/**
 * Options – profile bookmark transfer UI
 */

import { getMessage } from '../lib/i18n.js';
import { getProfiles, getActiveProfileId } from '../lib/profile-manager.js';

const transferDialog = document.getElementById('profile-transfer-dialog');
const transferOpenBtn = document.getElementById('profile-transfer-open-btn');
const transferSourceSelect = document.getElementById('profile-transfer-source');
const transferTargetSelect = document.getElementById('profile-transfer-target');
const transferModeSelect = document.getElementById('profile-transfer-mode');
const transferFolderInput = document.getElementById('profile-transfer-folder');
const transferPushInput = document.getElementById('profile-transfer-push');
const transferApplyInput = document.getElementById('profile-transfer-apply');
const transferPreviewBtn = document.getElementById('profile-transfer-preview-btn');
const transferRunBtn = document.getElementById('profile-transfer-run-btn');
const transferCancelBtn = document.getElementById('profile-transfer-cancel-btn');
const transferResultEl = document.getElementById('profile-transfer-result');
const transferWarningEl = document.getElementById('profile-transfer-warning');
const transferMergeHintEl = document.getElementById('profile-transfer-merge-hint');
const transferStatusEl = document.getElementById('profile-transfer-status');
const transferProgressEl = document.getElementById('profile-transfer-progress');

let _showProfileMessage = null;

function progressText(key, substitutions, fallback) {
  const msg = getMessage(key, substitutions);
  return !msg || msg === key ? fallback : msg;
}

function sourceLabel(key) {
  switch (key) {
    case 'browser': return getMessage('options_transferSourceBrowser');
    case 'remote': return getMessage('options_transferSourceRemote');
    case 'cache': return getMessage('options_transferSourceCache');
    default: return key;
  }
}

function isMergeMode() {
  return transferModeSelect?.value === 'merge';
}

function updateMergeHintVisibility() {
  if (!transferMergeHintEl) return;
  transferMergeHintEl.style.display = isMergeMode() ? 'block' : 'none';
}

function formatTransferProgress({ phase, current = 0, total = 0 }) {
  const cur = String(current);
  const tot = String(total);

  if (phase === 'pushing' && total > 0) {
    return progressText(
      'options_transferProgressFiles',
      [cur, tot],
      `${cur} / ${tot} files`
    );
  }
  if (phase === 'loading' && total > 1) {
    return progressText(
      'options_transferProgressLoadingStep',
      [cur, tot],
      `${cur} / ${tot}`
    );
  }
  if (phase === 'fetching') {
    return progressText('options_transferProgressFetching', [], 'Reading remote repository…');
  }
  if (phase === 'applying') {
    return progressText('options_transferProgressApplying', [], 'Applying to browser…');
  }
  if (phase === 'preparing') {
    return progressText('options_transferProgressPreparing', [], 'Preparing transfer…');
  }
  return progressText('options_transferProgressLoading', [], 'Loading bookmarks…');
}

function updateTransferProgress(payload) {
  if (!transferProgressEl) return;
  transferProgressEl.textContent = formatTransferProgress(payload || { phase: 'loading' });
}

function setTransferBusy(busy, initialPhase = 'loading', initialProgress = {}) {
  if (transferPreviewBtn) transferPreviewBtn.disabled = busy;
  if (transferRunBtn) transferRunBtn.disabled = busy;
  if (transferStatusEl) transferStatusEl.style.display = busy ? 'flex' : 'none';
  if (busy) {
    updateTransferProgress({ phase: initialPhase, current: 0, total: 0, ...initialProgress });
  } else if (transferProgressEl) {
    transferProgressEl.textContent = '';
  }
}

/**
 * Run preview/transfer on a dedicated port so progress events are not lost to a connect race.
 * @param {string} action
 * @param {object} params
 * @returns {Promise<object>}
 */
function runTransferPortAction(action, params) {
  return new Promise((resolve, reject) => {
    let port;
    try {
      port = chrome.runtime.connect({ name: 'profileTransfer' });
    } catch (err) {
      reject(err);
      return;
    }

    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      try {
        port.disconnect();
      } catch {
        /* ignore */
      }
      fn(value);
    };

    port.onMessage.addListener((msg) => {
      if (msg?.type === 'transferProgress') {
        updateTransferProgress(msg);
        return;
      }
      if (msg?.type === 'transferDone') {
        if (msg.error) finish(reject, new Error(msg.error));
        else finish(resolve, msg.result);
      }
    });

    port.onDisconnect.addListener(() => {
      if (!settled) {
        finish(reject, new Error(getMessage('transfer_connectionLost') || 'Connection lost'));
      }
    });

    port.postMessage({ action, params });
  });
}

async function populateTransferSelects() {
  const profiles = await getProfiles();
  const activeId = await getActiveProfileId();
  const fill = (select) => {
    if (!select) return;
    select.innerHTML = '';
    for (const [id, p] of Object.entries(profiles)) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = p.name || id;
      select.appendChild(opt);
    }
  };
  fill(transferSourceSelect);
  fill(transferTargetSelect);
  if (transferSourceSelect) transferSourceSelect.value = activeId;
  if (transferTargetSelect) {
    const ids = Object.keys(profiles);
    transferTargetSelect.value = ids.find((id) => id !== activeId) || ids[0] || '';
  }
}

function getTransferParams() {
  return {
    sourceId: transferSourceSelect?.value,
    targetId: transferTargetSelect?.value,
    mode: isMergeMode() ? 'merge' : 'replace',
    folderPrefix: transferFolderInput?.value?.trim() || null,
    push: transferPushInput?.checked !== false,
    applyToBrowser: transferApplyInput?.checked === true,
  };
}

function showTransferWarning(preview) {
  if (!transferWarningEl || !preview || preview.error) {
    if (transferWarningEl) transferWarningEl.style.display = 'none';
    return;
  }

  if (preview.mode === 'merge' && preview.targetHasExistingData) {
    transferWarningEl.textContent = getMessage('options_transferMergeWarning', [
      String(preview.targetExistingCount),
    ]);
    transferWarningEl.style.display = 'block';
    return;
  }

  if (preview.duplicateFolderPairs?.length) {
    const sample = preview.duplicateFolderPairs.slice(0, 5).join(', ');
    const suffix = preview.duplicateFolderPairs.length > 5
      ? ` (+${preview.duplicateFolderPairs.length - 5})`
      : '';
    transferWarningEl.textContent = getMessage('options_transferDuplicateFoldersWarning', [
      sample + suffix,
    ]);
    transferWarningEl.style.display = 'block';
    return;
  }

  if (preview.mode === 'replace' && preview.remoteOnlyCount > 0) {
    transferWarningEl.textContent = getMessage('options_transferReplaceWarning', [
      String(preview.remoteOnlyCount),
    ]);
    transferWarningEl.style.display = 'block';
    return;
  }

  if (preview.mode === 'replace' && preview.targetHasExistingData) {
    transferWarningEl.textContent = getMessage('options_transferTargetWarning');
    transferWarningEl.style.display = 'block';
    return;
  }

  transferWarningEl.style.display = 'none';
}

async function runPreview() {
  transferResultEl.textContent = '';
  transferWarningEl.style.display = 'none';
  setTransferBusy(true, 'loading');
  try {
    const preview = await runTransferPortAction('previewTransfer', getTransferParams());
    if (preview?.error) {
      transferResultEl.textContent = preview.error;
      return;
    }
    transferResultEl.textContent = getMessage('options_transferPreviewResult', [
      sourceLabel(preview.source),
      String(preview.sourceFileCount),
      String(preview.targetExistingCount),
      String(preview.resultFileCount),
    ]);
    showTransferWarning(preview);
    if (preview.conflicts?.length) {
      transferResultEl.textContent += ` (${preview.conflicts.length} conflicts)`;
    }
  } catch (err) {
    transferResultEl.textContent = err.message;
  } finally {
    setTransferBusy(false);
  }
}

async function runTransfer() {
  if (isMergeMode()) {
    setTransferBusy(true, 'loading');
    let preview;
    try {
      preview = await runTransferPortAction('previewTransfer', getTransferParams());
    } finally {
      setTransferBusy(false);
    }
    if (preview?.targetHasExistingData) {
      const ok = window.confirm(getMessage('options_transferMergeConfirm', [
        String(preview.targetExistingCount),
      ]));
      if (!ok) return;
    }
  }

  setTransferBusy(true, 'preparing');
  try {
    const result = await runTransferPortAction('transferBookmarks', getTransferParams());
    if (result?.success) {
      transferResultEl.textContent = result.message;
      transferDialog.style.display = 'none';
      _showProfileMessage?.(result.message, false);
    } else {
      transferResultEl.textContent = result?.message || 'Transfer failed';
    }
  } catch (err) {
    transferResultEl.textContent = err.message;
  } finally {
    setTransferBusy(false);
  }
}

export function initProfileTransfer({ showProfileMessage }) {
  _showProfileMessage = showProfileMessage;
  if (!transferOpenBtn || !transferDialog) return;

  transferModeSelect?.addEventListener('change', updateMergeHintVisibility);

  transferOpenBtn.addEventListener('click', async () => {
    await populateTransferSelects();
    transferResultEl.textContent = '';
    transferWarningEl.style.display = 'none';
    setTransferBusy(false);
    updateMergeHintVisibility();
    transferDialog.style.display = 'flex';
  });

  transferCancelBtn?.addEventListener('click', () => {
    setTransferBusy(false);
    transferDialog.style.display = 'none';
  });

  transferPreviewBtn?.addEventListener('click', runPreview);
  transferRunBtn?.addEventListener('click', runTransfer);
}
