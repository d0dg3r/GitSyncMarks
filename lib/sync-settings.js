/**
 * Sync Settings & Configuration
 * Storage keys, presets, settings access, file map filtering,
 * and encrypted settings sync to Git.
 */

import { GitHubAPI } from './github-api.js';
import {
  bookmarkTreeToFileMap,
  fileMapToMarkdown,
  fileMapToNetscapeHtml,
  fileMapToRssFeed,
  fileMapToDashyYaml,
} from './bookmark-serializer.js';
import { fetchRemoteFileMap } from './remote-fetch.js';
import { encryptWithPassword, decryptWithPassword, encryptToken, decryptToken } from './crypto.js';
import { getSettingsForSync } from './profile-manager.js';
import { log as debugLog } from './debug-log.js';

// ---- Storage keys ----

export const STORAGE_KEYS = {
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
  DEVICE_ID: 'deviceId',
  LAST_SYNC_TIME: 'lastSyncTime',
  LAST_SYNC_WITH_CHANGES_TIME: 'lastSyncWithChangesTime',
  LAST_SYNC_FILES: 'lastSyncFiles',
  LAST_COMMIT_SHA: 'lastCommitSha',
  HAS_CONFLICT: 'hasConflict',
  // Legacy keys (for migration detection)
  LAST_SYNC_DATA: 'lastSyncData',
  LAST_REMOTE_SHA_JSON: 'lastRemoteShaJson',
  LAST_REMOTE_SHA_MD: 'lastRemoteShaMd',
  LAST_REMOTE_SHA_META: 'lastRemoteShaMeta',
};

// ---- Sync profile presets ----

/** Preset definitions: { interval (minutes), debounceMs } */
export const SYNC_PRESETS = {
  realtime: { interval: 1, debounceMs: 2000 },
  frequent: { interval: 5, debounceMs: 3000 },
  normal: { interval: 15, debounceMs: 5000 },
  powersave: { interval: 60, debounceMs: 10000 },
  custom: { interval: null, debounceMs: null },
};

// ---- Settings & configuration ----

export async function getDeviceId() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.DEVICE_ID);
  if (result[STORAGE_KEYS.DEVICE_ID]) return result[STORAGE_KEYS.DEVICE_ID];
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ [STORAGE_KEYS.DEVICE_ID]: id });
  return id;
}

export function normalizeGenMode(val) {
  if (val === true) return 'auto';
  if (val === false) return 'off';
  if (val === 'off' || val === 'manual' || val === 'auto') return val;
  return 'auto';
}

export async function getSettings() {
  const result = await getSettingsForSync();
  return {
    [STORAGE_KEYS.REPO_OWNER]: result.repoOwner || '',
    [STORAGE_KEYS.REPO_NAME]: result.repoName || '',
    [STORAGE_KEYS.BRANCH]: result.branch || 'main',
    [STORAGE_KEYS.FILE_PATH]: result.filePath || 'bookmarks',
    [STORAGE_KEYS.GITHUB_TOKEN]: result.githubToken || '',
    [STORAGE_KEYS.AUTO_SYNC]: result.autoSync !== false,
    [STORAGE_KEYS.SYNC_INTERVAL]: result.syncInterval ?? 15,
    [STORAGE_KEYS.SYNC_ON_STARTUP]: result.syncOnStartup || false,
    [STORAGE_KEYS.SYNC_ON_FOCUS]: result.syncOnFocus || false,
    [STORAGE_KEYS.SYNC_PROFILE]: result.syncProfile || 'normal',
    [STORAGE_KEYS.DEBOUNCE_DELAY]: result.debounceDelay ?? 5000,
    [STORAGE_KEYS.NOTIFICATIONS_MODE]: result.notificationsMode || 'all',
    profileId: result.profileId,
    githubReposEnabled: result.githubReposEnabled || false,
    githubReposParent: result.githubReposParent || 'other',
    githubReposUsername: result.githubReposUsername || '',
    generateReadmeMd: normalizeGenMode(result.generateReadmeMd),
    generateBookmarksHtml: normalizeGenMode(result.generateBookmarksHtml),
    generateFeedXml: normalizeGenMode(result.generateFeedXml),
    generateDashyYml: normalizeGenMode(result.generateDashyYml ?? 'off'),
    syncSettingsToGit: result.syncSettingsToGit || false,
    settingsSyncMode: 'individual',
    settingsSyncGlobalWriteEnabled: false,
  };
}

export function isConfigured(settings) {
  return !!(
    settings[STORAGE_KEYS.GITHUB_TOKEN] &&
    settings[STORAGE_KEYS.REPO_OWNER] &&
    settings[STORAGE_KEYS.REPO_NAME]
  );
}

export function createApi(settings) {
  return new GitHubAPI(
    settings[STORAGE_KEYS.GITHUB_TOKEN],
    settings[STORAGE_KEYS.REPO_OWNER],
    settings[STORAGE_KEYS.REPO_NAME],
    settings[STORAGE_KEYS.BRANCH]
  );
}

// ---- Local bookmark access ----

/**
 * Get current browser bookmarks as a file map.
 * @param {string} basePath
 * @returns {Promise<Object<string, string>>}
 */
export async function getLocalFileMap(basePath, settings = {}) {
  const tree = await chrome.bookmarks.getTree();
  const excludeFolders = [];
  if (settings.linkwardenSyncEnabled && !settings.linkwardenSyncPushToGit) {
    excludeFolders.push('Linkwarden');
  }
  return bookmarkTreeToFileMap(tree, basePath, { excludeFolders });
}

// ---- File map filtering ----

/**
 * Files to exclude from diff calculations.
 * These are either metadata or generated files that should not trigger sync actions.
 */
export const DIFF_IGNORE_SUFFIXES = ['/README.md', '/_index.json', '/bookmarks.html', '/feed.xml', '/dashy-conf.yml'];
export const SETTINGS_ENC_PATTERN = /\/(?:settings(?:-[^/]+)?\.enc|profiles\/[^/]+\/settings\.enc)$/;
const LEGACY_SETTINGS_FILENAME_PATTERN = /^settings(?:-[^/]+)?\.enc$/;
const PROFILE_SETTINGS_RELATIVE_PATH_PATTERN = /^profiles\/([^/]+)\/settings\.enc$/;
const SETTINGS_PROFILES_DIR = 'profiles';
const LOCAL_SETTINGS_SYNC_CLIENT_NAME_KEY = 'settingsSyncClientName';

/**
 * Filter a file map to exclude generated/meta files from diff calculations.
 * @param {Object<string, string>} files
 * @returns {Object<string, string>}
 */
export function filterForDiff(files) {
  const filtered = {};
  for (const [path, content] of Object.entries(files)) {
    if (DIFF_IGNORE_SUFFIXES.some(suffix => path.endsWith(suffix))) continue;
    if (SETTINGS_ENC_PATTERN.test(path)) continue;
    filtered[path] = content;
  }
  return filtered;
}

/**
 * Check whether a path belongs to a generated or settings-enc file
 * that should not be deleted during push/sync cleanup.
 */
export function isGeneratedOrSettingsPath(path) {
  return DIFF_IGNORE_SUFFIXES.some(suffix => path.endsWith(suffix)) ||
    SETTINGS_ENC_PATTERN.test(path);
}

/**
 * Add generated overview files to a file-changes map based on settings mode.
 * @param {Object} fileChanges - Mutable map of path → content
 * @param {Object} sourceFiles - Source file map to generate from
 * @param {string} basePath
 * @param {Object} settings
 * @param {'auto'|'off'} threshold - Only add if setting >= threshold ('auto' for push/sync, anything != 'off' for generateFilesNow)
 */
export function addGeneratedFiles(fileChanges, sourceFiles, basePath, settings, threshold = 'auto') {
  const check = threshold === 'auto' ? (v) => v === 'auto' : (v) => v !== 'off';
  if (check(settings.generateReadmeMd)) {
    fileChanges[`${basePath}/README.md`] = fileMapToMarkdown(sourceFiles, basePath);
  }
  if (check(settings.generateBookmarksHtml)) {
    fileChanges[`${basePath}/bookmarks.html`] = fileMapToNetscapeHtml(sourceFiles, basePath);
  }
  if (check(settings.generateFeedXml)) {
    fileChanges[`${basePath}/feed.xml`] = fileMapToRssFeed(sourceFiles, basePath);
  }
  if (check(settings.generateDashyYml)) {
    fileChanges[`${basePath}/dashy-conf.yml`] = fileMapToDashyYaml(sourceFiles, basePath);
  }
}

export function hasBookmarkPayloadFiles(files = {}) {
  return Object.keys(files).some((path) => {
    if (!path.endsWith('.json')) return false;
    if (path.endsWith('/_index.json')) return false;
    if (path.endsWith('/_order.json')) return false;
    if (DIFF_IGNORE_SUFFIXES.some((suffix) => path.endsWith(suffix))) return false;
    if (SETTINGS_ENC_PATTERN.test(path)) return false;
    return true;
  });
}

// ---- Encrypted settings sync ----

let suppressSettingsSyncUntil = 0;

async function getSettingsSyncPassword() {
  const local = await chrome.storage.local.get({ settingsSyncPassword: '' });
  return local.settingsSyncPassword || '';
}

async function getSettingsSyncClientName() {
  const local = await chrome.storage.local.get({ [LOCAL_SETTINGS_SYNC_CLIENT_NAME_KEY]: '' });
  return String(local[LOCAL_SETTINGS_SYNC_CLIENT_NAME_KEY] || '').trim();
}

/**
 * Build a JSON payload of all extension settings (profiles + globals).
 * Runs in the service-worker context; mirrors buildSettingsExportData() from options.js.
 */
async function buildSettingsPayload() {
  const syncSettings = await chrome.storage.sync.get(null);
  const local = await chrome.storage.local.get({ profileTokens: {}, syncState: {} });
  const profileTokens = local.profileTokens || {};
  const profiles = syncSettings.profiles || {};

  const exportedProfiles = {};
  for (const [id, p] of Object.entries(profiles)) {
    const encToken = profileTokens[id] || '';
    const plainToken = encToken ? await decryptToken(encToken) : '';
    exportedProfiles[id] = { ...p, token: plainToken };
  }

  const { profiles: _p, ...rest } = syncSettings;
  return JSON.stringify({ ...rest, profiles: exportedProfiles }, null, 2);
}

/**
 * Apply a settings JSON payload received from the repo.
 * Runs in the service-worker context; mirrors applyImportedSettings() from options.js.
 */
async function applyRemoteSettings(json) {
  const settings = JSON.parse(json);
  if (!settings.profiles || Object.keys(settings.profiles).length === 0) return;

  const profileTokens = {};
  const normalizedProfiles = {};
  for (const [id, p] of Object.entries(settings.profiles)) {
    normalizedProfiles[id] = {
      id,
      name: p.name || 'Default',
      owner: p.owner || p.repoOwner || '',
      repo: p.repo || p.repoName || '',
      branch: p.branch || 'main',
      filePath: p.filePath || 'bookmarks',
      githubReposEnabled: p.githubReposEnabled || false,
      githubReposParent: p.githubReposParent || 'other',
      githubReposUsername: p.githubReposUsername || '',
    };
    if (p.token) {
      profileTokens[id] = await encryptToken(p.token);
    }
  }

  const {
    profiles: _ignoredProfiles,
    ...rest
  } = settings;
  await chrome.storage.sync.set({
    ...rest,
    profiles: normalizedProfiles,
    activeProfileId: settings.activeProfileId || Object.keys(normalizedProfiles)[0],
    autoSync: settings.autoSync !== false,
    syncInterval: settings.syncInterval ?? 15,
    syncOnStartup: settings.syncOnStartup || false,
    syncOnFocus: settings.syncOnFocus || false,
    syncProfile: settings.syncProfile || 'normal',
    debounceDelay: settings.debounceDelay ?? 5000,
    notificationsMode: settings.notificationsMode || 'all',
    language: settings.language || 'auto',
    theme: settings.theme || 'auto',
    profileSwitchWithoutConfirm: settings.profileSwitchWithoutConfirm || false,
    generateReadmeMd: settings.generateReadmeMd ?? 'auto',
    generateBookmarksHtml: settings.generateBookmarksHtml ?? 'auto',
    generateFeedXml: settings.generateFeedXml ?? 'auto',
    generateDashyYml: settings.generateDashyYml ?? 'off',
    syncSettingsToGit: settings.syncSettingsToGit || false,
    settingsSyncMode: 'individual',
    settingsSyncGlobalWriteEnabled: false,
  });

  await chrome.storage.local.set({ profileTokens });
  suppressSettingsSyncUntil = Date.now() + 30000;
}

/**
 * Push encrypted settings to repo if the feature is enabled and a password is set.
 * @returns {{ filename: string, content: string } | null}
 */
export async function buildEncryptedSettings(settings) {
  if (!settings.syncSettingsToGit) return null;
  if (Date.now() < suppressSettingsSyncUntil) {
    await debugLog('settings-sync: suppressed (recently applied remote)');
    return null;
  }
  const password = await getSettingsSyncPassword();
  if (!password) {
    await debugLog('settings-sync: skipped push (no password set)');
    return null;
  }
  const payload = await buildSettingsPayload();
  const content = await encryptWithPassword(payload, password);
  const mode = settings.settingsSyncMode || 'individual';
  if (mode === 'global') {
    await debugLog('settings-sync: global mode temporarily disabled');
    return null;
  }
  const clientName = await getSettingsSyncClientName();
  if (!clientName) {
    await debugLog('settings-sync: skipped push (missing client name)');
    return null;
  }
  const alias = slugifySettingName(clientName);
  const filename = `${SETTINGS_PROFILES_DIR}/${alias}/settings.enc`;
  return { filename, content };
}

/**
 * Apply encrypted settings from remote if the feature is enabled.
 * In individual mode the device's own file is authoritative — remote settings are not applied.
 * @param {string} encryptedContent - Raw content of settings.enc (global)
 * @param {object} settings - Current settings object
 */
export async function applyEncryptedSettings(encryptedContent, settings) {
  if (!settings.syncSettingsToGit || !encryptedContent) return;
  if ((settings.settingsSyncMode || 'individual') === 'individual') {
    await debugLog('settings-sync: individual mode — skipping remote apply');
    return;
  }
  const password = await getSettingsSyncPassword();
  if (!password) {
    await debugLog('settings-sync: skipped pull (no password set)');
    return;
  }
  try {
    const json = await decryptWithPassword(encryptedContent, password);
    await applyRemoteSettings(json);
    await debugLog('settings-sync: applied remote settings');
  } catch (err) {
    await debugLog(`settings-sync: decrypt failed — ${err.message}`);
    console.warn('[GitSyncMarks] settings profile decrypt failed:', err.message);
  }
}

function settingsFilePath(basePath, relativePath) {
  return `${basePath}/${relativePath}`;
}

function slugifySettingName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'client';
}

function ensureUniqueAlias(baseAlias, usedAliases) {
  let alias = baseAlias;
  let i = 2;
  while (usedAliases.has(alias)) {
    alias = `${baseAlias}-${i++}`;
  }
  usedAliases.add(alias);
  return alias;
}

function parseLegacyAliasFromFilename(filename) {
  if (filename === 'settings.enc') return 'global-legacy';
  const raw = filename.replace(/^settings-/, '').replace(/\.enc$/, '');
  return slugifySettingName(raw || 'legacy');
}

function isHashLikeAlias(alias) {
  if (!alias) return false;
  return /^device-[a-f0-9]{6,}$/i.test(alias) || /^[a-f0-9]{8,}$/i.test(alias);
}

function readableClientAlias(existingAliases) {
  let i = 1;
  let candidate = `client-${i}`;
  while (existingAliases.has(candidate)) {
    i += 1;
    candidate = `client-${i}`;
  }
  existingAliases.add(candidate);
  return candidate;
}

function buildProfilesFromRemote(remoteMap, basePath) {
  const usedAliases = new Set();
  const out = [];
  for (const path of Object.keys(remoteMap || {})) {
    if (!path.startsWith(`${basePath}/`)) continue;
    const relativePath = path.slice(basePath.length + 1);
    const profileMatch = relativePath.match(PROFILE_SETTINGS_RELATIVE_PATH_PATTERN);
    if (profileMatch) {
      const alias = profileMatch[1];
      usedAliases.add(alias);
      out.push({
        id: alias,
        alias,
        name: alias,
        filename: relativePath,
        path: relativePath,
        createdAt: null,
        updatedAt: null,
        scope: 'client',
      });
      continue;
    }
    if (LEGACY_SETTINGS_FILENAME_PATTERN.test(relativePath)) {
      const legacyAlias = ensureUniqueAlias(parseLegacyAliasFromFilename(relativePath), usedAliases);
      out.push({
        id: legacyAlias,
        alias: legacyAlias,
        name: legacyAlias,
        filename: relativePath,
        path: relativePath,
        createdAt: null,
        updatedAt: null,
        scope: 'legacy',
      });
    }
  }

  out.sort((a, b) => {
    const ag = a.scope === 'client' ? 0 : 1;
    const bg = b.scope === 'client' ? 0 : 1;
    if (ag !== bg) return ag - bg;
    return String(a.alias || a.name || '').localeCompare(String(b.alias || b.name || ''));
  });
  return out;
}

function isValidSettingsReference(ref) {
  return LEGACY_SETTINGS_FILENAME_PATTERN.test(ref || '') || PROFILE_SETTINGS_RELATIVE_PATH_PATTERN.test(ref || '');
}

function toSettingsProfilePath(alias) {
  return `${SETTINGS_PROFILES_DIR}/${alias}/settings.enc`;
}

function resolveSettingsReference(ref, availableProfiles) {
  const normalized = String(ref || '').trim();
  if (!normalized) return '';
  const byPath = availableProfiles.find((p) => p.path === normalized || p.filename === normalized);
  if (byPath) return byPath.path || byPath.filename;
  const byAlias = availableProfiles.find((p) => p.alias === normalized);
  if (byAlias) return byAlias.path || byAlias.filename;
  return normalized;
}

async function resolveOwnProfileReference(basePath, availableProfiles) {
  const clientName = await getSettingsSyncClientName();
  const trimmed = String(clientName || '').trim();
  if (!trimmed) {
    return { ok: false, message: 'Client name is required', code: 'CLIENT_NAME_REQUIRED' };
  }

  const ownAlias = slugifySettingName(trimmed);
  const ownReference = toSettingsProfilePath(ownAlias);
  const exists = availableProfiles.some((p) => (p.path || p.filename) === ownReference);
  return {
    ok: true,
    clientName: trimmed,
    ownAlias,
    ownReference,
    exists,
  };
}

async function ensureSettingsProfilesMigrated(api, basePath, remoteMap) {
  const map = remoteMap || {};
  const legacyFiles = [];
  const existingAliases = new Set();

  for (const path of Object.keys(map)) {
    if (!path.startsWith(`${basePath}/`)) continue;
    const relativePath = path.slice(basePath.length + 1);
    const profileMatch = relativePath.match(PROFILE_SETTINGS_RELATIVE_PATH_PATTERN);
    if (profileMatch) {
      existingAliases.add(profileMatch[1]);
      continue;
    }
    if (LEGACY_SETTINGS_FILENAME_PATTERN.test(relativePath)) {
      legacyFiles.push(relativePath);
    }
  }

  const fileChanges = {};
  const migratedMap = { ...map };
  const usedAliases = new Set(existingAliases);
  for (const legacyFilename of legacyFiles) {
    const oldPath = settingsFilePath(basePath, legacyFilename);
    const content = map[oldPath];
    if (typeof content !== 'string' || !content) continue;
    const alias = ensureUniqueAlias(parseLegacyAliasFromFilename(legacyFilename), usedAliases);
    const profilePath = toSettingsProfilePath(alias);
    const newPath = settingsFilePath(basePath, profilePath);
    fileChanges[newPath] = content;
    fileChanges[oldPath] = null;
    migratedMap[newPath] = content;
    delete migratedMap[oldPath];
  }

  for (const path of Object.keys(map)) {
    if (!path.startsWith(`${basePath}/`)) continue;
    const relativePath = path.slice(basePath.length + 1);
    const profileMatch = relativePath.match(PROFILE_SETTINGS_RELATIVE_PATH_PATTERN);
    if (!profileMatch) continue;
    const currentAlias = profileMatch[1];
    if (!isHashLikeAlias(currentAlias)) continue;
    const content = map[path];
    if (typeof content !== 'string' || !content) continue;
    const newAlias = readableClientAlias(usedAliases);
    const newProfilePath = settingsFilePath(basePath, toSettingsProfilePath(newAlias));
    fileChanges[newProfilePath] = content;
    fileChanges[path] = null;
    migratedMap[newProfilePath] = content;
    delete migratedMap[path];
  }

  if (Object.keys(fileChanges).length === 0) {
    return { migrated: false, fileMap: map };
  }

  const deviceId = await getDeviceId();
  const msg = `Migrate settings profiles from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
  await api.atomicCommit(msg, fileChanges);
  await debugLog(`settings-sync: migrated legacy settings files (${legacyFiles.length}) to profiles/*`);
  return { migrated: true, fileMap: migratedMap };
}

async function fetchSettingsProfilesMap(settings) {
  const api = createApi(settings);
  const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');
  const remote = await fetchRemoteFileMap(api, basePath, null);
  const initialMap = remote?.fileMap || {};
  const migration = await ensureSettingsProfilesMigrated(api, basePath, initialMap);
  return { api, basePath, fileMap: migration.fileMap, migrated: migration.migrated };
}

export async function getRemoteEncryptedSettingsContent(remoteMap, basePath) {
  const clientName = await getSettingsSyncClientName();
  const alias = clientName ? slugifySettingName(clientName) : '';
  const preferredPaths = [
    alias ? settingsFilePath(basePath, `${SETTINGS_PROFILES_DIR}/${alias}/settings.enc`) : '',
    settingsFilePath(basePath, 'settings.enc'),
  ];
  for (const path of preferredPaths) {
    if (path && remoteMap[path]) return remoteMap[path];
  }
  return null;
}

export async function listSettingsProfilesFromRepo() {
  const settings = await getSettings();
  if (!isConfigured(settings)) return [];
  const { fileMap, basePath } = await fetchSettingsProfilesMap(settings);
  return buildProfilesFromRemote(fileMap, basePath);
}

// Legacy adapter
export async function listRemoteDeviceConfigs() {
  const profiles = await listSettingsProfilesFromRepo();
  return profiles.map((p) => ({
    filename: p.path || p.filename,
    deviceId: p.alias || p.id || 'profile',
  }));
}

export async function importSettingsProfile(filename, passwordOverride = '') {
  if (!isValidSettingsReference(filename)) return { success: false, message: 'Invalid settings profile reference' };
  const settings = await getSettings();
  if (!isConfigured(settings)) return { success: false, message: 'Not configured' };
  const { fileMap, basePath } = await fetchSettingsProfilesMap(settings);
  const profiles = buildProfilesFromRemote(fileMap, basePath);
  const reference = resolveSettingsReference(filename, profiles);
  const encContent = fileMap[settingsFilePath(basePath, reference)];
  if (!encContent) return { success: false, message: 'Profile not found in repository' };

  const password = passwordOverride || await getSettingsSyncPassword();
  if (!password) return { success: false, message: 'No password set' };

  try {
    const json = await decryptWithPassword(encContent, password);
    await applyRemoteSettings(json);
    suppressSettingsSyncUntil = Date.now() + 30000;
    await debugLog(`settings-sync: imported profile ${reference}`);
    return { success: true, message: 'Settings imported' };
  } catch (err) {
    await debugLog(`settings-sync: import decrypt failed — ${err.message}`);
    return { success: false, message: `Decrypt failed: ${err.message}` };
  }
}

export async function syncCurrentSettingsToProfile({ filename, password } = {}) {
  if (!filename || !isValidSettingsReference(filename)) return { success: false, message: 'Invalid settings profile reference' };
  if (!password) return { success: false, message: 'Password required' };

  const settings = await getSettings();
  if (!isConfigured(settings)) return { success: false, message: 'Not configured' };
  const { api, basePath, fileMap } = await fetchSettingsProfilesMap(settings);
  const profiles = buildProfilesFromRemote(fileMap, basePath);
  const own = await resolveOwnProfileReference(basePath, profiles);
  if (!own.ok) {
    return { success: false, message: own.message, code: own.code };
  }

  const selectedReference = resolveSettingsReference(filename, profiles);
  if (selectedReference !== own.ownReference) {
    return {
      success: false,
      message: `Selected profile does not match this client name (${own.clientName}).`,
      code: 'CLIENT_NAME_MISMATCH',
    };
  }

  const payload = await buildSettingsPayload();
  const encrypted = await encryptWithPassword(payload, password);
  const fileChanges = { [settingsFilePath(basePath, own.ownReference)]: encrypted };

  const deviceId = await getDeviceId();
  const msg = `Settings sync profile from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
  await api.atomicCommit(msg, fileChanges);
  return { success: true, message: 'Settings profile synced' };
}

export async function createSettingsProfile({ name, password } = {}) {
  const cleanName = String(name || '').trim();
  if (!cleanName) return { success: false, message: 'Client name is required', code: 'CLIENT_NAME_REQUIRED' };
  if (!password) return { success: false, message: 'Password required' };

  const settings = await getSettings();
  if (!isConfigured(settings)) return { success: false, message: 'Not configured' };
  const { api, basePath, fileMap } = await fetchSettingsProfilesMap(settings);
  const profiles = buildProfilesFromRemote(fileMap, basePath).filter((p) => p.scope === 'client');
  const alias = slugifySettingName(cleanName);
  const path = toSettingsProfilePath(alias);
  const pathExists = profiles.some((p) => (p.path || p.filename) === path);
  if (pathExists) {
    return {
      success: false,
      message: `Client name already exists in repository: ${cleanName}`,
      code: 'CLIENT_NAME_CONFLICT',
    };
  }

  const payload = await buildSettingsPayload();
  const encrypted = await encryptWithPassword(payload, password);

  const fileChanges = { [settingsFilePath(basePath, path)]: encrypted };
  const deviceId = await getDeviceId();
  const msg = `Create settings profile from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
  await api.atomicCommit(msg, fileChanges);
  return {
    success: true,
    message: 'Settings profile created',
    filename: path,
    alias,
    normalizedFrom: cleanName !== alias ? cleanName : '',
  };
}

export async function deleteSettingsProfile(filename = '') {
  const settings = await getSettings();
  if (!isConfigured(settings)) return { success: false, message: 'Not configured' };

  const { api, basePath, fileMap } = await fetchSettingsProfilesMap(settings);
  const profiles = buildProfilesFromRemote(fileMap, basePath);
  const reference = resolveSettingsReference(filename, profiles);
  if (!isValidSettingsReference(reference)) {
    return { success: false, message: 'Invalid settings profile reference' };
  }

  const fullPath = settingsFilePath(basePath, reference);
  if (!fileMap[fullPath]) {
    return { success: false, message: 'Profile not found in repository', code: 'PROFILE_NOT_FOUND' };
  }

  const deviceId = await getDeviceId();
  const msg = `Delete settings profile from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
  await api.atomicCommit(msg, { [fullPath]: null });
  return { success: true, message: 'Settings profile deleted', filename: reference };
}

export async function readSettingsIndex() {
  const profiles = await listSettingsProfilesFromRepo();
  return {
    version: 2,
    entries: profiles
      .filter((p) => p.scope === 'client')
      .map((p) => ({ id: p.alias, name: p.alias, filename: p.path || p.filename, scope: 'client' })),
  };
}

export async function writeSettingsIndex() {
  return { success: false, message: 'settings-index is not used in profiles-folder mode' };
}

// Backward compatibility signature
export async function importDeviceConfig(filename, passwordOverride = '') {
  return importSettingsProfile(filename, passwordOverride);
}
