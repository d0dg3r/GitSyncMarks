/**
 * Options — Bitwarden / Vaultwarden export backup to Git (manual upload).
 */

import { getMessage } from '../lib/i18n.js';
import { downloadFile, showPasswordDialog } from './settings.js';
import { STORAGE_KEYS, bitwardenBackupPasswordKey } from '../lib/storage-keys.js';
import { getActiveProfileId } from '../lib/profile-manager.js';
import { DEFAULT_BITWARDEN_BACKUP_PATH } from '../lib/bitwarden-backup.js';

const fileInput = document.getElementById('bitwarden-backup-file');
const fileTrigger = document.getElementById('bitwarden-backup-file-trigger');
const fileNameEl = document.getElementById('bitwarden-backup-filename');
const pushBtn = document.getElementById('bitwarden-backup-push-btn');
const refreshBtn = document.getElementById('bitwarden-backup-refresh-btn');
const resultEl = document.getElementById('bitwarden-backup-result');
const listEl = document.getElementById('bitwarden-backup-list');
const pathInput = document.getElementById('bitwarden-backup-path');
const reEncryptInput = document.getElementById('bitwarden-backup-reencrypt');
const reEncryptGroup = document.getElementById('bitwarden-backup-reencrypt-group');
const passwordInput = document.getElementById('bitwarden-backup-password');
const savePasswordBtn = document.getElementById('bitwarden-backup-save-pw-btn');
const deleteConfirmEl = document.getElementById('bitwarden-backup-delete-confirm');
const deleteConfirmText = document.getElementById('bitwarden-backup-delete-confirm-text');
const deleteConfirmBtn = document.getElementById('bitwarden-backup-delete-confirm-btn');
const deleteCancelBtn = document.getElementById('bitwarden-backup-delete-cancel-btn');

let selectedFile = null;
let pendingDeletePath = null;

async function getStoredBackupPassword(profileId) {
  const key = bitwardenBackupPasswordKey(profileId);
  const local = await chrome.storage.local.get({ [key]: '' });
  return local[key] || '';
}

async function migrateLegacyBackupPassword(profileId) {
  const key = bitwardenBackupPasswordKey(profileId);
  const local = await chrome.storage.local.get({ [key]: '', bitwardenBackupPassword: '' });
  if (!local[key] && local.bitwardenBackupPassword) {
    await chrome.storage.local.set({ [key]: local.bitwardenBackupPassword });
  }
}

/** Password typed in the field (ignores masked placeholder after save). */
function getPasswordFromField() {
  if (!passwordInput) return '';
  if (passwordInput.dataset.hasPassword === 'true') return '';
  const value = passwordInput.value?.trim() || '';
  if (!value || value === '********') return '';
  return value;
}

async function resolveBackupPassword(promptKey, confirmKey) {
  const fieldPw = getPasswordFromField();
  if (fieldPw) return fieldPw;
  const profileId = await getActiveProfileId();
  const stored = await getStoredBackupPassword(profileId);
  if (stored) return stored;
  return showPasswordDialog(promptKey, confirmKey);
}

function showResult(message, type = 'info') {
  if (!resultEl) return;
  resultEl.textContent = message;
  resultEl.className = `validation-result ${type}`;
}

function updatePushButtonState() {
  if (pushBtn) pushBtn.disabled = !selectedFile;
}

function renderBackupList(backups = []) {
  if (!listEl) return;
  listEl.replaceChildren();
  if (!backups.length) {
    const empty = document.createElement('p');
    empty.className = 'card-desc';
    empty.textContent = getMessage('options_bitwardenBackupListEmpty');
    listEl.appendChild(empty);
    listEl.style.display = 'block';
    return;
  }

  const table = document.createElement('table');
  table.className = 'bitwarden-backup-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const label of [
    getMessage('options_bitwardenBackupColFile'),
    getMessage('options_bitwardenBackupColActions'),
  ]) {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const entry of backups) {
    const tr = document.createElement('tr');
    const pathTd = document.createElement('td');
    const code = document.createElement('code');
    code.textContent = entry.path;
    pathTd.appendChild(code);

    const actionsTd = document.createElement('td');
    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'bitwarden-backup-actions';

    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'btn btn-secondary btn-sm';
    downloadBtn.textContent = getMessage('options_bitwardenBackupDownloadBtn');
    downloadBtn.addEventListener('click', () => downloadBackup(entry.path));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-secondary btn-sm btn-danger';
    deleteBtn.textContent = getMessage('options_bitwardenBackupDeleteBtn');
    deleteBtn.addEventListener('click', () => deleteBackup(entry.path));

    actionsWrap.appendChild(downloadBtn);
    actionsWrap.appendChild(deleteBtn);
    actionsTd.appendChild(actionsWrap);
    tr.appendChild(pathTd);
    tr.appendChild(actionsTd);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  listEl.appendChild(table);
  listEl.style.display = 'block';
}

async function getBackupPath() {
  const raw = pathInput?.value?.trim() || DEFAULT_BITWARDEN_BACKUP_PATH;
  return raw.replace(/^\/+|\/+$/g, '') || DEFAULT_BITWARDEN_BACKUP_PATH;
}

async function refreshBackupList() {
  showResult(getMessage('options_bitwardenBackupLoading'), 'info');
  try {
    const resp = await chrome.runtime.sendMessage({
      action: 'listBitwardenBackups',
      backupPath: await getBackupPath(),
    });
    if (!resp?.success) {
      showResult(resp?.message || getMessage('options_bitwardenBackupListError'), 'error');
      return;
    }
    renderBackupList(resp.backups || []);
    showResult(getMessage('options_bitwardenBackupListReady', [String((resp.backups || []).length)]), 'success');
  } catch (err) {
    showResult(err.message || getMessage('options_bitwardenBackupListError'), 'error');
  }
}

function showDeleteConfirm(path) {
  pendingDeletePath = path;
  if (deleteConfirmText) {
    deleteConfirmText.textContent = getMessage('options_bitwardenBackupDeleteConfirm', [path]);
  }
  if (deleteConfirmEl) deleteConfirmEl.style.display = 'flex';
}

function hideDeleteConfirm() {
  pendingDeletePath = null;
  if (deleteConfirmEl) deleteConfirmEl.style.display = 'none';
}

async function deleteBackup(path) {
  showDeleteConfirm(path);
}

async function executeDeleteBackup() {
  const path = pendingDeletePath;
  if (!path) return;
  hideDeleteConfirm();

  showResult(getMessage('options_bitwardenBackupDeleting'), 'info');
  try {
    const resp = await chrome.runtime.sendMessage({
      action: 'deleteBitwardenBackup',
      path,
    });
    if (!resp?.success) {
      showResult(resp?.message || getMessage('options_bitwardenBackupDeleteError'), 'error');
      return;
    }
    showResult(getMessage('options_bitwardenBackupDeleteSuccess', [path]), 'success');
    await refreshBackupList();
  } catch (err) {
    showResult(err.message || getMessage('options_bitwardenBackupDeleteError'), 'error');
  }
}

async function downloadBackup(path) {
  const needsPassword = path.endsWith('.gitsyncmarks.enc');
  let password = '';
  if (needsPassword) {
    password = await resolveBackupPassword(
      'options_bitwardenBackupDownloadPasswordPrompt',
      'options_bitwardenBackupDownloadBtn'
    );
    if (!password) return;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    showResult(getMessage('options_bitwardenBackupDownloading'), 'info');
    try {
      const resp = await chrome.runtime.sendMessage({
        action: 'downloadBitwardenBackup',
        path,
        password,
      });
      if (!resp?.success) {
        const wrongPassword = resp?.message?.includes('Wrong password');
        if (wrongPassword && needsPassword && attempt === 0) {
          password = await showPasswordDialog(
            'options_bitwardenBackupDownloadPasswordPrompt',
            'options_bitwardenBackupDownloadBtn'
          );
          if (!password) return;
          continue;
        }
        showResult(resp?.message || getMessage('options_bitwardenBackupDownloadError'), 'error');
        return;
      }
      if (resp.wrapped && !password) {
        showResult(getMessage('options_bitwardenBackupDownloadNeedsPassword'), 'error');
        return;
      }
      const baseName = path.split('/').pop() || 'bitwarden-backup.json';
      downloadFile(baseName, resp.content, 'application/json');
      showResult(getMessage('options_bitwardenBackupDownloadSuccess'), 'success');
      return;
    } catch (err) {
      showResult(err.message || getMessage('options_bitwardenBackupDownloadError'), 'error');
      return;
    }
  }
}

async function pushBackup() {
  if (!selectedFile) return;

  let password = '';
  if (reEncryptInput?.checked) {
    password = await resolveBackupPassword(
      'options_bitwardenBackupEncryptPasswordPrompt',
      'options_bitwardenBackupPushBtn'
    );
    if (!password) return;
  }

  showResult(getMessage('options_bitwardenBackupPushing'), 'info');
  pushBtn.disabled = true;
  try {
    const content = await selectedFile.text();
    const resp = await chrome.runtime.sendMessage({
      action: 'pushBitwardenBackup',
      content,
      reEncrypt: !!reEncryptInput?.checked,
      password,
      backupPath: await getBackupPath(),
    });
    if (!resp?.success) {
      const code = resp?.code;
      let msg = resp?.message || getMessage('options_bitwardenBackupPushError');
      if (code === 'PLAINTEXT_JSON' || code === 'PLAINTEXT_CSV') {
        msg = getMessage('options_bitwardenBackupPlaintextBlocked');
      } else if (code === 'NOT_ENCRYPTED') {
        msg = getMessage('options_bitwardenBackupNotEncrypted');
      } else if (code === 'TOO_LARGE') {
        msg = getMessage('options_bitwardenBackupTooLarge');
      }
      showResult(msg, 'error');
      return;
    }
    if (reEncryptInput?.checked && password) {
      const profileId = await getActiveProfileId();
      const storedPw = await getStoredBackupPassword(profileId);
      if (storedPw !== password) {
        await chrome.runtime.sendMessage({
          action: 'setBitwardenBackupPassword',
          password,
          profileId,
        });
        if (passwordInput) {
          passwordInput.value = '********';
          passwordInput.dataset.hasPassword = 'true';
        }
      }
    }
    showResult(getMessage('options_bitwardenBackupPushSuccess', [resp.path || '']), 'success');
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    if (fileNameEl) fileNameEl.textContent = '';
    updatePushButtonState();
    await refreshBackupList();
  } catch (err) {
    showResult(err.message || getMessage('options_bitwardenBackupPushError'), 'error');
  } finally {
    updatePushButtonState();
  }
}

async function saveBackupPath() {
  const path = await getBackupPath();
  await chrome.storage.sync.set({ [STORAGE_KEYS.BITWARDEN_BACKUP_PATH]: path });
}

/**
 * @param {{ loadSettings?: () => Promise<void> }} [ctx]
 */
export function initBitwardenBackup(ctx = {}) {
  if (!fileInput || !pushBtn) return;

  reEncryptInput?.addEventListener('change', () => {
    if (reEncryptGroup) {
      reEncryptGroup.style.display = reEncryptInput.checked ? 'block' : 'none';
    }
  });

  fileTrigger?.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    selectedFile = fileInput.files?.[0] || null;
    if (fileNameEl) fileNameEl.textContent = selectedFile?.name || '';
    updatePushButtonState();
  });

  pushBtn.addEventListener('click', () => pushBackup());
  refreshBtn?.addEventListener('click', () => refreshBackupList());
  pathInput?.addEventListener('change', () => saveBackupPath());
  deleteConfirmBtn?.addEventListener('click', () => executeDeleteBackup());
  deleteCancelBtn?.addEventListener('click', () => hideDeleteConfirm());

  savePasswordBtn?.addEventListener('click', async () => {
    const pw = passwordInput?.value?.trim();
    if (!pw || passwordInput?.dataset.hasPassword === 'true') {
      showResult(getMessage('options_bitwardenBackupPasswordRequired'), 'error');
      return;
    }
    const profileId = await getActiveProfileId();
    await chrome.runtime.sendMessage({
      action: 'setBitwardenBackupPassword',
      password: pw,
      profileId,
    });
    passwordInput.value = '********';
    passwordInput.dataset.hasPassword = 'true';
    showResult(getMessage('options_bitwardenBackupPasswordSaved'), 'success');
  });

  const copyCliBtn = document.getElementById('bitwarden-backup-copy-cli-btn');
  const cliBlock = document.getElementById('bitwarden-backup-cli-block');
  copyCliBtn?.addEventListener('click', async () => {
    if (!cliBlock || !copyCliBtn) return;
    const text = cliBlock.textContent?.trim() ?? '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const orig = copyCliBtn.textContent;
      copyCliBtn.textContent = '✓';
      setTimeout(() => {
        copyCliBtn.textContent = orig;
      }, 1200);
    } catch (err) {
      console.warn('[GitSyncMarks] Clipboard copy failed:', err);
    }
  });

  (async () => {
    const profileId = await getActiveProfileId();
    await migrateLegacyBackupPassword(profileId);
    const globals = await chrome.storage.sync.get({
      [STORAGE_KEYS.BITWARDEN_BACKUP_PATH]: DEFAULT_BITWARDEN_BACKUP_PATH,
    });
    if (pathInput) {
      pathInput.value = globals[STORAGE_KEYS.BITWARDEN_BACKUP_PATH] || DEFAULT_BITWARDEN_BACKUP_PATH;
    }
    const storedPw = await getStoredBackupPassword(profileId);
    if (storedPw && passwordInput) {
      passwordInput.value = '********';
      passwordInput.dataset.hasPassword = 'true';
    }
    if (reEncryptGroup && reEncryptInput) {
      reEncryptGroup.style.display = reEncryptInput.checked ? 'block' : 'none';
    }
  })();
}
