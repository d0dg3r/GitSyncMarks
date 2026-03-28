/**
 * Options Page – Settings Sync, Export/Import & File Generation
 * Handles settings sync to Git, file export/import, generated files toggle,
 * and automation clipboard helpers.
 */

import { getMessage } from '../lib/i18n.js';
import { serializeToJson, deserializeFromJson, bookmarkTreeToFileMap, fileMapToDashyYaml } from '../lib/bookmark-serializer.js';
import { replaceLocalBookmarks } from '../lib/sync-engine.js';
import { encryptToken, decryptToken, encryptWithPassword, decryptWithPassword, PASSWORD_ENC_PREFIX } from '../lib/crypto.js';

let _saveSettings = null;
let _loadSettings = null;
let _showOnboardingConfirm = null;
let _hideOnboardingConfirm = null;

const STORAGE_KEYS = {
  SYNC_SETTINGS_TO_GIT: 'syncSettingsToGit',
  SETTINGS_SYNC_MODE: 'settingsSyncMode',
  SETTINGS_SYNC_GLOBAL_WRITE_ENABLED: 'settingsSyncGlobalWriteEnabled',
};

const LOCAL_STORAGE_KEYS = {
  SETTINGS_SYNC_CLIENT_NAME: 'settingsSyncClientName',
};

// --- DOM element lookups ---

// Export/import elements
const exportTypeSelect = document.getElementById('export-type-select');
const exportBtn = document.getElementById('export-btn');
const exportResult = document.getElementById('export-result');
const importTypeSelect = document.getElementById('import-type-select');
const importWarning = document.getElementById('import-warning');
const importFile = document.getElementById('import-file');
const importFileTrigger = document.getElementById('import-file-trigger');
const importFilename = document.getElementById('import-filename');
const importBtn = document.getElementById('import-btn');
const importResult = document.getElementById('import-result');
const passwordDialog = document.getElementById('password-dialog');
const passwordDialogPrompt = document.getElementById('password-dialog-prompt');
const passwordDialogInput = document.getElementById('password-dialog-input');
const passwordDialogConfirmBtn = document.getElementById('password-dialog-confirm-btn');
const passwordDialogCancelBtn = document.getElementById('password-dialog-cancel-btn');

// Settings sync elements
const syncSettingsToGitInput = document.getElementById('sync-settings-to-git');
const settingsSyncOptionsGroup = document.getElementById('settings-sync-options-group');
const settingsSyncModeSelect = document.getElementById('settings-sync-mode');
const settingsSyncGlobalWriteGroup = document.getElementById('settings-sync-global-write-group');
const settingsSyncGlobalWriteEnabledInput = document.getElementById('settings-sync-global-write-enabled');
const settingsSyncPasswordInput = document.getElementById('settings-sync-password');
const settingsSyncSavePwBtn = document.getElementById('settings-sync-save-pw-btn');
const settingsSyncResult = document.getElementById('settings-sync-result');
const settingsSyncImportGroup = document.getElementById('settings-sync-import-group');
const settingsSyncClientNameInput = document.getElementById('settings-sync-client-name');
const settingsSyncLoadBtn = document.getElementById('settings-sync-load-btn');
const settingsSyncDeviceList = document.getElementById('settings-sync-device-list');
const settingsSyncImportBtn = document.getElementById('settings-sync-import-btn');
const settingsSyncPushSelectedBtn = document.getElementById('settings-sync-push-selected-btn');
const settingsSyncCreateBtn = document.getElementById('settings-sync-create-btn');
const settingsSyncImportResult = document.getElementById('settings-sync-import-result');

// Generate files elements
const generateReadmeMdSelect = document.getElementById('generate-readme-md');
const generateBookmarksHtmlSelect = document.getElementById('generate-bookmarks-html');
const generateFeedXmlSelect = document.getElementById('generate-feed-xml');
const generateDashyYmlSelect = document.getElementById('generate-dashy-yml');
const generateFilesBtn = document.getElementById('generate-files-btn');

// Automation elements
const automationCopyJsonBtn = document.getElementById('automation-copy-json-btn');
const automationCopyGhBtn = document.getElementById('automation-copy-gh-btn');
const automationJsonBlock = document.getElementById('automation-json-block');
const automationGhBlock = document.getElementById('automation-gh-block');

// --- Module-level state ---

let settingsProfiles = [];
let generateFilesSyncTimer = null;
const GENERATE_FILES_DEBOUNCE_MS = 2000;
const GENERATE_FILES_RETRY_DELAY_MS = 2500;

// --- Functions ---

export function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function showResult(el, message, type) {
  el.textContent = message;
  el.className = `ie-result ${type}`;
  setTimeout(() => { el.textContent = ''; el.className = 'ie-result'; }, 4000);
}

async function copyAutomationToClipboard(preEl, btn) {
  const text = preEl?.textContent?.trim() ?? '';
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const orig = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = orig; }, 1200);
  } catch (err) {
    console.warn('Clipboard copy failed:', err);
  }
}

function scheduleGenerateFilesSync(isRetry = false) {
  if (generateFilesSyncTimer) clearTimeout(generateFilesSyncTimer);
  const delayMs = isRetry ? GENERATE_FILES_RETRY_DELAY_MS : GENERATE_FILES_DEBOUNCE_MS;
  generateFilesSyncTimer = setTimeout(async () => {
    generateFilesSyncTimer = null;
    try {
      const result = await chrome.runtime.sendMessage({ action: 'push' });
      if (result?.alreadyInProgress === true && !isRetry) {
        scheduleGenerateFilesSync(true);
      }
    } catch (e) { /* Background may be terminated (e.g. Firefox) */ }
  }, delayMs);
}

export function updateGenerateFilesBtn() {
  const anyEnabled = generateReadmeMdSelect.value !== 'off' ||
    generateBookmarksHtmlSelect.value !== 'off' ||
    generateFeedXmlSelect.value !== 'off' ||
    generateDashyYmlSelect.value !== 'off';
  generateFilesBtn.style.display = anyEnabled ? '' : 'none';
}

async function onGenerateFilesToggleChange() {
  updateGenerateFilesBtn();
  await _saveSettings();
  if (generateReadmeMdSelect.value === 'auto' ||
    generateBookmarksHtmlSelect.value === 'auto' ||
    generateFeedXmlSelect.value === 'auto' ||
    generateDashyYmlSelect.value === 'auto') {
    scheduleGenerateFilesSync();
  }
}

export function updateSettingsSyncVisibility() {
  settingsSyncOptionsGroup.style.display = syncSettingsToGitInput.checked ? '' : 'none';
  // Global mode is temporarily unavailable; keep UI visible but fixed to individual.
  settingsSyncModeSelect.value = 'individual';
  settingsSyncModeSelect.disabled = true;
  settingsSyncImportGroup.style.display = syncSettingsToGitInput.checked ? '' : 'none';
  settingsSyncGlobalWriteGroup.style.display = 'none';
}

function settingsSyncClientAlias() {
  const raw = String(settingsSyncClientNameInput?.value || '').trim().toLowerCase();
  return raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
}

export function updateSettingsSyncButtonsState() {
  const hasName = !!settingsSyncClientAlias();
  const hasProfiles = settingsProfiles.length > 0;
  settingsSyncDeviceList.disabled = !hasName || !hasProfiles;
  settingsSyncImportBtn.disabled = !hasName || !hasProfiles;
  settingsSyncPushSelectedBtn.disabled = !hasName || !hasProfiles;
  settingsSyncCreateBtn.disabled = !hasName;
}

async function saveSettingsSyncPasswordAndUpdateUI(password) {
  await chrome.runtime.sendMessage({ action: 'setSettingsSyncPassword', password });
  settingsSyncPasswordInput.value = '********';
  settingsSyncPasswordInput.dataset.hasPassword = 'true';
}

function selectedSettingsProfile() {
  const ref = settingsSyncDeviceList.value;
  return settingsProfiles.find((p) => (p.path || p.filename) === ref) || null;
}

export function renderSettingsProfiles(configs) {
  settingsProfiles = Array.isArray(configs) ? configs : [];
  settingsSyncDeviceList.innerHTML = '';
  if (settingsProfiles.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = getMessage('options_settingsSyncImportEmpty');
    settingsSyncDeviceList.appendChild(opt);
  } else {
    for (const cfg of settingsProfiles) {
      const opt = document.createElement('option');
      opt.value = cfg.path || cfg.filename;
      const datePart = cfg.updatedAt ? ` · ${new Date(cfg.updatedAt).toLocaleString()}` : '';
      const alias = cfg.alias || cfg.name || cfg.filename;
      opt.textContent = `${alias}${datePart}`;
      settingsSyncDeviceList.appendChild(opt);
    }
    const ownAlias = settingsSyncClientAlias();
    if (ownAlias) {
      const ownPath = `profiles/${ownAlias}/settings.enc`;
      const ownOption = Array.from(settingsSyncDeviceList.options).find((o) => o.value === ownPath);
      if (ownOption) settingsSyncDeviceList.value = ownPath;
    }
  }
  updateSettingsSyncButtonsState();
}

export async function refreshSettingsProfiles() {
  settingsSyncLoadBtn.disabled = true;
  settingsSyncImportResult.textContent = '';
  try {
    const resp = await chrome.runtime.sendMessage({ action: 'listSettingsProfiles' });
    renderSettingsProfiles(resp?.success ? resp.configs : []);
    if (!resp?.success) {
      settingsSyncImportResult.textContent = resp?.message || 'Error';
      settingsSyncImportResult.className = 'validation-result error';
    }
  } catch (e) {
    settingsSyncImportResult.textContent = e.message || 'Error';
    settingsSyncImportResult.className = 'validation-result error';
  }
  settingsSyncLoadBtn.disabled = false;
}

async function buildSettingsExportData() {
  const syncSettings = await chrome.storage.sync.get(null);
  const localData = await chrome.storage.local.get({ profileTokens: {}, syncState: {} });
  const profiles = syncSettings.profiles || {};
  const profileTokens = localData.profileTokens || {};
  const exportedProfiles = {};
  for (const [id, p] of Object.entries(profiles)) {
    let token = '';
    try {
      token = profileTokens[id] ? await decryptToken(profileTokens[id]) : '';
    } catch { /* ignore */ }
    exportedProfiles[id] = { ...p, token };
  }
  return { ...syncSettings, profiles: exportedProfiles };
}

export function showPasswordDialog(promptKey, confirmKey) {
  return new Promise((resolve) => {
    passwordDialogPrompt.textContent = getMessage(promptKey);
    passwordDialogConfirmBtn.textContent = getMessage(confirmKey);
    passwordDialogInput.value = '';
    passwordDialog.style.display = '';
    passwordDialogInput.focus();

    const finish = (password) => {
      passwordDialog.style.display = 'none';
      passwordDialogInput.value = '';
      passwordDialogConfirmBtn.removeEventListener('click', onConfirm);
      passwordDialogCancelBtn.removeEventListener('click', onCancel);
      passwordDialogInput.removeEventListener('keydown', onKeyDown);
      resolve(password);
    };

    const onConfirm = () => {
      const pwd = passwordDialogInput.value;
      if (!pwd.trim()) return;
      finish(pwd);
    };

    const onCancel = () => finish(null);

    const onKeyDown = (e) => {
      if (e.key === 'Enter') onConfirm();
      if (e.key === 'Escape') onCancel();
    };

    passwordDialogConfirmBtn.addEventListener('click', onConfirm);
    passwordDialogCancelBtn.addEventListener('click', onCancel);
    passwordDialogInput.addEventListener('keydown', onKeyDown);
  });
}

/**
 * Reload extension runtime after settings import so profile changes are
 * immediately reflected across popup/background/options in all browsers.
 */
function reloadAfterSettingsImport(delayMs = 800) {
  setTimeout(() => {
    try {
      if (chrome?.runtime?.reload) {
        chrome.runtime.reload();
        return;
      }
    } catch {
      // Fallback below when runtime reload is unavailable.
    }
    location.reload();
  }, delayMs);
}

export async function confirmReloadAfterImport() {
  const shouldReload = await _showOnboardingConfirm(
    getMessage('options_settingsSyncImportReloadConfirm'),
    getMessage('options_settingsSyncImportReloadConfirmBtn')
  );
  _hideOnboardingConfirm();
  if (shouldReload) reloadAfterSettingsImport();
}

async function applyImportedSettings(settings) {
  if (settings.profiles && Object.keys(settings.profiles).length > 0) {
    const profileTokens = {};
    const profilesToSave = {};
    for (const [id, p] of Object.entries(settings.profiles)) {
      profilesToSave[id] = {
        id: p.id || id,
        name: p.name || 'Default',
        owner: p.owner || '',
        repo: p.repo || '',
        branch: p.branch || 'main',
        filePath: p.filePath || 'bookmarks',
        githubReposEnabled: p.githubReposEnabled ?? false,
        githubReposParent: p.githubReposParent ?? 'other',
        githubReposUsername: p.githubReposUsername ?? '',
      };
      if (p.token) {
        profileTokens[id] = await encryptToken(p.token);
      }
    }
    await chrome.storage.sync.set({
      profiles: profilesToSave,
      activeProfileId: settings.activeProfileId || Object.keys(profilesToSave)[0],
      autoSync: settings.autoSync !== false,
      syncInterval: settings.syncInterval ?? 15,
      syncOnStartup: settings.syncOnStartup || false,
      syncOnFocus: settings.syncOnFocus || false,
      syncProfile: settings.syncProfile || 'normal',
      debounceDelay: settings.debounceDelay ?? 5000,
      notificationsMode: settings.notificationsMode || 'all',
      language: settings.language || 'auto',
      theme: settings.theme || 'auto',
      profileSwitchWithoutConfirm: settings.profileSwitchWithoutConfirm ?? false,
      generateReadmeMd: settings.generateReadmeMd !== false,
      generateBookmarksHtml: settings.generateBookmarksHtml !== false,
      generateFeedXml: settings.generateFeedXml ?? 'auto',
      generateDashyYml: settings.generateDashyYml ?? 'off',
      settingsSyncGlobalWriteEnabled: settings.settingsSyncGlobalWriteEnabled === true,
    });
    await chrome.storage.local.set({ profileTokens });
  } else {
    const defaultProfile = {
      id: 'default',
      name: 'Default',
      owner: settings.repoOwner || '',
      repo: settings.repoName || '',
      branch: settings.branch || 'main',
      filePath: settings.filePath || 'bookmarks',
    };
    const profileTokens = {};
    if (settings.githubToken) {
      profileTokens.default = await encryptToken(settings.githubToken);
    }
    await chrome.storage.sync.set({
      profiles: { default: defaultProfile },
      activeProfileId: 'default',
      autoSync: settings.autoSync !== false,
      syncInterval: settings.syncInterval ?? 15,
      syncOnStartup: settings.syncOnStartup || false,
      syncOnFocus: settings.syncOnFocus || false,
      syncProfile: settings.syncProfile || 'normal',
      debounceDelay: settings.debounceDelay ?? 5000,
      notificationsMode: settings.notificationsMode || 'all',
      language: settings.language || 'auto',
      theme: settings.theme || 'auto',
      profileSwitchWithoutConfirm: settings.profileSwitchWithoutConfirm ?? false,
      generateReadmeMd: settings.generateReadmeMd !== false,
      generateBookmarksHtml: settings.generateBookmarksHtml !== false,
      generateFeedXml: settings.generateFeedXml ?? 'auto',
      generateDashyYml: settings.generateDashyYml ?? 'off',
      settingsSyncGlobalWriteEnabled: settings.settingsSyncGlobalWriteEnabled === true,
    });
    await chrome.storage.local.set({ profileTokens });
  }
  await chrome.runtime.sendMessage({ action: 'settingsChanged' });
}

// --- Init (event handlers) ---

export function initSettings({ saveSettings, loadSettings, showOnboardingConfirm, hideOnboardingConfirm }) {
  _saveSettings = saveSettings;
  _loadSettings = loadSettings;
  _showOnboardingConfirm = showOnboardingConfirm;
  _hideOnboardingConfirm = hideOnboardingConfirm;

  // Automation copy buttons
  if (automationCopyJsonBtn) {
    automationCopyJsonBtn.addEventListener('click', () => copyAutomationToClipboard(automationJsonBlock, automationCopyJsonBtn));
  }
  if (automationCopyGhBtn) {
    automationCopyGhBtn.addEventListener('click', () => copyAutomationToClipboard(automationGhBlock, automationCopyGhBtn));
  }

  // Generate files
  generateFilesBtn.addEventListener('click', async () => {
    generateFilesBtn.disabled = true;
    try {
      await chrome.runtime.sendMessage({ action: 'generateFilesNow' });
    } catch (e) { /* Background may be terminated */ }
    generateFilesBtn.disabled = false;
  });

  generateReadmeMdSelect.addEventListener('change', onGenerateFilesToggleChange);
  generateBookmarksHtmlSelect.addEventListener('change', onGenerateFilesToggleChange);
  generateFeedXmlSelect.addEventListener('change', onGenerateFilesToggleChange);
  generateDashyYmlSelect.addEventListener('change', onGenerateFilesToggleChange);

  // Settings sync to Git
  syncSettingsToGitInput.addEventListener('change', async () => {
    updateSettingsSyncVisibility();
    await _saveSettings();
    if (!syncSettingsToGitInput.checked) {
      try {
        await chrome.runtime.sendMessage({ action: 'clearSettingsSyncPassword' });
      } catch { /* ignored */ }
      settingsSyncPasswordInput.value = '';
      settingsSyncPasswordInput.dataset.hasPassword = '';
      settingsSyncResult.textContent = '';
      renderSettingsProfiles([]);
    } else {
      await refreshSettingsProfiles();
    }
  });

  settingsSyncModeSelect.addEventListener('change', async () => {
    settingsSyncModeSelect.value = 'individual';
    updateSettingsSyncVisibility();
    await _saveSettings();
  });
  settingsSyncGlobalWriteEnabledInput.addEventListener('change', async () => {
    settingsSyncGlobalWriteEnabledInput.checked = false;
    await _saveSettings();
  });

  settingsSyncClientNameInput.addEventListener('change', async () => {
    await chrome.storage.local.set({
      [LOCAL_STORAGE_KEYS.SETTINGS_SYNC_CLIENT_NAME]: settingsSyncClientNameInput.value.trim(),
    });
    updateSettingsSyncButtonsState();
  });
  settingsSyncClientNameInput.addEventListener('input', updateSettingsSyncButtonsState);

  settingsSyncSavePwBtn.addEventListener('click', async () => {
    const pw = settingsSyncPasswordInput.value.trim();
    if (!pw || pw === '********') {
      settingsSyncResult.textContent = getMessage('options_settingsSyncPasswordMissing');
      settingsSyncResult.className = 'validation-result error';
      return;
    }
    settingsSyncSavePwBtn.disabled = true;
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'setSettingsSyncPassword',
        password: pw,
        triggerPush: true,
      });
      settingsSyncPasswordInput.value = '********';
      settingsSyncPasswordInput.dataset.hasPassword = 'true';
      settingsSyncResult.textContent = getMessage('options_settingsSyncActive');
      settingsSyncResult.className = 'validation-result success';
    } catch (e) {
      settingsSyncResult.textContent = e.message || 'Error';
      settingsSyncResult.className = 'validation-result error';
    }
    settingsSyncSavePwBtn.disabled = false;
  });

  settingsSyncLoadBtn.addEventListener('click', refreshSettingsProfiles);

  settingsSyncImportBtn.addEventListener('click', async () => {
    if (!settingsSyncClientAlias()) {
      settingsSyncImportResult.textContent = getMessage('options_settingsSyncClientNameRequired');
      settingsSyncImportResult.className = 'validation-result error';
      return;
    }
    const selected = selectedSettingsProfile();
    const filename = selected?.path || selected?.filename || settingsSyncDeviceList.value;
    if (!filename) return;
    settingsSyncImportBtn.disabled = true;
    settingsSyncImportResult.textContent = '';
    try {
      const password = await showPasswordDialog('options_settingsRegistryActionPasswordPrompt', 'options_settingsRegistryImportApplyBtn');
      if (!password) return;
      const resp = await chrome.runtime.sendMessage({ action: 'importSettingsProfile', filename, password });
      if (resp.success) {
        await saveSettingsSyncPasswordAndUpdateUI(password);
        settingsSyncImportResult.textContent = getMessage('options_settingsRegistryImportSuccess');
        settingsSyncImportResult.className = 'validation-result success';
        await _loadSettings();
        await confirmReloadAfterImport();
      } else {
        settingsSyncImportResult.textContent = resp.message || 'Error';
        settingsSyncImportResult.className = 'validation-result error';
      }
    } catch (e) {
      settingsSyncImportResult.textContent = e.message || 'Error';
      settingsSyncImportResult.className = 'validation-result error';
    }
    settingsSyncImportBtn.disabled = false;
  });

  settingsSyncPushSelectedBtn.addEventListener('click', async () => {
    if (!settingsSyncClientAlias()) {
      settingsSyncImportResult.textContent = getMessage('options_settingsSyncClientNameRequired');
      settingsSyncImportResult.className = 'validation-result error';
      return;
    }
    const selected = selectedSettingsProfile();
    if (!(selected?.path || selected?.filename)) return;
    settingsSyncPushSelectedBtn.disabled = true;
    settingsSyncImportResult.textContent = '';
    try {
      const password = await showPasswordDialog('options_settingsRegistryActionPasswordPrompt', 'options_settingsRegistrySyncSelectedBtn');
      if (!password) return;
      const resp = await chrome.runtime.sendMessage({
        action: 'syncSettingsToProfile',
        filename: selected.path || selected.filename,
        name: selected.alias || selected.name || '',
        password,
      });
      if (resp?.success) {
        await saveSettingsSyncPasswordAndUpdateUI(password);
        settingsSyncImportResult.textContent = getMessage('options_settingsRegistrySyncSuccess');
        settingsSyncImportResult.className = 'validation-result success';
        await refreshSettingsProfiles();
      } else {
        settingsSyncImportResult.textContent = resp?.message || 'Error';
        settingsSyncImportResult.className = 'validation-result error';
      }
    } catch (e) {
      settingsSyncImportResult.textContent = e.message || 'Error';
      settingsSyncImportResult.className = 'validation-result error';
    }
    settingsSyncPushSelectedBtn.disabled = false;
  });

  settingsSyncCreateBtn.addEventListener('click', async () => {
    const name = settingsSyncClientNameInput.value.trim();
    if (!name) {
      settingsSyncImportResult.textContent = getMessage('options_settingsSyncClientNameRequired');
      settingsSyncImportResult.className = 'validation-result error';
      return;
    }
    settingsSyncCreateBtn.disabled = true;
    settingsSyncImportResult.textContent = '';
    try {
      const password = await showPasswordDialog('options_settingsRegistryActionPasswordPrompt', 'options_settingsSyncCreateOwnBtn');
      if (!password) return;
      await chrome.storage.local.set({
        [LOCAL_STORAGE_KEYS.SETTINGS_SYNC_CLIENT_NAME]: name,
      });
      const resp = await chrome.runtime.sendMessage({ action: 'createSettingsProfile', name, password });
      if (resp?.success) {
        await saveSettingsSyncPasswordAndUpdateUI(password);
        if (resp.alias && resp.normalizedFrom) {
          settingsSyncImportResult.textContent = getMessage('options_settingsRegistryAliasNormalized', [resp.alias]);
        } else if (resp.alias) {
          settingsSyncImportResult.textContent = `${getMessage('options_settingsRegistryCreateSuccess')} (${resp.alias})`;
        } else {
          settingsSyncImportResult.textContent = getMessage('options_settingsRegistryCreateSuccess');
        }
        settingsSyncImportResult.className = 'validation-result success';
        await refreshSettingsProfiles();
      } else {
        if (resp?.code === 'CLIENT_NAME_CONFLICT') {
          settingsSyncImportResult.textContent = getMessage('options_settingsSyncClientNameConflict', [name]);
        } else {
          settingsSyncImportResult.textContent = resp?.message || 'Error';
        }
        settingsSyncImportResult.className = 'validation-result error';
      }
    } catch (e) {
      settingsSyncImportResult.textContent = e.message || 'Error';
      settingsSyncImportResult.className = 'validation-result error';
    }
    settingsSyncCreateBtn.disabled = false;
  });

  // Export / Import
  importFileTrigger.addEventListener('click', () => importFile.click());

  importFile.addEventListener('change', () => {
    const hasFile = !!importFile.files.length;
    importBtn.disabled = !hasFile;
    importFilename.textContent = hasFile ? importFile.files[0].name : '';
  });

  importTypeSelect.addEventListener('change', () => {
    importFile.value = '';
    importBtn.disabled = true;
    importFilename.textContent = '';
    const isSettings = importTypeSelect.value === 'settings';
    importFile.accept = isSettings ? '.json,.enc' : '.json';
    importWarning.setAttribute('data-i18n', isSettings ? 'options_importSettingsWarning' : 'options_importBookmarksWarning');
    importWarning.textContent = getMessage(isSettings ? 'options_importSettingsWarning' : 'options_importBookmarksWarning');
  });

  exportBtn.addEventListener('click', async () => {
    const type = exportTypeSelect.value;
    const date = new Date().toISOString().slice(0, 10);
    try {
      if (type === 'bookmarks') {
        const tree = await chrome.bookmarks.getTree();
        const deviceId = crypto.randomUUID();
        const data = serializeToJson(tree, deviceId);
        downloadFile(`bookmarks-export-${date}.json`, JSON.stringify(data, null, 2), 'application/json');
        showResult(exportResult, getMessage('options_exportSuccess'), 'success');
      } else if (type === 'dashy') {
        const tree = await chrome.bookmarks.getTree();
        const fileMap = bookmarkTreeToFileMap(tree, 'bookmarks');
        const yaml = fileMapToDashyYaml(fileMap, 'bookmarks');
        downloadFile(`dashy-conf-${date}.yml`, yaml, 'text/yaml');
        showResult(exportResult, getMessage('options_exportSuccess'), 'success');
      } else if (type === 'settings-plain') {
        const exportData = await buildSettingsExportData();
        downloadFile(`gitsyncmarks-settings-${date}.json`, JSON.stringify(exportData, null, 2), 'application/json');
        showResult(exportResult, getMessage('options_exportSuccess'), 'success');
      } else if (type === 'settings-encrypted') {
        const password = await showPasswordDialog('options_exportPasswordPrompt', 'options_exportBtn');
        if (!password) return;
        const exportData = await buildSettingsExportData();
        const json = JSON.stringify(exportData, null, 2);
        const encrypted = await encryptWithPassword(json, password);
        downloadFile(`gitsyncmarks-settings-${date}.enc`, encrypted, 'application/octet-stream');
        showResult(exportResult, getMessage('options_exportEncryptedSuccess'), 'success');
      }
    } catch (err) {
      showResult(exportResult, getMessage('options_importError', [err.message]), 'error');
    }
  });

  importBtn.addEventListener('click', async () => {
    const file = importFile.files[0];
    if (!file) return;
    const isSettings = importTypeSelect.value === 'settings';

    try {
      let text = await file.text();

      if (isSettings) {
        if (text.trim().startsWith(PASSWORD_ENC_PREFIX)) {
          const password = await showPasswordDialog('options_importPasswordPrompt', 'options_importBtn');
          if (!password) return;
          text = await decryptWithPassword(text, password);
        }
        const settings = JSON.parse(text);
        if (typeof settings !== 'object' || Array.isArray(settings)) {
          throw new Error('Invalid settings format.');
        }
        await applyImportedSettings(settings);
        showResult(importResult, getMessage('options_importSuccess'), 'success');
        await _loadSettings();
        importFile.value = '';
        importBtn.disabled = true;
        importFilename.textContent = '';
        await confirmReloadAfterImport();
      } else {
        const data = JSON.parse(text);
        const bookmarks = deserializeFromJson(data);
        const roleMap = {};
        for (const node of bookmarks) {
          const role = node.role || 'other';
          roleMap[role] = { title: role, children: node.children || [] };
        }
        await replaceLocalBookmarks(roleMap);
        showResult(importResult, getMessage('options_importSuccess'), 'success');
        importFile.value = '';
        importBtn.disabled = true;
        importFilename.textContent = '';
      }
    } catch (err) {
      const msg = (isSettings && err.message?.includes('Wrong password'))
        ? getMessage('options_decryptError')
        : getMessage('options_importError', [err.message]);
      showResult(importResult, msg, 'error');
    }
  });
}
