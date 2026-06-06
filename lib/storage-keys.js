/**
 * Single source of truth for chrome.storage key name strings.
 * `sync-settings.js` re-exports `STORAGE_KEYS` for `sync-engine` consumers.
 * Options and background may import this module (or the re-export) directly.
 */

export const STORAGE_KEYS = {
  // Core Git & sync
  GITHUB_TOKEN: 'githubToken',
  GIT_PROVIDER: 'gitProvider',
  SERVER_URL: 'serverUrl',
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
  // Local: device id (name kept in STORAGE_KEYS for get/set; physical area is `local`)
  DEVICE_ID: 'deviceId',
  // Sync / conflict metadata (typical `local` or `sync` per usage in codebase)
  LAST_SYNC_TIME: 'lastSyncTime',
  LAST_SYNC_WITH_CHANGES_TIME: 'lastSyncWithChangesTime',
  LAST_SYNC_FILES: 'lastSyncFiles',
  LAST_COMMIT_SHA: 'lastCommitSha',
  HAS_CONFLICT: 'hasConflict',
  LAST_SYNC_DATA: 'lastSyncData',
  LAST_REMOTE_SHA_JSON: 'lastRemoteShaJson',
  LAST_REMOTE_SHA_MD: 'lastRemoteShaMd',
  LAST_REMOTE_SHA_META: 'lastRemoteShaMeta',
  // UI & extension options
  LANGUAGE: 'language',
  THEME: 'theme',
  UI_DENSITY: 'uiDensity',
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
  BITWARDEN_BACKUP_PATH: 'bitwardenBackupPath',
};

/**
 * Key names for values stored only in `chrome.storage.local`.
 * Use the string with bracket access: `local[LOCAL_STORAGE_KEYS....]`
 */
export const LOCAL_STORAGE_KEYS = {
  SETTINGS_SYNC_CLIENT_NAME: 'settingsSyncClientName',
  BITWARDEN_BACKUP_PASSWORD: 'bitwardenBackupPassword',
};
