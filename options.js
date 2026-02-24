/**
 * Options Page Logic
 * Handles tab navigation, settings, token validation, language selection,
 * and bookmark/settings import/export.
 */

import { DISPLAY_VERSION } from './lib/display-version.js';
import { GitHubAPI } from './lib/github-api.js';
import { checkPathSetup, initializeRemoteFolder } from './lib/onboarding.js';
import { initI18n, applyI18n, getMessage, reloadI18n, getLanguage, SUPPORTED_LANGUAGES } from './lib/i18n.js';
import { initTheme, applyTheme } from './lib/theme.js';
import { serializeToJson, deserializeFromJson, bookmarkTreeToFileMap, fileMapToDashyYaml } from './lib/bookmark-serializer.js';
import { replaceLocalBookmarks, SYNC_PRESETS } from './lib/sync-engine.js';
import { updateGitHubReposFolder } from './lib/github-repos.js';
import { encryptToken, decryptToken, migrateTokenIfNeeded, encryptWithPassword, decryptWithPassword, PASSWORD_ENC_PREFIX } from './lib/crypto.js';
import {
  isDebugLogEnabled,
  setDebugLogEnabled,
} from './lib/debug-log.js';
import {
  getProfiles,
  getActiveProfileId,
  getProfileSettings,
  saveProfile,
  addProfile,
  deleteProfile,
  switchProfile,
  migrateToProfiles,
  MAX_PROFILES,
} from './lib/profile-manager.js';

const STORAGE_KEYS = {
  GITHUB_TOKEN: 'githubToken',
  REPO_OWNER: 'repoOwner',
  REPO_NAME: 'repoName',
  BRANCH: 'branch',
  FILE_PATH: 'filePath',
  AUTO_SYNC: 'autoSync',
  SYNC_INTERVAL: 'syncInterval',
  SYNC_ON_STARTUP: 'syncOnStartup',
  SYNC_ON_FOCUS: 'syncOnFocus',
  SYNC_PROFILE: 'syncProfile',
  NOTIFICATIONS_MODE: 'notificationsMode',
  NOTIFICATIONS_ENABLED: 'notificationsEnabled', // legacy, for migration
  DEBOUNCE_DELAY: 'debounceDelay',
  LANGUAGE: 'language',
  THEME: 'theme',
  PROFILE_SWITCH_WITHOUT_CONFIRM: 'profileSwitchWithoutConfirm',
  GENERATE_README_MD: 'generateReadmeMd',
  GENERATE_BOOKMARKS_HTML: 'generateBookmarksHtml',
  GENERATE_FEED_XML: 'generateFeedXml',
  GENERATE_DASHY_YML: 'generateDashyYml',
  SYNC_SETTINGS_TO_GIT: 'syncSettingsToGit',
  SETTINGS_SYNC_MODE: 'settingsSyncMode',
  SETTINGS_SYNC_GLOBAL_WRITE_ENABLED: 'settingsSyncGlobalWriteEnabled',
};

function normalizeGenMode(val) {
  if (val === true) return 'auto';
  if (val === false) return 'off';
  if (val === 'off' || val === 'manual' || val === 'auto') return val;
  return 'auto';
}

// ---- DOM elements: Settings Tab ----
const profileSelect = document.getElementById('profile-select');
const profileAddBtn = document.getElementById('profile-add-btn');
const profileRenameBtn = document.getElementById('profile-rename-btn');
const profileDeleteBtn = document.getElementById('profile-delete-btn');
const profileLimitEl = document.getElementById('profile-limit');
const profileSpinner = document.getElementById('profile-spinner');
const profileSwitchingMsg = document.getElementById('profile-switching-msg');
const profileSwitchWithoutConfirmInput = document.getElementById('profile-switch-without-confirm');
const profileSwitchConfirm = document.getElementById('profile-switch-confirm');
const profileSwitchConfirmText = document.getElementById('profile-switch-confirm-text');
const profileSwitchConfirmBtn = document.getElementById('profile-switch-confirm-btn');
const profileDeleteConfirm = document.getElementById('profile-delete-confirm');
const profileDeleteConfirmText = document.getElementById('profile-delete-confirm-text');
const profileDeleteConfirmBtn = document.getElementById('profile-delete-confirm-btn');
const profileDeleteCancelBtn = document.getElementById('profile-delete-cancel-btn');
const profileAddDialog = document.getElementById('profile-add-dialog');
const profileAddNameInput = document.getElementById('profile-add-name-input');
const profileAddConfirmBtn = document.getElementById('profile-add-confirm-btn');
const profileAddCancelBtn = document.getElementById('profile-add-cancel-btn');
const profileRenameDialog = document.getElementById('profile-rename-dialog');
const profileRenameInput = document.getElementById('profile-rename-input');
const profileRenameConfirmBtn = document.getElementById('profile-rename-confirm-btn');
const profileRenameCancelBtn = document.getElementById('profile-rename-cancel-btn');
const profileMessage = document.getElementById('profile-message');
const profileSwitchCancelBtn = document.getElementById('profile-switch-cancel-btn');
const validationSpinner = document.getElementById('validation-spinner');
const tokenInput = document.getElementById('token');
const toggleTokenBtn = document.getElementById('toggle-token');
const ownerInput = document.getElementById('owner');
const repoInput = document.getElementById('repo');
const branchInput = document.getElementById('branch');
const filepathInput = document.getElementById('filepath');
const btnBrowseFolder = document.getElementById('btn-browse-folder');
const folderBrowser = document.getElementById('folder-browser');
const folderBrowserList = document.getElementById('folder-browser-list');
const folderBrowserPath = document.getElementById('folder-browser-path');
const folderBrowserEmpty = document.getElementById('folder-browser-empty');
const folderBrowserLoading = document.getElementById('folder-browser-loading');
const btnFolderUp = document.getElementById('btn-folder-up');
const autoSyncInput = document.getElementById('auto-sync');
const syncProfileSelect = document.getElementById('sync-profile');
const syncCustomFields = document.getElementById('sync-custom-fields');
const syncIntervalInput = document.getElementById('sync-interval');
const debounceDelayInput = document.getElementById('debounce-delay');
const syncOnStartupInput = document.getElementById('sync-on-startup');
const syncOnFocusInput = document.getElementById('sync-on-focus');
const generateReadmeMdSelect = document.getElementById('generate-readme-md');
const generateBookmarksHtmlSelect = document.getElementById('generate-bookmarks-html');
const generateFeedXmlSelect = document.getElementById('generate-feed-xml');
const generateDashyYmlSelect = document.getElementById('generate-dashy-yml');
const generateFilesBtn = document.getElementById('generate-files-btn');
const syncSettingsToGitInput = document.getElementById('sync-settings-to-git');
const settingsSyncOptionsGroup = document.getElementById('settings-sync-options-group');
const settingsSyncModeSelect = document.getElementById('settings-sync-mode');
const settingsSyncGlobalWriteGroup = document.getElementById('settings-sync-global-write-group');
const settingsSyncGlobalWriteEnabledInput = document.getElementById('settings-sync-global-write-enabled');
const settingsSyncPasswordInput = document.getElementById('settings-sync-password');
const settingsSyncSavePwBtn = document.getElementById('settings-sync-save-pw-btn');
const settingsSyncResult = document.getElementById('settings-sync-result');
const settingsSyncImportGroup = document.getElementById('settings-sync-import-group');
const settingsSyncLoadBtn = document.getElementById('settings-sync-load-btn');
const settingsSyncDeviceList = document.getElementById('settings-sync-device-list');
const settingsSyncImportBtn = document.getElementById('settings-sync-import-btn');
const settingsSyncPushSelectedBtn = document.getElementById('settings-sync-push-selected-btn');
const settingsSyncNewNameInput = document.getElementById('settings-sync-new-name');
const settingsSyncCreateBtn = document.getElementById('settings-sync-create-btn');
const settingsSyncImportResult = document.getElementById('settings-sync-import-result');
const notificationsModeSelect = document.getElementById('notifications-mode');
const validateBtn = document.getElementById('validate-btn');
const validationResult = document.getElementById('validation-result');
const onboardingConfirm = document.getElementById('onboarding-confirm');
const onboardingConfirmText = document.getElementById('onboarding-confirm-text');
const onboardingConfirmYesBtn = document.getElementById('onboarding-confirm-yes-btn');
const onboardingConfirmNoBtn = document.getElementById('onboarding-confirm-no-btn');
const saveGitHubResult = document.getElementById('save-github-result');
const saveSyncResult = document.getElementById('save-sync-result');
const githubReposCard = document.getElementById('github-repos-card');
const githubReposEnabledInput = document.getElementById('github-repos-enabled');
const githubReposOptions = document.getElementById('github-repos-options');
const githubReposParentSelect = document.getElementById('github-repos-parent');
const githubReposRefreshBtn = document.getElementById('github-repos-refresh-btn');
const githubReposSpinner = document.getElementById('github-repos-spinner');
const githubReposResult = document.getElementById('github-repos-result');
const languageSelect = document.getElementById('language-select');
const themeCycleBtn = document.getElementById('theme-cycle-btn');
const THEME_CYCLE = ['auto', 'dark', 'light'];
const THEME_ICONS = { auto: 'A', dark: '☽', light: '☀' };
const THEME_TITLES = { auto: 'options_themeAuto', dark: 'options_themeDark', light: 'options_themeLight' };
const debugLogEnabledInput = document.getElementById('debug-log-enabled');
const debugLogExportBtn = document.getElementById('debug-log-export-btn');
const debugLogResult = document.getElementById('debug-log-result');

// ---- DOM elements: Export/Import (compact dropdown UI) ----
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

// ==============================
// Tab Navigation
// ==============================

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    const tabId = `tab-${btn.dataset.tab}`;
    document.getElementById(tabId).classList.add('active');
  });
});

document.querySelectorAll('.sub-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const parent = btn.closest('.tab-content');
    parent.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    parent.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(`subtab-${btn.dataset.subtab}`).classList.add('active');
  });
});

// ==============================
// Initialization
// ==============================

document.addEventListener('DOMContentLoaded', async () => {
  await initTheme();
  await initI18n();
  populateLanguageDropdown();
  applyI18n();
  document.title = `GitSyncMarks – ${getMessage('options_subtitle')}`;
  await loadSettings();
  loadShortcuts();

  // Show version: pre-release display or manifest
  const versionEl = document.getElementById('app-version');
  if (versionEl) {
    const version = DISPLAY_VERSION ?? chrome.runtime.getManifest().version;
    versionEl.textContent = version;
  }
});

// ==============================
// Help Tab: Dynamic Keyboard Shortcuts
// ==============================

const SHORTCUT_FORMAT = {
  Period: '.', Comma: ',', Space: 'Space',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
};

function formatShortcut(raw) {
  if (!raw) return getMessage('help_shortcutNotSet');
  return raw.split('+').map(p => SHORTCUT_FORMAT[p] || p).join('+');
}

function loadShortcuts() {
  if (!chrome.commands?.getAll) return;
  chrome.commands.getAll((commands) => {
    for (const cmd of commands) {
      if (cmd.name === 'quick-sync') {
        const el = document.getElementById('shortcut-quick-sync');
        if (el) el.textContent = formatShortcut(cmd.shortcut);
      } else if (cmd.name === 'open-options') {
        const el = document.getElementById('shortcut-open-options');
        if (el) el.textContent = formatShortcut(cmd.shortcut);
      }
    }
  });
}

document.getElementById('btn-customize-shortcuts')?.addEventListener('click', () => {
  const isFirefox = navigator.userAgent.includes('Firefox');
  const url = isFirefox ? 'about:addons' : 'chrome://extensions/shortcuts';
  chrome.tabs.create({ url });
});

// ==============================
// Files Tab: Factory Reset
// ==============================

const resetBtn = document.getElementById('btn-reset-extension');
const resetConfirmDialog = document.getElementById('reset-confirm-dialog');
const resetConfirmBtn = document.getElementById('btn-reset-confirm');
const resetCancelBtn = document.getElementById('btn-reset-cancel');

resetBtn?.addEventListener('click', () => {
  resetConfirmDialog.style.display = 'flex';
});

resetCancelBtn?.addEventListener('click', () => {
  resetConfirmDialog.style.display = 'none';
});

resetConfirmBtn?.addEventListener('click', async () => {
  try {
    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    location.reload();
  } catch (err) {
    console.error('[GitSyncMarks] Reset failed:', err);
  }
});

// ==============================
// Settings Tab: Language
// ==============================

function detectSyncProfile(interval, debounceMs) {
  const intervalNum = parseInt(interval, 10) || 15;
  const debounceNum = debounceMs ?? 5000;
  for (const [key, preset] of Object.entries(SYNC_PRESETS)) {
    if (key === 'custom') continue;
    if (preset.interval === intervalNum && preset.debounceMs === debounceNum) return key;
  }
  return 'custom';
}

function getEffectiveSyncInterval() {
  const profile = syncProfileSelect.value;
  if (profile === 'custom') return parseInt(syncIntervalInput.value, 10) || 15;
  const preset = SYNC_PRESETS[profile];
  return preset?.interval ?? 15;
}

function getEffectiveDebounceMs() {
  const profile = syncProfileSelect.value;
  if (profile === 'custom') return (parseInt(debounceDelayInput.value, 10) || 5) * 1000;
  const preset = SYNC_PRESETS[profile];
  return preset?.debounceMs ?? 5000;
}

function updateSettingsSyncVisibility() {
  settingsSyncOptionsGroup.style.display = syncSettingsToGitInput.checked ? '' : 'none';
  const isIndividualMode = settingsSyncModeSelect.value === 'individual';
  settingsSyncImportGroup.style.display = syncSettingsToGitInput.checked ? '' : 'none';
  settingsSyncGlobalWriteGroup.style.display = !isIndividualMode ? '' : 'none';
}

let settingsProfiles = [];

function populateLanguageDropdown() {
  languageSelect.innerHTML = '';

  const autoOption = document.createElement('option');
  autoOption.value = 'auto';
  autoOption.textContent = getMessage('options_langAuto');
  languageSelect.appendChild(autoOption);

  for (const lang of SUPPORTED_LANGUAGES) {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = lang.name;
    languageSelect.appendChild(option);
  }
}

async function loadSettings() {
  await migrateTokenIfNeeded();
  await migrateToProfiles();

  const profiles = await getProfiles();
  const activeId = await getActiveProfileId();

  // Populate profile dropdown
  profileSelect.innerHTML = '';
  for (const [id, p] of Object.entries(profiles)) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = p.name || id;
    opt.dataset.profileId = id;
    if (id === activeId) opt.selected = true;
    profileSelect.appendChild(opt);
  }

  const profileCount = Object.keys(profiles).length;
  profileRenameBtn.style.display = profileCount > 0 ? 'inline-block' : 'none';
  profileDeleteBtn.style.display = profileCount > 1 ? 'inline-block' : 'none';
  profileLimitEl.textContent = getMessage('options_profilesLimit', [String(profileCount), String(MAX_PROFILES)]);
  profileAddBtn.disabled = profileCount >= MAX_PROFILES;

  // Load active profile's GitHub settings
  const profileSettings = await getProfileSettings(activeId);
  const activeProfile = profiles[activeId];
  if (profileSettings) {
    tokenInput.value = profileSettings.githubToken || '';
    ownerInput.value = profileSettings.repoOwner || '';
    repoInput.value = profileSettings.repoName || '';
    branchInput.value = profileSettings.branch || 'main';
    filepathInput.value = profileSettings.filePath || 'bookmarks';
    githubReposEnabledInput.checked = activeProfile?.githubReposEnabled ?? false;
    githubReposParentSelect.value = activeProfile?.githubReposParent ?? 'other';
  }

  // Show GitHub Repos card only when token is configured
  const isConfigured = !!(tokenInput.value.trim() && ownerInput.value.trim() && repoInput.value.trim());
  githubReposCard.style.display = isConfigured ? 'block' : 'none';
  githubReposOptions.style.display = githubReposEnabledInput.checked ? 'block' : 'none';

  // Load global sync settings
  const syncDefaults = {
    autoSync: true,
    syncInterval: 15,
    syncOnStartup: false,
    syncOnFocus: false,
    syncProfile: 'normal',
    debounceDelay: 5000,
    notificationsMode: 'all',
    notificationsEnabled: undefined,
    language: 'auto',
    generateReadmeMd: 'auto',
    generateBookmarksHtml: 'auto',
    generateFeedXml: 'auto',
    generateDashyYml: 'off',
    syncSettingsToGit: false,
    settingsSyncMode: 'global',
    settingsSyncGlobalWriteEnabled: false,
    theme: 'auto',
    profileSwitchWithoutConfirm: false,
    debugLogEnabled: false,
  };
  const globals = { ...syncDefaults, ...(await chrome.storage.sync.get(syncDefaults)) };

  autoSyncInput.checked = globals.autoSync !== false;
  syncIntervalInput.value = globals.syncInterval ?? 15;
  debounceDelayInput.value = Math.round((globals.debounceDelay ?? 5000) / 1000);
  const profile = detectSyncProfile(globals.syncInterval, globals.debounceDelay);
  syncProfileSelect.value = profile;
  syncCustomFields.style.display = profile === 'custom' ? 'block' : 'none';
  syncOnStartupInput.checked = globals.syncOnStartup === true;
  syncOnFocusInput.checked = globals.syncOnFocus === true;
  generateReadmeMdSelect.value = normalizeGenMode(globals.generateReadmeMd);
  generateBookmarksHtmlSelect.value = normalizeGenMode(globals.generateBookmarksHtml);
  generateFeedXmlSelect.value = normalizeGenMode(globals.generateFeedXml);
  generateDashyYmlSelect.value = normalizeGenMode(globals.generateDashyYml);
  syncSettingsToGitInput.checked = globals.syncSettingsToGit === true;
  settingsSyncModeSelect.value = globals.settingsSyncMode || 'global';
  settingsSyncGlobalWriteEnabledInput.checked = globals.settingsSyncGlobalWriteEnabled === true;
  updateSettingsSyncVisibility();
  if (globals.syncSettingsToGit === true) {
    await refreshSettingsProfiles();
  } else {
    renderSettingsProfiles([]);
  }
  const localPwState = await chrome.storage.local.get({ settingsSyncPassword: '' });
  if (localPwState.settingsSyncPassword) {
    settingsSyncPasswordInput.value = '********';
    settingsSyncPasswordInput.dataset.hasPassword = 'true';
  }
  updateGenerateFilesBtn();
  const mode = globals.notificationsMode;
  const oldEnabled = globals.notificationsEnabled;
  const displayMode = (mode && ['off', 'all', 'errorsOnly'].includes(mode))
    ? mode
    : (oldEnabled === false ? 'off' : 'all');
  notificationsModeSelect.value = displayMode;
  if (!mode && oldEnabled !== undefined) {
    await chrome.storage.sync.set({ [STORAGE_KEYS.NOTIFICATIONS_MODE]: displayMode });
    await chrome.storage.sync.remove(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
  }
  languageSelect.value = globals.language || 'auto';
  const theme = globals.theme || 'auto';
  if (themeCycleBtn) {
    themeCycleBtn.textContent = THEME_ICONS[theme] ?? 'A';
    themeCycleBtn.title = getMessage(THEME_TITLES[theme] ?? 'options_themeAuto');
  }
  profileSwitchWithoutConfirmInput.checked = globals.profileSwitchWithoutConfirm === true;
  profileSwitchConfirm.style.display = 'none';
  profileDeleteConfirm.style.display = 'none';
  profileAddDialog.style.display = 'none';
  profileRenameDialog.style.display = 'none';
  profileMessage.style.display = 'none';
  onboardingConfirm.style.display = 'none';

  debugLogEnabledInput.checked = globals.debugLogEnabled === true;
}

// Profile selector: switching profiles replaces bookmarks
let pendingProfileSwitchId = null;

function setProfileButtonsEnabled(enabled) {
  profileSelect.disabled = !enabled;
  profileAddBtn.disabled = !enabled;
  profileRenameBtn.disabled = !enabled;
  profileDeleteBtn.disabled = !enabled;
}

async function doProfileSwitch(targetId) {
  const activeId = await getActiveProfileId();
  if (targetId === activeId) return;
  profileSwitchConfirm.style.display = 'none';
  pendingProfileSwitchId = null;

  try {
    setProfileButtonsEnabled(false);
    profileSpinner.style.display = 'inline-block';
    profileSwitchingMsg.textContent = getMessage('options_profileSwitching');
    profileSwitchingMsg.style.display = '';
    await switchProfile(targetId);
    await loadSettings();
  } catch (err) {
    showProfileMessage(getMessage('options_error', [err.message]));
    profileSelect.value = activeId;
  } finally {
    setProfileButtonsEnabled(true);
    profileSpinner.style.display = 'none';
    profileSwitchingMsg.style.display = 'none';
  }
}

profileSelect.addEventListener('change', async (e) => {
  const targetId = e.target.value;
  const activeId = await getActiveProfileId();
  if (targetId === activeId) return;

  const profiles = await getProfiles();
  const targetProfile = profiles[targetId];
  if (!targetProfile) return;

  if (profileSwitchWithoutConfirmInput.checked) {
    await doProfileSwitch(targetId);
    return;
  }

  pendingProfileSwitchId = targetId;
  profileSwitchConfirmText.textContent = getMessage('options_profileSwitchConfirm', [targetProfile.name || targetId]);
  profileSwitchConfirm.style.display = '';
});

profileSwitchConfirmBtn.addEventListener('click', async () => {
  if (pendingProfileSwitchId) {
    await doProfileSwitch(pendingProfileSwitchId);
  }
});

profileSwitchCancelBtn.addEventListener('click', async () => {
  const activeId = await getActiveProfileId();
  profileSelect.value = activeId;
  profileSwitchConfirm.style.display = 'none';
  pendingProfileSwitchId = null;
});

function showProfileMessage(message, isError = true) {
  profileMessage.textContent = message;
  profileMessage.style.display = '';
  profileMessage.className = 'profile-message' + (isError ? ' error' : '');
  setTimeout(() => {
    profileMessage.style.display = 'none';
  }, 5000);
}

async function hideProfileDialogs() {
  profileSwitchConfirm.style.display = 'none';
  profileDeleteConfirm.style.display = 'none';
  profileAddDialog.style.display = 'none';
  profileRenameDialog.style.display = 'none';
  pendingProfileSwitchId = null;
  const activeId = await getActiveProfileId();
  profileSelect.value = activeId;
}

profileSwitchWithoutConfirmInput.addEventListener('change', async () => {
  if (profileSwitchWithoutConfirmInput.checked) {
    profileSwitchConfirm.style.display = 'none';
    pendingProfileSwitchId = null;
    const activeId = await getActiveProfileId();
    profileSelect.value = activeId;
  }
  await saveSettings();
});

profileAddBtn.addEventListener('click', async () => {
  await hideProfileDialogs();
  profileAddNameInput.value = '';
  profileAddDialog.style.display = 'flex';
  profileAddNameInput.focus();
});

profileAddNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') profileAddConfirmBtn.click();
});

profileRenameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') profileRenameConfirmBtn.click();
});

profileAddConfirmBtn.addEventListener('click', async () => {
  const name = profileAddNameInput.value?.trim();
  if (!name) return;
  profileAddDialog.style.display = 'none';
  try {
    const newId = await addProfile(name);
    setProfileButtonsEnabled(false);
    profileSpinner.style.display = 'inline-block';
    profileSwitchingMsg.textContent = getMessage('options_profileSwitching');
    profileSwitchingMsg.style.display = '';
    try {
      await switchProfile(newId, { skipConfirm: true });
      await loadSettings();
    } finally {
      setProfileButtonsEnabled(true);
      profileSpinner.style.display = 'none';
      profileSwitchingMsg.style.display = 'none';
    }
  } catch (err) {
    setProfileButtonsEnabled(true);
    profileSpinner.style.display = 'none';
    profileSwitchingMsg.style.display = 'none';
    showProfileMessage(getMessage('options_error', [err.message]));
  }
});

profileAddCancelBtn.addEventListener('click', () => {
  profileAddDialog.style.display = 'none';
});

profileDeleteBtn.addEventListener('click', async () => {
  const selectedId = profileSelect.value;
  const profiles = await getProfiles();
  const profile = profiles[selectedId];
  if (!profile || Object.keys(profiles).length <= 1) return;

  await hideProfileDialogs();
  profileDeleteConfirmText.textContent = getMessage('options_profileDeleteConfirm', [profile.name || selectedId]);
  profileDeleteConfirm.style.display = 'flex';
  profileDeleteConfirm.dataset.pendingId = selectedId;
});

profileDeleteConfirmBtn.addEventListener('click', async () => {
  const selectedId = profileDeleteConfirm.dataset.pendingId;
  profileDeleteConfirm.style.display = 'none';
  delete profileDeleteConfirm.dataset.pendingId;
  if (!selectedId) return;

  try {
    await deleteProfile(selectedId);
    await loadSettings();
  } catch (err) {
    showProfileMessage(getMessage('options_error', [err.message]));
  }
});

profileDeleteCancelBtn.addEventListener('click', () => {
  profileDeleteConfirm.style.display = 'none';
  delete profileDeleteConfirm.dataset.pendingId;
});

profileRenameBtn.addEventListener('click', async () => {
  const selectedId = profileSelect.value;
  const profiles = await getProfiles();
  const profile = profiles[selectedId];
  if (!profile) return;

  await hideProfileDialogs();
  profileRenameInput.value = profile.name || selectedId;
  profileRenameDialog.style.display = 'flex';
  profileRenameInput.focus();
  profileRenameDialog.dataset.pendingId = selectedId;
});

profileRenameConfirmBtn.addEventListener('click', async () => {
  const selectedId = profileRenameDialog.dataset.pendingId;
  const newName = profileRenameInput.value?.trim();
  profileRenameDialog.style.display = 'none';
  delete profileRenameDialog.dataset.pendingId;
  if (!selectedId || !newName) return;

  try {
    await saveProfile(selectedId, { name: newName });
    await loadSettings();
    showSaveResult(getMessage('options_settingsSaved'), 'success');
  } catch (err) {
    showProfileMessage(getMessage('options_error', [err.message]));
  }
});

profileRenameCancelBtn.addEventListener('click', () => {
  profileRenameDialog.style.display = 'none';
  delete profileRenameDialog.dataset.pendingId;
});

syncProfileSelect.addEventListener('change', () => {
  const isCustom = syncProfileSelect.value === 'custom';
  syncCustomFields.style.display = isCustom ? 'block' : 'none';
  if (!isCustom) {
    const preset = SYNC_PRESETS[syncProfileSelect.value];
    if (preset) {
      syncIntervalInput.value = preset.interval;
      debounceDelayInput.value = Math.round(preset.debounceMs / 1000);
    }
  }
  saveSettings();
});

if (themeCycleBtn) {
  themeCycleBtn.addEventListener('click', async () => {
    const current = await chrome.storage.sync.get({ [STORAGE_KEYS.THEME]: 'auto' }).then(r => r[STORAGE_KEYS.THEME] || 'auto');
    const idx = THEME_CYCLE.indexOf(current);
    const nextTheme = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    await chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: nextTheme });
    applyTheme(nextTheme);
    themeCycleBtn.textContent = THEME_ICONS[nextTheme];
    themeCycleBtn.title = getMessage(THEME_TITLES[nextTheme]);
  });
}

languageSelect.addEventListener('change', async () => {
  const newLang = languageSelect.value;
  await chrome.storage.sync.set({ [STORAGE_KEYS.LANGUAGE]: newLang });
  await reloadI18n();
  populateLanguageDropdown();
  languageSelect.value = newLang;
  applyI18n();
  document.title = `GitSyncMarks – ${getMessage('options_subtitle')}`;
});

// ==============================
// Settings Tab: Token Validation
// ==============================

toggleTokenBtn.addEventListener('click', () => {
  tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
});

// GitHub Repos: toggle options visibility + auto-save on change
githubReposEnabledInput.addEventListener('change', () => {
  githubReposOptions.style.display = githubReposEnabledInput.checked ? 'block' : 'none';
  saveSettings();
});
githubReposParentSelect.addEventListener('change', saveSettings);

// GitHub Repos: refresh button (saves first so current form state is persisted)
githubReposRefreshBtn.addEventListener('click', async () => {
  await saveSettings();
  const token = tokenInput.value.trim();
  const activeId = await getActiveProfileId();
  const profiles = await getProfiles();
  const profile = profiles[activeId];
  if (!token) {
    githubReposResult.textContent = getMessage('options_pleaseEnterToken');
    githubReposResult.className = 'validation-result error';
    return;
  }
  try {
    githubReposRefreshBtn.disabled = true;
    githubReposSpinner.style.display = 'inline-block';
    githubReposResult.textContent = '';
    const parent = githubReposParentSelect.value || 'other';
    const result = await updateGitHubReposFolder(token, parent, profile?.githubReposUsername || '', async (username) => {
      await saveProfile(activeId, { githubReposUsername: username });
    });
    githubReposResult.textContent = getMessage('options_githubReposRefreshSuccess', [result.count.toString(), result.username || '']);
    githubReposResult.className = 'validation-result success';
    await loadSettings();
  } catch (err) {
    githubReposResult.textContent = getMessage('options_error', [err.message]);
    githubReposResult.className = 'validation-result error';
  } finally {
    githubReposRefreshBtn.disabled = false;
    githubReposSpinner.style.display = 'none';
  }
});

function showOnboardingConfirm(message, yesButtonLabel) {
  return new Promise((resolve) => {
    onboardingConfirmText.textContent = message;
    onboardingConfirmYesBtn.textContent = yesButtonLabel;
    onboardingConfirm.style.display = 'flex';
    validationSpinner.style.display = 'none';

    const handleYes = () => {
      onboardingConfirmYesBtn.removeEventListener('click', handleYes);
      onboardingConfirmNoBtn.removeEventListener('click', handleNo);
      resolve(true);
    };
    const handleNo = () => {
      onboardingConfirmYesBtn.removeEventListener('click', handleYes);
      onboardingConfirmNoBtn.removeEventListener('click', handleNo);
      resolve(false);
    };
    onboardingConfirmYesBtn.addEventListener('click', handleYes);
    onboardingConfirmNoBtn.addEventListener('click', handleNo);
  });
}

function hideOnboardingConfirm() {
  onboardingConfirm.style.display = 'none';
}

validateBtn.addEventListener('click', async () => {
  await saveSettings();
  const token = tokenInput.value.trim();
  const owner = ownerInput.value.trim();
  const repo = repoInput.value.trim();
  const branch = branchInput.value.trim() || 'main';

  if (!token) {
    showValidation(getMessage('options_pleaseEnterToken'), 'error');
    return;
  }

  showValidation(getMessage('options_checking'), 'loading');

  try {
    const api = new GitHubAPI(token, owner, repo, branch);

    const tokenResult = await api.validateToken();
    if (!tokenResult.valid) {
      showValidation(getMessage('options_invalidToken'), 'error');
      return;
    }

    if (!tokenResult.scopes.includes('repo')) {
      showValidation(getMessage('options_tokenValidMissingScope', [tokenResult.username]), 'error');
      return;
    }

    if (owner && repo) {
      const repoExists = await api.checkRepo();
      if (!repoExists) {
        showValidation(getMessage('options_tokenValidRepoNotFound', [tokenResult.username, `${owner}/${repo}`]), 'error');
        return;
      }
      const basePath = filepathInput.value.trim() || 'bookmarks';
      const pathCheck = await checkPathSetup(api, basePath);
      if (pathCheck.status === 'unreachable' || pathCheck.status === 'empty') {
        const confirmed = await showOnboardingConfirm(
          getMessage('options_onboardingCreateFolder', [basePath]),
          getMessage('options_onboardingCreateBtn')
        );
        hideOnboardingConfirm();
        if (confirmed) {
          try {
            await initializeRemoteFolder(api, basePath);
            showValidation(getMessage('options_onboardingCreateSuccess'), 'success');
          } catch (createErr) {
            showValidation(getMessage('options_error', [createErr.message]), 'error');
          }
        } else {
          showValidation(getMessage('options_connectionOk', [tokenResult.username, `${owner}/${repo}`]), 'success');
        }
        return;
      }
      if (pathCheck.status === 'hasBookmarks') {
        const confirmed = await showOnboardingConfirm(
          getMessage('options_onboardingPullNow'),
          getMessage('options_onboardingPullBtn')
        );
        hideOnboardingConfirm();
        if (confirmed) {
          try {
            await saveSettings();
            await chrome.runtime.sendMessage({ action: 'pull' });
            showValidation(getMessage('options_onboardingPullSuccess'), 'success');
          } catch (pullErr) {
            showValidation(getMessage('options_error', [pullErr.message]), 'error');
          }
        } else {
          showValidation(getMessage('options_connectionOk', [tokenResult.username, `${owner}/${repo}`]), 'success');
        }
        return;
      }
      showValidation(getMessage('options_connectionOk', [tokenResult.username, `${owner}/${repo}`]), 'success');
    } else {
      showValidation(getMessage('options_tokenValidSpecifyRepo', [tokenResult.username]), 'success');
    }
  } catch (err) {
    showValidation(getMessage('options_error', [err.message]), 'error');
  }
});

function showValidation(message, type) {
  validationResult.textContent = message;
  validationResult.className = `validation-result ${type}`;
  validationSpinner.style.display = type === 'loading' ? 'inline-block' : 'none';
}

// ==============================
// Save Settings (shared by GitHub and Sync tabs)
// ==============================

async function saveSettings() {
  try {
    const activeId = await getActiveProfileId();
    const profiles = await getProfiles();
    const currentProfile = profiles[activeId];
    const oldPath = (currentProfile?.filePath || 'bookmarks').replace(/\/+$/, '');
    const newPath = (filepathInput.value.trim() || 'bookmarks').replace(/\/+$/, '');
    const pathChanged = newPath !== oldPath;

    // Save profile-specific GitHub settings
    await saveProfile(activeId, {
      owner: ownerInput.value.trim(),
      repo: repoInput.value.trim(),
      branch: branchInput.value.trim() || 'main',
      filePath: filepathInput.value.trim() || 'bookmarks',
      token: tokenInput.value.trim(),
      githubReposEnabled: githubReposEnabledInput.checked,
      githubReposParent: githubReposParentSelect.value,
    });

    // Save global sync settings
    await chrome.storage.sync.set({
      [STORAGE_KEYS.AUTO_SYNC]: autoSyncInput.checked,
      [STORAGE_KEYS.SYNC_INTERVAL]: getEffectiveSyncInterval(),
      [STORAGE_KEYS.DEBOUNCE_DELAY]: getEffectiveDebounceMs(),
      [STORAGE_KEYS.SYNC_PROFILE]: syncProfileSelect.value,
      [STORAGE_KEYS.SYNC_ON_STARTUP]: syncOnStartupInput.checked,
      [STORAGE_KEYS.SYNC_ON_FOCUS]: syncOnFocusInput.checked,
      [STORAGE_KEYS.NOTIFICATIONS_MODE]: notificationsModeSelect.value,
      [STORAGE_KEYS.GENERATE_README_MD]: generateReadmeMdSelect.value,
      [STORAGE_KEYS.GENERATE_BOOKMARKS_HTML]: generateBookmarksHtmlSelect.value,
      [STORAGE_KEYS.GENERATE_FEED_XML]: generateFeedXmlSelect.value,
      [STORAGE_KEYS.GENERATE_DASHY_YML]: generateDashyYmlSelect.value,
      [STORAGE_KEYS.SYNC_SETTINGS_TO_GIT]: syncSettingsToGitInput.checked,
      [STORAGE_KEYS.SETTINGS_SYNC_MODE]: settingsSyncModeSelect.value,
      [STORAGE_KEYS.SETTINGS_SYNC_GLOBAL_WRITE_ENABLED]: settingsSyncGlobalWriteEnabledInput.checked,
      [STORAGE_KEYS.LANGUAGE]: languageSelect.value,
      [STORAGE_KEYS.PROFILE_SWITCH_WITHOUT_CONFIRM]: profileSwitchWithoutConfirmInput.checked,
    });

    try {
      await chrome.runtime.sendMessage({ action: 'settingsChanged' });
    } catch (msgErr) {
      // Background may be terminated (e.g. Firefox Android). Settings are saved;
      // alarm will update when background runs again (next sync, popup open).
    }

    const successMsg = pathChanged
      ? `${getMessage('options_settingsSaved')} ${getMessage('options_filePathChangeHint')}`
      : getMessage('options_settingsSaved');
    showSaveResult(successMsg, 'success');

    const isConfigured = !!(tokenInput.value.trim() && ownerInput.value.trim() && repoInput.value.trim());
    githubReposCard.style.display = isConfigured ? 'block' : 'none';

    setTimeout(() => {
      saveGitHubResult.textContent = '';
      saveSyncResult.textContent = '';
    }, pathChanged ? 8000 : 3000);
  } catch (err) {
    showSaveResult(getMessage('options_errorSaving', [err.message]), 'error');
  }
}

function showSaveResult(message, type) {
  saveGitHubResult.textContent = message;
  saveGitHubResult.className = `save-result ${type}`;
  saveSyncResult.textContent = message;
  saveSyncResult.className = `save-result ${type}`;
}

// GitHub tab: auto-save on change (no Save button)
tokenInput.addEventListener('change', saveSettings);
ownerInput.addEventListener('change', saveSettings);
repoInput.addEventListener('change', saveSettings);
branchInput.addEventListener('change', saveSettings);
filepathInput.addEventListener('change', saveSettings);
profileSwitchWithoutConfirmInput.addEventListener('change', saveSettings);

// Folder browser
let _folderBrowserCurrentPath = '';

function closeFolderBrowser() {
  folderBrowser.classList.add('hidden');
}

async function loadFolderBrowserContents(path) {
  folderBrowserList.innerHTML = '';
  folderBrowserEmpty.classList.add('hidden');
  folderBrowserLoading.classList.remove('hidden');
  _folderBrowserCurrentPath = path;
  folderBrowserPath.textContent = '/' + (path || '');
  btnFolderUp.disabled = !path;

  try {
    const token = tokenInput.value.trim();
    const owner = ownerInput.value.trim();
    const repo = repoInput.value.trim();
    const branch = branchInput.value.trim() || 'main';
    const api = new GitHubAPI(token, owner, repo, branch);
    const dirs = await api.listContents(path);

    folderBrowserLoading.classList.add('hidden');

    if (dirs.length === 0) {
      folderBrowserEmpty.classList.remove('hidden');
      return;
    }

    for (const dir of dirs) {
      const li = document.createElement('li');

      const icon = document.createElement('span');
      icon.className = 'folder-icon';
      icon.textContent = '\uD83D\uDCC1';
      li.appendChild(icon);

      const name = document.createElement('span');
      name.className = 'folder-name';
      name.textContent = dir.name;
      name.addEventListener('click', () => loadFolderBrowserContents(dir.path));
      li.appendChild(name);

      const selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.className = 'folder-select-btn';
      selectBtn.textContent = getMessage('options_browseFolderSelect') || 'Select';
      selectBtn.addEventListener('click', () => {
        filepathInput.value = dir.path;
        closeFolderBrowser();
        saveSettings();
      });
      li.appendChild(selectBtn);

      folderBrowserList.appendChild(li);
    }
  } catch (err) {
    folderBrowserLoading.classList.add('hidden');
    folderBrowserEmpty.textContent = err.message || 'Error';
    folderBrowserEmpty.classList.remove('hidden');
  }
}

btnBrowseFolder.addEventListener('click', () => {
  if (!folderBrowser.classList.contains('hidden')) {
    closeFolderBrowser();
    return;
  }

  const token = tokenInput.value.trim();
  const owner = ownerInput.value.trim();
  const repo = repoInput.value.trim();
  if (!token || !owner || !repo) {
    showValidation(getMessage('options_browseFolderNotConfigured') || 'Please configure token, owner, and repo first', 'error');
    return;
  }

  folderBrowser.classList.remove('hidden');
  loadFolderBrowserContents('');
});

btnFolderUp.addEventListener('click', () => {
  const parts = _folderBrowserCurrentPath.split('/').filter(Boolean);
  parts.pop();
  loadFolderBrowserContents(parts.join('/'));
});

document.addEventListener('click', (e) => {
  if (!folderBrowser.classList.contains('hidden') &&
      !folderBrowser.contains(e.target) &&
      e.target !== btnBrowseFolder &&
      !btnBrowseFolder.contains(e.target)) {
    closeFolderBrowser();
  }
});

// Debug log: toggle saves immediately; export downloads log file
debugLogEnabledInput.addEventListener('change', async () => {
  await setDebugLogEnabled(debugLogEnabledInput.checked);
});
debugLogExportBtn.addEventListener('click', async () => {
  let content = '';
  try {
    const res = await chrome.runtime.sendMessage({ action: 'getDebugLog' });
    content = res?.content ?? '';
  } catch {
    content = '';
  }
  if (!content) {
    debugLogResult.textContent = getMessage('options_debugLogExportEmpty');
    debugLogResult.className = 'validation-result';
    setTimeout(() => { debugLogResult.textContent = ''; }, 3000);
    return;
  }
  const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  downloadFile(`gitsyncmarks-debug-${date}.txt`, content, 'text/plain;charset=utf-8');
  debugLogResult.textContent = getMessage('options_exportSuccess');
  debugLogResult.className = 'validation-result success';
  setTimeout(() => { debugLogResult.textContent = ''; }, 3000);
});

// Automation tab: copy JSON or gh command to clipboard
const automationCopyJsonBtn = document.getElementById('automation-copy-json-btn');
const automationCopyGhBtn = document.getElementById('automation-copy-gh-btn');
const automationJsonBlock = document.getElementById('automation-json-block');
const automationGhBlock = document.getElementById('automation-gh-block');

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

if (automationCopyJsonBtn) {
  automationCopyJsonBtn.addEventListener('click', () => copyAutomationToClipboard(automationJsonBlock, automationCopyJsonBtn));
}
if (automationCopyGhBtn) {
  automationCopyGhBtn.addEventListener('click', () => copyAutomationToClipboard(automationGhBlock, automationCopyGhBtn));
}

// Generate files: debounced sync when toggling ON to avoid conflicts when enabling both quickly
let generateFilesSyncTimer = null;
const GENERATE_FILES_DEBOUNCE_MS = 2000;
const GENERATE_FILES_RETRY_DELAY_MS = 2500;

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

function updateGenerateFilesBtn() {
  const anyEnabled = generateReadmeMdSelect.value !== 'off' ||
                     generateBookmarksHtmlSelect.value !== 'off' ||
                     generateFeedXmlSelect.value !== 'off' ||
                     generateDashyYmlSelect.value !== 'off';
  generateFilesBtn.style.display = anyEnabled ? '' : 'none';
}

async function onGenerateFilesToggleChange() {
  updateGenerateFilesBtn();
  await saveSettings();
  if (generateReadmeMdSelect.value === 'auto' ||
      generateBookmarksHtmlSelect.value === 'auto' ||
      generateFeedXmlSelect.value === 'auto' ||
      generateDashyYmlSelect.value === 'auto') {
    scheduleGenerateFilesSync();
  }
}

generateFilesBtn.addEventListener('click', async () => {
  generateFilesBtn.disabled = true;
  try {
    await chrome.runtime.sendMessage({ action: 'generateFilesNow' });
  } catch (e) { /* Background may be terminated */ }
  generateFilesBtn.disabled = false;
});

// Sync tab: auto-save on change (no Save button)
autoSyncInput.addEventListener('change', saveSettings);
syncOnStartupInput.addEventListener('change', saveSettings);
syncOnFocusInput.addEventListener('change', saveSettings);
notificationsModeSelect.addEventListener('change', saveSettings);
syncIntervalInput.addEventListener('change', saveSettings);
debounceDelayInput.addEventListener('change', saveSettings);
generateReadmeMdSelect.addEventListener('change', onGenerateFilesToggleChange);
generateBookmarksHtmlSelect.addEventListener('change', onGenerateFilesToggleChange);
generateFeedXmlSelect.addEventListener('change', onGenerateFilesToggleChange);
generateDashyYmlSelect.addEventListener('change', onGenerateFilesToggleChange);

// Settings sync to Git
syncSettingsToGitInput.addEventListener('change', async () => {
  updateSettingsSyncVisibility();
  await saveSettings();
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
  updateSettingsSyncVisibility();
  await saveSettings();
});

settingsSyncGlobalWriteEnabledInput.addEventListener('change', saveSettings);

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

function selectedSettingsProfile() {
  const filename = settingsSyncDeviceList.value;
  return settingsProfiles.find((p) => p.filename === filename) || null;
}

function renderSettingsProfiles(configs) {
  settingsProfiles = Array.isArray(configs) ? configs : [];
  settingsSyncDeviceList.innerHTML = '';
  if (settingsProfiles.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = getMessage('options_settingsSyncImportEmpty');
    settingsSyncDeviceList.appendChild(opt);
    settingsSyncDeviceList.disabled = true;
    settingsSyncImportBtn.disabled = true;
    settingsSyncPushSelectedBtn.disabled = true;
    return;
  }
  for (const cfg of settingsProfiles) {
    const opt = document.createElement('option');
    opt.value = cfg.filename;
    const datePart = cfg.updatedAt ? ` · ${new Date(cfg.updatedAt).toLocaleString()}` : '';
    opt.textContent = `${cfg.name || cfg.filename} (${cfg.filename})${datePart}`;
    settingsSyncDeviceList.appendChild(opt);
  }
  settingsSyncDeviceList.disabled = false;
  settingsSyncImportBtn.disabled = false;
  settingsSyncPushSelectedBtn.disabled = false;
}

async function refreshSettingsProfiles() {
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

settingsSyncLoadBtn.addEventListener('click', refreshSettingsProfiles);

settingsSyncImportBtn.addEventListener('click', async () => {
  const selected = selectedSettingsProfile();
  const filename = selected?.filename || settingsSyncDeviceList.value;
  if (!filename) return;
  if (filename === 'settings.enc') {
    const confirmed = await showOnboardingConfirm(
      getMessage('options_settingsSyncImportGlobalConfirm'),
      getMessage('options_settingsSyncImportGlobalConfirmBtn')
    );
    hideOnboardingConfirm();
    if (!confirmed) return;
  }
  settingsSyncImportBtn.disabled = true;
  settingsSyncImportResult.textContent = '';
  try {
    const password = await showPasswordDialog('options_settingsRegistryActionPasswordPrompt', 'options_settingsRegistryImportApplyBtn');
    if (!password) return;
    const resp = await chrome.runtime.sendMessage({ action: 'importSettingsProfile', filename, password });
    if (resp.success) {
      settingsSyncImportResult.textContent = getMessage('options_settingsRegistryImportSuccess');
      settingsSyncImportResult.className = 'validation-result success';
      await loadSettings();
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
  const selected = selectedSettingsProfile();
  if (!selected?.filename) return;
  settingsSyncPushSelectedBtn.disabled = true;
  settingsSyncImportResult.textContent = '';
  try {
    const password = await showPasswordDialog('options_settingsRegistryActionPasswordPrompt', 'options_settingsRegistrySyncSelectedBtn');
    if (!password) return;
    const resp = await chrome.runtime.sendMessage({
      action: 'syncSettingsToProfile',
      filename: selected.filename,
      name: selected.name || '',
      password,
    });
    if (resp?.success) {
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
  const name = settingsSyncNewNameInput.value.trim();
  if (!name) {
    settingsSyncImportResult.textContent = getMessage('options_settingsRegistryCreateNameRequired');
    settingsSyncImportResult.className = 'validation-result error';
    return;
  }
  settingsSyncCreateBtn.disabled = true;
  settingsSyncImportResult.textContent = '';
  try {
    const password = await showPasswordDialog('options_settingsRegistryActionPasswordPrompt', 'options_settingsRegistryCreateBtn');
    if (!password) return;
    const resp = await chrome.runtime.sendMessage({ action: 'createSettingsProfile', name, password });
    if (resp?.success) {
      settingsSyncImportResult.textContent = getMessage('options_settingsRegistryCreateSuccess');
      settingsSyncImportResult.className = 'validation-result success';
      settingsSyncNewNameInput.value = '';
      await refreshSettingsProfiles();
      reloadAfterSettingsImport(500);
    } else {
      settingsSyncImportResult.textContent = resp?.message || 'Error';
      settingsSyncImportResult.className = 'validation-result error';
    }
  } catch (e) {
    settingsSyncImportResult.textContent = e.message || 'Error';
    settingsSyncImportResult.className = 'validation-result error';
  }
  settingsSyncCreateBtn.disabled = false;
});

// ==============================
// Export / Import (compact dropdown UI)
// ==============================

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

function showPasswordDialog(promptKey, confirmKey) {
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

async function confirmReloadAfterImport() {
  const shouldReload = await showOnboardingConfirm(
    getMessage('options_settingsSyncImportReloadConfirm'),
    getMessage('options_settingsSyncImportReloadConfirmBtn')
  );
  hideOnboardingConfirm();
  if (shouldReload) reloadAfterSettingsImport();
}

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
      await loadSettings();
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

// ==============================
// Helpers
// ==============================

/**
 * Trigger a file download in the browser.
 */
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Show a result message next to an import/export button.
 */
function showResult(el, message, type) {
  el.textContent = message;
  el.className = `ie-result ${type}`;
  setTimeout(() => { el.textContent = ''; el.className = 'ie-result'; }, 4000);
}

// replaceLocalBookmarks is imported from lib/sync-engine.js (single source of truth)
