/**
 * Options Page Logic – Entry Point
 * Orchestrates sub-modules and hosts shared functions (loadSettings, saveSettings).
 */

import { DISPLAY_VERSION } from './lib/display-version.js';
import { GitHubAPI } from './lib/github-api.js';
import { initI18n, applyI18n, getMessage, reloadI18n, SUPPORTED_LANGUAGES } from './lib/i18n.js';
import { initTheme, applyTheme } from './lib/theme.js';
import { SYNC_PRESETS } from './lib/sync-engine.js';
import { updateGitHubReposFolder } from './lib/github-repos.js';
import { LinkwardenAPI } from './lib/linkwarden-api.js';
import { encryptToken, decryptToken, migrateTokenIfNeeded } from './lib/crypto.js';
import {
  getProfiles,
  getActiveProfileId,
  getProfileSettings,
  saveProfile,
  migrateToProfiles,
  MAX_PROFILES,
} from './lib/profile-manager.js';

import { initWizard, wizardState, startOnboardingWizard, renderOnboardingWizardStep, hideConnectionPathInitAction, showOnboardingConfirm, hideOnboardingConfirm, showValidation } from './options/wizard.js';
import { initProfiles } from './options/profiles.js';
import { initLinkwarden, renderLwOptionsTagChips, renderLwOptionsTagCloud, setLwOptionsSelectedTags, setLwOptionsAllTags, getLwOptionsSelectedTags } from './options/linkwarden.js';
import { initHistory } from './options/history.js';
import { initContextMenuConfig, renderContextMenuConfig, DEFAULT_CONTEXT_MENU_ITEMS } from './options/context-menu-config.js';
import { initSettings, downloadFile, updateGenerateFilesBtn, updateSettingsSyncVisibility, updateSettingsSyncButtonsState, renderSettingsProfiles, refreshSettingsProfiles } from './options/settings.js';
import { mountWhatsNewIfPending } from './lib/whats-new-ui.js';

const browserObj = typeof browser !== 'undefined' ? browser : chrome;

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
  NOTIFICATIONS_ENABLED: 'notificationsEnabled',
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
  ONBOARDING_WIZARD_COMPLETED: 'onboardingWizardCompleted',
  ONBOARDING_WIZARD_DISMISSED: 'onboardingWizardDismissed',
  CONTEXT_OPEN_ALL_THRESHOLD: 'contextOpenAllThreshold',
  CONTEXT_MENU_ITEMS: 'contextMenuItems',
  CONTEXT_MENU_SUBMENUS: 'contextMenuSubmenus',
  LINKWARDEN_ENABLED: 'linkwardenEnabled',
  LINKWARDEN_URL: 'linkwardenUrl',
  LINKWARDEN_TOKEN: 'linkwardenToken',
  LINKWARDEN_DEFAULT_COLLECTION: 'linkwardenDefaultCollection',
  LINKWARDEN_DEFAULT_TAGS: 'linkwardenDefaultTags',
  LINKWARDEN_DEFAULT_SCREENSHOT: 'linkwardenDefaultScreenshot',
  LINKWARDEN_SYNC_ENABLED: 'linkwardenSyncEnabled',
  LINKWARDEN_SYNC_PARENT: 'linkwardenSyncParent',
  LINKWARDEN_SYNC_PUSH_TO_GIT: 'linkwardenSyncPushToGit',
};

const LOCAL_STORAGE_KEYS = {
  SETTINGS_SYNC_CLIENT_NAME: 'settingsSyncClientName',
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
const profileSwitchWithoutConfirmInput = document.getElementById('profile-switch-without-confirm');
const profileSwitchConfirm = document.getElementById('profile-switch-confirm');
const profileDeleteConfirm = document.getElementById('profile-delete-confirm');
const profileAddDialog = document.getElementById('profile-add-dialog');
const profileRenameDialog = document.getElementById('profile-rename-dialog');
const profileMessage = document.getElementById('profile-message');
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
const syncSettingsToGitInput = document.getElementById('sync-settings-to-git');
const settingsSyncClientNameInput = document.getElementById('settings-sync-client-name');
const notificationsModeSelect = document.getElementById('notifications-mode');
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
const onboardingWizardStartBtn = document.getElementById('onboarding-wizard-start-btn');
const onboardingConfirm = document.getElementById('onboarding-confirm');
const resetConfirmDialog = document.getElementById('reset-confirm-dialog');
const resetBtn = document.getElementById('btn-reset-extension');
const quickFolderSelect1 = document.getElementById('quick-folder-1');
const quickFolderSelect2 = document.getElementById('quick-folder-2');
const quickFolderSelect3 = document.getElementById('quick-folder-3');
const quickFoldersRefreshBtn = document.getElementById('quick-folders-refresh-btn');
const quickFoldersResult = document.getElementById('quick-folders-result');
const openAllThresholdInput = document.getElementById('open-all-threshold');

// ---- DOM elements: Linkwarden Tab ----
const linkwardenEnabledInput = document.getElementById('linkwarden-enabled');
const linkwardenSubtabBar = document.getElementById('linkwarden-subtab-bar');
const linkwardenSettingsGroup = document.getElementById('linkwarden-settings');
const linkwardenUrlInput = document.getElementById('linkwarden-url');
const linkwardenTokenInput = document.getElementById('linkwarden-token');
const linkwardenDefaultCollectionSelect = document.getElementById('linkwarden-default-collection');
const linkwardenDefaultScreenshotInput = document.getElementById('linkwarden-default-screenshot');
const linkwardenSyncEnabledInput = document.getElementById('linkwarden-sync-enabled');
const linkwardenSyncOptions = document.getElementById('linkwarden-sync-options');
const linkwardenSyncParentSelect = document.getElementById('linkwarden-sync-parent');
const linkwardenSyncPushToGitInput = document.getElementById('linkwarden-sync-push-to-git');
const linkwardenSyncEnabledGroup = document.getElementById('linkwarden-sync-enabled-group');
const linkwardenSyncDisabledMsg = document.getElementById('linkwarden-sync-disabled-msg');

// ==============================
// Tab Navigation
// ==============================

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    const tabId = `tab-${btn.dataset.tab}`;
    const panel = document.getElementById(tabId);
    if (panel) panel.classList.add('active');
  });
});

document.querySelectorAll('.sub-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const subtab = btn.dataset.subtab;
    if (!subtab) return;
    const parent = btn.closest('.tab-content');
    if (!parent) return;
    parent.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    parent.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    const target = document.getElementById(`subtab-${subtab}`);
    if (target) target.classList.add('active');
  });
});

// ==============================
// Initialization
// ==============================

/**
 * Show "What's new" after update once onboarding wizard is not visible (avoid stacking modals).
 */
async function scheduleWhatsNewWhenWizardHidden() {
  const wiz = document.getElementById('onboarding-wizard-screen');
  const manifestVersion = chrome.runtime.getManifest().version;

  const tryMount = async () => {
    await mountWhatsNewIfPending(document.body, { getMessage, manifestVersion });
  };

  const wizardHidden = () => {
    if (!wiz) return true;
    return getComputedStyle(wiz).display === 'none';
  };

  if (wizardHidden()) {
    await tryMount();
    return;
  }

  const obs = new MutationObserver(() => {
    if (wizardHidden()) {
      obs.disconnect();
      tryMount().catch(() => {});
    }
  });
  obs.observe(wiz, { attributes: true, attributeFilter: ['style'] });
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initTheme();
    await initI18n();
    populateLanguageDropdown();
    applyI18n();
    document.title = `GitSyncMarks – ${getMessage('options_subtitle')}`;

    const params = new URLSearchParams(window.location.search);
    if (params.get('screenshot') === 'wizard') {
      const stepParam = params.get('step');
      const stepIndex = stepParam !== null ? Math.max(0, Math.min(7, parseInt(stepParam, 10) || 0)) : 0;
      wizardState.active = true;
      wizardState.stepIndex = stepIndex;
      document.getElementById('onboarding-wizard-screen').style.display = '';
      document.getElementById('settings-shell').style.display = 'none';
      renderOnboardingWizardStep();
      return;
    }

    initWizard({ saveSettings, loadSettings });
    initProfiles({ loadSettings, saveSettings, showSaveResult });
    initLinkwarden({ saveSettings, downloadFile });
    initHistory();
    initContextMenuConfig();
    initSettings({ saveSettings, loadSettings, showOnboardingConfirm, hideOnboardingConfirm });

    await loadSettings();
    loadShortcuts();

    await scheduleWhatsNewWhenWizardHidden();

    const versionEl = document.getElementById('app-version');
    if (versionEl) {
      const version = DISPLAY_VERSION ?? chrome.runtime.getManifest().version;
      versionEl.textContent = version;
    }
  } catch (err) {
    console.error('[GitSyncMarks] options init failed:', err);
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

const resetConfirmBtn = document.getElementById('btn-reset-confirm');
const resetCancelBtn = document.getElementById('btn-reset-cancel');

resetBtn?.addEventListener('click', () => {
  resetBtn.style.display = 'none';
  resetConfirmDialog.style.display = 'flex';
});

resetCancelBtn?.addEventListener('click', () => {
  resetConfirmDialog.style.display = 'none';
  resetBtn.style.display = '';
});

resetConfirmBtn?.addEventListener('click', async () => {
  resetConfirmBtn.disabled = true;
  resetCancelBtn.disabled = true;
  try {
    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    location.reload();
  } catch (err) {
    console.error('[GitSyncMarks] Reset failed:', err);
    resetConfirmBtn.disabled = false;
    resetCancelBtn.disabled = false;
    resetConfirmDialog.style.display = 'none';
    resetBtn.style.display = '';
  }
});

// ==============================
// Settings Helpers
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

function populateLanguageDropdown() {
  const sel = languageSelect ?? document.getElementById('language-select');
  if (!sel) return;
  sel.innerHTML = '';
  const autoOption = document.createElement('option');
  autoOption.value = 'auto';
  autoOption.textContent = getMessage('options_langAuto');
  sel.appendChild(autoOption);
  for (const lang of SUPPORTED_LANGUAGES) {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = lang.name;
    sel.appendChild(option);
  }
}

// ---- Bookmark folder helpers ----

let cachedBookmarkFolders = [];

function flattenBookmarkFolders(node, parents, out) {
  if (!node || node.url) return;
  const title = node.title || '';
  const pathParts = [...parents, title].filter(Boolean);
  out.push({
    id: node.id,
    title: title || '(untitled folder)',
    pathLabel: pathParts.join(' / ') || '(untitled folder)',
  });
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    flattenBookmarkFolders(child, [...parents, title], out);
  }
}

async function loadBookmarkFolders() {
  const tree = await chrome.bookmarks.getTree();
  const folders = [];
  for (const root of tree || []) {
    const rootChildren = Array.isArray(root.children) ? root.children : [];
    for (const child of rootChildren) {
      flattenBookmarkFolders(child, [], folders);
    }
  }
  cachedBookmarkFolders = folders;
  return folders;
}

function populateQuickFolderSelect(selectEl, selectedId) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  const noneOpt = document.createElement('option');
  noneOpt.value = '';
  noneOpt.textContent = getMessage('options_contextMenuQuickFolderNone');
  selectEl.appendChild(noneOpt);
  for (const folder of cachedBookmarkFolders) {
    const opt = document.createElement('option');
    opt.value = folder.id;
    opt.textContent = folder.pathLabel;
    if (folder.id === selectedId) opt.selected = true;
    selectEl.appendChild(opt);
  }
}

// ==============================
// Load Settings
// ==============================

async function loadSettings() {
  await migrateTokenIfNeeded();
  await migrateToProfiles();

  const profiles = await getProfiles();
  const activeId = await getActiveProfileId();

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
  try {
    await loadBookmarkFolders();
  } catch (err) {
    console.warn('[GitSyncMarks] Could not load bookmark folders for quick menu settings:', err);
    cachedBookmarkFolders = [];
  }
  const quickFolderIds = Array.isArray(activeProfile?.contextQuickFolderIds)
    ? activeProfile.contextQuickFolderIds.slice(0, 3)
    : [];
  populateQuickFolderSelect(quickFolderSelect1, quickFolderIds[0] || '');
  populateQuickFolderSelect(quickFolderSelect2, quickFolderIds[1] || '');
  populateQuickFolderSelect(quickFolderSelect3, quickFolderIds[2] || '');

  const isConfigured = !!(tokenInput.value.trim() && ownerInput.value.trim() && repoInput.value.trim());
  githubReposCard.style.display = isConfigured ? 'block' : 'none';
  githubReposOptions.style.display = githubReposEnabledInput.checked ? 'block' : 'none';

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
    settingsSyncMode: 'individual',
    settingsSyncGlobalWriteEnabled: false,
    onboardingWizardCompleted: false,
    onboardingWizardDismissed: false,
    theme: 'auto',
    profileSwitchWithoutConfirm: false,
    debugLogEnabled: false,
    contextMenuOpenAllThreshold: 15,
    contextMenuItems: DEFAULT_CONTEXT_MENU_ITEMS,
    linkwardenEnabled: false,
    linkwardenUrl: '',
    linkwardenToken: '',
    linkwardenDefaultCollection: '',
    linkwardenDefaultTags: '',
    linkwardenDefaultScreenshot: false,
    linkwardenSyncEnabled: false,
    linkwardenSyncParent: 'other',
    linkwardenSyncPushToGit: false,
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

  // Linkwarden settings
  linkwardenEnabledInput.checked = globals.linkwardenEnabled === true;
  linkwardenUrlInput.value = globals.linkwardenUrl || '';
  linkwardenTokenInput.value = globals.linkwardenToken ? await decryptToken(globals.linkwardenToken) : '';
  linkwardenDefaultCollectionSelect.value = globals.linkwardenDefaultCollection || '';
  setLwOptionsSelectedTags((globals.linkwardenDefaultTags || '').split(',').map(t => t.trim()).filter(Boolean));
  renderLwOptionsTagChips();
  renderLwOptionsTagCloud();
  linkwardenDefaultScreenshotInput.checked = globals.linkwardenDefaultScreenshot === true;
  linkwardenSyncEnabledInput.checked = globals.linkwardenSyncEnabled === true;
  linkwardenSyncOptions.style.display = linkwardenSyncEnabledInput.checked ? 'block' : 'none';
  linkwardenSyncParentSelect.value = globals.linkwardenSyncParent || 'other';
  linkwardenSyncPushToGitInput.checked = globals.linkwardenSyncPushToGit === true;
  linkwardenSettingsGroup.style.display = linkwardenEnabledInput.checked ? 'block' : 'none';
  linkwardenSubtabBar.style.display = linkwardenEnabledInput.checked ? 'flex' : 'none';
  linkwardenSyncEnabledGroup.style.display = linkwardenEnabledInput.checked ? 'block' : 'none';
  linkwardenSyncDisabledMsg.style.display = linkwardenEnabledInput.checked ? 'none' : 'block';

  if (linkwardenEnabledInput.checked && linkwardenUrlInput.value && linkwardenTokenInput.value) {
    let origin;
    try {
      origin = new URL(linkwardenUrlInput.value).origin + '/*';
      chrome.permissions.contains({ origins: [origin] }, async (hasPermission) => {
        if (hasPermission) {
          try {
            const api = new LinkwardenAPI(linkwardenUrlInput.value, linkwardenTokenInput.value);
            const collections = await api.getCollections();
            if (collections && collections.response && Array.isArray(collections.response)) {
              const currentSelection = globals.linkwardenDefaultCollection || '';
              linkwardenDefaultCollectionSelect.innerHTML = '<option value="" data-i18n="options_none">None</option>';
              applyI18n();
              collections.response.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                if (c.id.toString() === currentSelection) opt.selected = true;
                linkwardenDefaultCollectionSelect.appendChild(opt);
              });
            }
            const tags = await api.getTags().catch(() => null);
            if (tags?.response) {
              setLwOptionsAllTags(tags.response.map(t => ({ id: t.id, name: t.name })));
              renderLwOptionsTagCloud();
            }
          } catch (e) {
            console.warn('[GitSyncMarks] Failed to auto-fetch Linkwarden collections on load', e);
          }
        }
      });
    } catch (e) {
      // Invalid URL
    }
  }

  generateBookmarksHtmlSelect.value = normalizeGenMode(globals.generateBookmarksHtml);
  generateFeedXmlSelect.value = normalizeGenMode(globals.generateFeedXml);
  generateDashyYmlSelect.value = normalizeGenMode(globals.generateDashyYml);
  syncSettingsToGitInput.checked = globals.syncSettingsToGit === true;
  updateSettingsSyncVisibility();
  if (globals.syncSettingsToGit === true) {
    await refreshSettingsProfiles();
  } else {
    renderSettingsProfiles([]);
  }
  const localPwState = await chrome.storage.local.get({ settingsSyncPassword: '' });
  if (localPwState.settingsSyncPassword) {
    const settingsSyncPasswordInput = document.getElementById('settings-sync-password');
    if (settingsSyncPasswordInput) {
      settingsSyncPasswordInput.value = '********';
      settingsSyncPasswordInput.dataset.hasPassword = 'true';
    }
  }
  const localNameState = await chrome.storage.local.get({ [LOCAL_STORAGE_KEYS.SETTINGS_SYNC_CLIENT_NAME]: '' });
  if (settingsSyncClientNameInput) {
    settingsSyncClientNameInput.value = localNameState[LOCAL_STORAGE_KEYS.SETTINGS_SYNC_CLIENT_NAME] || '';
  }
  updateSettingsSyncButtonsState();
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
  if (languageSelect) languageSelect.value = globals.language || 'auto';
  const theme = globals.theme || 'auto';
  if (themeCycleBtn) {
    themeCycleBtn.textContent = THEME_ICONS[theme] ?? 'A';
    themeCycleBtn.title = getMessage(THEME_TITLES[theme] ?? 'options_themeAuto');
  }
  profileSwitchWithoutConfirmInput.checked = globals.profileSwitchWithoutConfirm === true;
  openAllThresholdInput.value = String(
    Math.max(1, parseInt(globals.contextMenuOpenAllThreshold, 10) || 15)
  );

  const existingMenuIds = new Set(globals.contextMenuItems.map(i => i.id));
  for (const defItem of DEFAULT_CONTEXT_MENU_ITEMS) {
    if (!existingMenuIds.has(defItem.id)) {
      globals.contextMenuItems.push(defItem);
    }
  }

  renderContextMenuConfig(globals.contextMenuItems);
  profileSwitchConfirm.style.display = 'none';
  profileDeleteConfirm.style.display = 'none';
  profileAddDialog.style.display = 'none';
  profileRenameDialog.style.display = 'none';
  profileMessage.style.display = 'none';
  onboardingConfirm.style.display = 'none';
  resetConfirmDialog.style.display = 'none';
  resetBtn.style.display = '';
  hideConnectionPathInitAction();

  debugLogEnabledInput.checked = globals.debugLogEnabled === true;
  onboardingWizardStartBtn.style.display = '';
  if (!wizardState.active && globals.onboardingWizardCompleted !== true && globals.onboardingWizardDismissed !== true) {
    await startOnboardingWizard();
  }
}

// ==============================
// Save Settings
// ==============================

async function saveSettings() {
  try {
    const activeId = await getActiveProfileId();
    const profiles = await getProfiles();
    const currentProfile = profiles[activeId];
    const oldPath = (currentProfile?.filePath || 'bookmarks').replace(/\/+$/, '');
    const newPath = (filepathInput.value.trim() || 'bookmarks').replace(/\/+$/, '');
    const pathChanged = newPath !== oldPath;

    await saveProfile(activeId, {
      owner: ownerInput.value.trim(),
      repo: repoInput.value.trim(),
      branch: branchInput.value.trim() || 'main',
      filePath: filepathInput.value.trim() || 'bookmarks',
      token: tokenInput.value.trim(),
      githubReposEnabled: githubReposEnabledInput.checked,
      githubReposParent: githubReposParentSelect.value,
      contextQuickFolderIds: [
        quickFolderSelect1.value,
        quickFolderSelect2.value,
        quickFolderSelect3.value,
      ].filter(Boolean),
    });

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
      [STORAGE_KEYS.SETTINGS_SYNC_MODE]: 'individual',
      [STORAGE_KEYS.SETTINGS_SYNC_GLOBAL_WRITE_ENABLED]: false,
      [STORAGE_KEYS.LANGUAGE]: languageSelect?.value ?? 'auto',
      [STORAGE_KEYS.PROFILE_SWITCH_WITHOUT_CONFIRM]: profileSwitchWithoutConfirmInput.checked,
      [STORAGE_KEYS.CONTEXT_OPEN_ALL_THRESHOLD]: Math.max(1, parseInt(openAllThresholdInput.value, 10) || 15),
      [STORAGE_KEYS.LINKWARDEN_ENABLED]: linkwardenEnabledInput.checked,
      [STORAGE_KEYS.LINKWARDEN_URL]: linkwardenUrlInput.value.trim(),
      [STORAGE_KEYS.LINKWARDEN_TOKEN]: linkwardenTokenInput.value.trim() ? await encryptToken(linkwardenTokenInput.value.trim()) : '',
      [STORAGE_KEYS.LINKWARDEN_DEFAULT_COLLECTION]: linkwardenDefaultCollectionSelect.value,
      [STORAGE_KEYS.LINKWARDEN_DEFAULT_TAGS]: getLwOptionsSelectedTags().join(', '),
      [STORAGE_KEYS.LINKWARDEN_DEFAULT_SCREENSHOT]: linkwardenDefaultScreenshotInput.checked,
      [STORAGE_KEYS.LINKWARDEN_SYNC_ENABLED]: linkwardenSyncEnabledInput.checked,
      [STORAGE_KEYS.LINKWARDEN_SYNC_PARENT]: linkwardenSyncParentSelect.value,
      [STORAGE_KEYS.LINKWARDEN_SYNC_PUSH_TO_GIT]: linkwardenSyncPushToGitInput.checked,
    });

    try {
      await chrome.runtime.sendMessage({ action: 'settingsChanged' });
    } catch (msgErr) {
      // Background may be terminated
    }

    const successMsg = pathChanged
      ? `${getMessage('options_settingsSaved')} ${getMessage('options_filePathChangeHint')}`
      : getMessage('options_settingsSaved');
    showSaveResult(successMsg, 'success');

    const isConf = !!(tokenInput.value.trim() && ownerInput.value.trim() && repoInput.value.trim());
    githubReposCard.style.display = isConf ? 'block' : 'none';
  } catch (err) {
    showSaveResult(getMessage('options_error', [err.message]), 'error');
  }
}

function showSaveResult(message, type) {
  saveGitHubResult.textContent = message;
  saveGitHubResult.className = `save-result ${type}`;
  saveSyncResult.textContent = message;
  saveSyncResult.className = `save-result ${type}`;
}

// ==============================
// Settings Tab: Input Change Handlers
// ==============================

tokenInput?.addEventListener('change', saveSettings);
ownerInput?.addEventListener('change', saveSettings);
repoInput?.addEventListener('change', saveSettings);
branchInput?.addEventListener('change', saveSettings);
filepathInput?.addEventListener('change', saveSettings);
quickFolderSelect1?.addEventListener('change', saveSettings);
quickFolderSelect2?.addEventListener('change', saveSettings);
quickFolderSelect3?.addEventListener('change', saveSettings);
openAllThresholdInput?.addEventListener('change', saveSettings);

quickFoldersRefreshBtn?.addEventListener('click', async () => {
  try {
    const selected = [
      quickFolderSelect1.value,
      quickFolderSelect2.value,
      quickFolderSelect3.value,
    ];
    await loadBookmarkFolders();
    populateQuickFolderSelect(quickFolderSelect1, selected[0]);
    populateQuickFolderSelect(quickFolderSelect2, selected[1]);
    populateQuickFolderSelect(quickFolderSelect3, selected[2]);
    quickFoldersResult.textContent = getMessage('options_contextMenuFoldersRefreshed');
    quickFoldersResult.className = 'validation-result success';
    setTimeout(() => { quickFoldersResult.textContent = ''; }, 3000);
    await saveSettings();
  } catch (err) {
    quickFoldersResult.textContent = getMessage('options_error', [err.message]);
    quickFoldersResult.className = 'validation-result error';
  }
});

// ---- Folder browser ----

let _folderBrowserCurrentPath = '';

function closeFolderBrowser() {
  if (!folderBrowser) return;
  folderBrowser.classList.add('hidden');
}

async function loadFolderBrowserContents(path) {
  if (!folderBrowserList || !folderBrowserEmpty || !folderBrowserLoading || !folderBrowserPath || !btnFolderUp) return;
  folderBrowserList.innerHTML = '';
  folderBrowserEmpty.classList.add('hidden');
  folderBrowserLoading.classList.remove('hidden');
  _folderBrowserCurrentPath = path;
  folderBrowserPath.textContent = '/' + (path || '');
  btnFolderUp.disabled = !path;

  try {
    const token = tokenInput?.value?.trim() ?? '';
    const owner = ownerInput?.value?.trim() ?? '';
    const repo = repoInput?.value?.trim() ?? '';
    const branch = branchInput?.value?.trim() || 'main';
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
        if (filepathInput) filepathInput.value = dir.path;
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

btnBrowseFolder?.addEventListener('click', () => {
  if (!folderBrowser) return;
  if (!folderBrowser.classList.contains('hidden')) {
    closeFolderBrowser();
    return;
  }

  const token = tokenInput?.value?.trim() ?? '';
  const owner = ownerInput?.value?.trim() ?? '';
  const repo = repoInput?.value?.trim() ?? '';
  if (!token || !owner || !repo) {
    showValidation(getMessage('options_browseFolderNotConfigured') || 'Please configure token, owner, and repo first', 'error');
    return;
  }

  folderBrowser.classList.remove('hidden');
  loadFolderBrowserContents('');
});

btnFolderUp?.addEventListener('click', () => {
  const parts = _folderBrowserCurrentPath.split('/').filter(Boolean);
  parts.pop();
  loadFolderBrowserContents(parts.join('/'));
});

document.addEventListener('click', (e) => {
  if (!folderBrowser || !btnBrowseFolder) return;
  if (!folderBrowser.classList.contains('hidden') &&
    !folderBrowser.contains(e.target) &&
    e.target !== btnBrowseFolder &&
    !btnBrowseFolder.contains(e.target)) {
    closeFolderBrowser();
  }
});

// ==============================
// Settings Tab: Token & GitHub Repos
// ==============================

toggleTokenBtn?.addEventListener('click', () => {
  if (!tokenInput) return;
  tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
});

githubReposEnabledInput?.addEventListener('change', () => {
  if (githubReposOptions) githubReposOptions.style.display = githubReposEnabledInput.checked ? 'block' : 'none';
  saveSettings();
});
githubReposParentSelect?.addEventListener('change', saveSettings);

githubReposRefreshBtn?.addEventListener('click', async () => {
  await saveSettings();
  const token = tokenInput?.value?.trim() ?? '';
  const activeId = await getActiveProfileId();
  const profiles = await getProfiles();
  const currentProfile = profiles[activeId];
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
    const result = await updateGitHubReposFolder(token, parent, currentProfile?.githubReposUsername || '', async (username) => {
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

// ==============================
// Sync Tab Event Listeners
// ==============================

autoSyncInput?.addEventListener('change', saveSettings);
syncProfileSelect?.addEventListener('change', () => {
  const isCustom = syncProfileSelect.value === 'custom';
  if (syncCustomFields) syncCustomFields.style.display = isCustom ? 'block' : 'none';
  if (!isCustom) {
    const preset = SYNC_PRESETS[syncProfileSelect.value];
    if (preset) {
      if (syncIntervalInput) syncIntervalInput.value = preset.interval;
      if (debounceDelayInput) debounceDelayInput.value = Math.round(preset.debounceMs / 1000);
    }
  }
  saveSettings();
});
syncIntervalInput?.addEventListener('change', saveSettings);
debounceDelayInput?.addEventListener('change', saveSettings);
syncOnStartupInput?.addEventListener('change', saveSettings);
syncOnFocusInput?.addEventListener('change', saveSettings);
notificationsModeSelect?.addEventListener('change', saveSettings);

// ==============================
// Theme & Language
// ==============================

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

languageSelect?.addEventListener('change', async () => {
  if (!languageSelect) return;
  const newLang = languageSelect.value;
  await chrome.storage.sync.set({ [STORAGE_KEYS.LANGUAGE]: newLang });
  await reloadI18n();
  populateLanguageDropdown();
  languageSelect.value = newLang;
  applyI18n();
  document.title = `GitSyncMarks – ${getMessage('options_subtitle')}`;
  if (wizardState.active) renderOnboardingWizardStep();
});
