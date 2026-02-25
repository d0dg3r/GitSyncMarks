/**
 * Sync Engine – Per-file bookmark sync with Three-Way-Merge
 *
 * Core concept: Each bookmark is stored as an individual JSON file in the Git repo.
 * The sync algorithm uses a three-way merge (base vs local vs remote) to detect
 * and resolve changes on both sides automatically.
 *
 * State management:
 *   LAST_SYNC_FILES: { [path]: { sha, content } } — snapshot at last sync
 *   LAST_COMMIT_SHA: commit SHA at last sync
 */

import { GitHubAPI, GitHubError } from './github-api.js';
import {
  bookmarkTreeToFileMap,
  fileMapToBookmarkTree,
  fileMapToMarkdown,
  fileMapToNetscapeHtml,
  fileMapToRssFeed,
  fileMapToDashyYaml,
  gitTreeToShaMap,
} from './bookmark-serializer.js';
import { fetchRemoteFileMap } from './remote-fetch.js';
import { replaceLocalBookmarks, createBookmarkTree } from './bookmark-replace.js';
import { encryptWithPassword, decryptWithPassword, encryptToken, decryptToken } from './crypto.js';
import { getMessage } from './i18n.js';
import { getSettingsForSync, getActiveProfileId, getSyncState, setSyncState } from './profile-manager.js';
import { log as debugLog } from './debug-log.js';

// ---- Storage keys ----

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

export { STORAGE_KEYS };

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

function normalizeGenMode(val) {
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

function createApi(settings) {
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
async function getLocalFileMap(basePath) {
  const tree = await chrome.bookmarks.getTree();
  return bookmarkTreeToFileMap(tree, basePath);
}

async function commitViaContentsApi(api, fileChanges, commitMsg) {
  let lastCommitSha = null;
  const entries = Object.entries(fileChanges).sort(([a], [b]) => a.localeCompare(b));
  for (const [path, content] of entries) {
    if (content === null) continue;
    let sha = null;
    try {
      const existing = await api.getFile(path);
      sha = existing?.sha || null;
    } catch (err) {
      const notFound = err instanceof GitHubError && err.statusCode === 404;
      if (!notFound) throw err;
    }
    const res = await api.createOrUpdateFile(path, content, commitMsg, sha);
    lastCommitSha = res?.commitSha || lastCommitSha;
  }
  return lastCommitSha;
}

// ---- Remote access helpers ----

// Re-export for backward compatibility
export { fetchRemoteFileMap } from './remote-fetch.js';

// ---- File map filtering ----

/**
 * Files to exclude from diff calculations.
 * These are either metadata or generated files that should not trigger sync actions.
 */
const DIFF_IGNORE_SUFFIXES = ['/README.md', '/_index.json', '/bookmarks.html', '/feed.xml', '/dashy-conf.yml'];
const SETTINGS_ENC_PATTERN = /\/(?:settings(?:-[^/]+)?\.enc|profiles\/[^/]+\/settings\.enc)$/;
const LEGACY_SETTINGS_FILENAME_PATTERN = /^settings(?:-[^/]+)?\.enc$/;
const PROFILE_SETTINGS_RELATIVE_PATH_PATTERN = /^profiles\/([^/]+)\/settings\.enc$/;
const SETTINGS_PROFILES_DIR = 'profiles';
const LOCAL_SETTINGS_SYNC_CLIENT_NAME_KEY = 'settingsSyncClientName';

/**
 * Filter a file map to exclude generated/meta files from diff calculations.
 * @param {Object<string, string>} files
 * @returns {Object<string, string>}
 */
function filterForDiff(files) {
  const filtered = {};
  for (const [path, content] of Object.entries(files)) {
    if (DIFF_IGNORE_SUFFIXES.some(suffix => path.endsWith(suffix))) continue;
    if (SETTINGS_ENC_PATTERN.test(path)) continue;
    filtered[path] = content;
  }
  return filtered;
}

function hasBookmarkPayloadFiles(files = {}) {
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
async function buildEncryptedSettings(settings) {
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
async function applyEncryptedSettings(encryptedContent, settings) {
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

async function getRemoteEncryptedSettingsContent(remoteMap, basePath) {
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

// ---- Three-Way-Merge ----

// ---- _order.json content-level merge helpers ----

/**
 * Extract a unique key from an _order.json entry for comparison.
 * @param {string|object} entry
 * @returns {string}
 */
function orderEntryKey(entry) {
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object' && entry !== null && entry.dir) return `dir:${entry.dir}`;
  return JSON.stringify(entry);
}

/**
 * Three-way merge for _order.json content.
 *
 * _order.json is an array of entries where each entry is either a bookmark
 * filename (string) or a folder descriptor ({ dir, title }).  When two devices
 * concurrently add/remove different bookmarks in the same folder, both produce
 * different _order.json content.  Instead of treating this as a conflict, we
 * merge the arrays: keep local order as the base, apply remote additions at the
 * end, and honour removals from both sides.
 *
 * @param {string|null} baseContent  - Base _order.json (null if newly created)
 * @param {string}      localContent - Local _order.json
 * @param {string}      remoteContent - Remote _order.json
 * @returns {string|null} Merged JSON string, or null if merge is not possible.
 */
export function mergeOrderJson(baseContent, localContent, remoteContent) {
  let base, local, remote;
  try {
    base = baseContent ? JSON.parse(baseContent) : [];
    local = JSON.parse(localContent);
    remote = JSON.parse(remoteContent);
  } catch {
    return null; // Malformed JSON → fall through to conflict
  }

  if (!Array.isArray(base) || !Array.isArray(local) || !Array.isArray(remote)) {
    return null;
  }

  const baseKeys = new Set(base.map(orderEntryKey));
  const localKeys = new Set(local.map(orderEntryKey));
  const remoteKeys = new Set(remote.map(orderEntryKey));

  // Determine what each side removed relative to base
  const remoteRemovedKeys = new Set(
    base.filter(e => !remoteKeys.has(orderEntryKey(e))).map(orderEntryKey)
  );
  const localRemovedKeys = new Set(
    base.filter(e => !localKeys.has(orderEntryKey(e))).map(orderEntryKey)
  );

  // Start with local order — remove entries that remote deleted
  const merged = local.filter(e => !remoteRemovedKeys.has(orderEntryKey(e)));

  // Append entries that remote added (entries in remote but not in base)
  // Skip any that are already present in merged (e.g. both sides added the same entry)
  const mergedKeys = new Set(merged.map(orderEntryKey));
  for (const entry of remote) {
    const key = orderEntryKey(entry);
    if (!baseKeys.has(key) && !mergedKeys.has(key) && !localRemovedKeys.has(key)) {
      merged.push(entry);
      mergedKeys.add(key);
    }
  }

  return JSON.stringify(merged, null, 2);
}

/**
 * Compute the diff between a base file map and a current file map.
 * @param {Object<string, string>} base - Base file map (path → content)
 * @param {Object<string, string>} current - Current file map
 * @returns {{added: Object<string, string>, removed: string[], modified: Object<string, string>}}
 */
export function computeDiff(base, current) {
  const added = {};
  const removed = [];
  const modified = {};

  // Find added and modified
  for (const [path, content] of Object.entries(current)) {
    if (!(path in base)) {
      added[path] = content;
    } else if (base[path] !== content) {
      modified[path] = content;
    }
  }

  // Find removed
  for (const path of Object.keys(base)) {
    if (!(path in current)) {
      removed.push(path);
    }
  }

  return { added, removed, modified };
}

/**
 * Merge two diffs (local and remote) into a set of actions.
 * Implements the three-way merge rules from the plan.
 *
 * For _order.json files that both sides modified, a content-level merge is
 * attempted (combining additions/removals from both sides) instead of
 * immediately treating the change as a conflict.
 *
 * @param {object} localDiff - { added, removed, modified }
 * @param {object} remoteDiff - { added, removed, modified }
 * @param {Object<string, string>} localFiles - Full local file map
 * @param {Object<string, string>} remoteFiles - Full remote file map
 * @param {Object<string, string>} [baseFiles={}] - Base file map (for _order.json merging)
 * @returns {{
 *   toPush: Object<string, string|null>,
 *   toApplyLocal: Object<string, string|null>,
 *   conflicts: Array<{path: string, local: string|null, remote: string|null}>
 * }}
 */
export function mergeDiffs(localDiff, remoteDiff, localFiles, remoteFiles, baseFiles = {}) {
  const toPush = {};      // path → content (or null for delete) — changes to push to GitHub
  const toApplyLocal = {}; // path → content (or null for delete) — changes to apply locally
  const conflicts = [];

  // All paths that were changed on either side
  const allPaths = new Set([
    ...Object.keys(localDiff.added),
    ...localDiff.removed,
    ...Object.keys(localDiff.modified),
    ...Object.keys(remoteDiff.added),
    ...remoteDiff.removed,
    ...Object.keys(remoteDiff.modified),
  ]);

  for (const path of allPaths) {
    const localAdded = path in localDiff.added;
    const localRemoved = localDiff.removed.includes(path);
    const localModified = path in localDiff.modified;
    const remoteAdded = path in remoteDiff.added;
    const remoteRemoved = remoteDiff.removed.includes(path);
    const remoteModified = path in remoteDiff.modified;

    const localChanged = localAdded || localRemoved || localModified;
    const remoteChanged = remoteAdded || remoteRemoved || remoteModified;

    if (localChanged && !remoteChanged) {
      // Only local change → push to remote
      if (localRemoved) {
        toPush[path] = null;
      } else {
        toPush[path] = localFiles[path];
      }
    } else if (!localChanged && remoteChanged) {
      // Only remote change → apply locally
      if (remoteRemoved) {
        toApplyLocal[path] = null;
      } else {
        toApplyLocal[path] = remoteFiles[path];
      }
    } else if (localChanged && remoteChanged) {
      // Both changed — check if same change
      const localContent = localRemoved ? null : (localFiles[path] || null);
      const remoteContent = remoteRemoved ? null : (remoteFiles[path] || null);

      if (localContent === remoteContent) {
        // Same change on both sides → no conflict, no action needed
        continue;
      }

      // Attempt content-level merge for _order.json files
      if (path.endsWith('/_order.json') && localContent !== null && remoteContent !== null) {
        const baseContent = baseFiles[path] || null;
        const merged = mergeOrderJson(baseContent, localContent, remoteContent);
        if (merged !== null) {
          // Successfully merged — push merged version and apply locally
          toPush[path] = merged;
          toApplyLocal[path] = merged;
          continue;
        }
        // mergeOrderJson returned null → fall through to conflict
      }

      if (localAdded && remoteAdded) {
        // Both added different files at same path → conflict
        conflicts.push({ path, local: localContent, remote: remoteContent });
      } else if (localRemoved && remoteRemoved) {
        // Both deleted → nothing to do
        continue;
      } else {
        // One modified/added + other modified/removed → true conflict
        conflicts.push({ path, local: localContent, remote: remoteContent });
      }
    }
  }

  return { toPush, toApplyLocal, conflicts };
}

// ---- Core sync operations ----

/**
 * Full push: upload all local bookmarks as individual files.
 * Used for initial sync or force-push.
 * @param {{ fromSync?: boolean }} [options] - fromSync: true when called from sync() (skip lock to avoid race)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function push(options = {}) {
  if (!options.fromSync) {
    if (isSyncing) return { success: false, message: getMessage('sync_alreadyInProgress'), alreadyInProgress: true };
    isSyncing = true;
  }

  await debugLog('push() start');

  try {
    const settings = await getSettings();
    if (!isConfigured(settings)) return { success: false, message: getMessage('sync_notConfigured') };

    const api = createApi(settings);
    const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');
    const localFiles = await getLocalFileMap(basePath);
    const deviceId = await getDeviceId();

    // Get current remote state to determine what to change
    let remote;
    try {
      remote = await fetchRemoteFileMap(api, basePath, null);
    } catch (err) {
      console.warn('[GitSyncMarks] Could not fetch remote state for push:', err);
      remote = null;
    }

    // Build file changes: add/update all local files, delete remote files not in local
    const fileChanges = {};
    for (const [path, content] of Object.entries(localFiles)) {
      if (!remote || !remote.fileMap[path] || remote.fileMap[path] !== content) {
        fileChanges[path] = content;
      }
    }
    if (remote) {
      for (const path of Object.keys(remote.fileMap)) {
        if (path.startsWith(basePath + '/') && !(path in localFiles) &&
            !path.endsWith('/README.md') && !path.endsWith('/bookmarks.html') && !path.endsWith('/feed.xml') && !path.endsWith('/dashy-conf.yml') && !SETTINGS_ENC_PATTERN.test(path)) {
          fileChanges[path] = null; // delete
        }
      }
    }

    // Generate overview files (auto mode only)
    if (settings.generateReadmeMd === 'auto') {
      fileChanges[`${basePath}/README.md`] = fileMapToMarkdown(localFiles, basePath);
    }
    if (settings.generateBookmarksHtml === 'auto') {
      fileChanges[`${basePath}/bookmarks.html`] = fileMapToNetscapeHtml(localFiles, basePath);
    }
    if (settings.generateFeedXml === 'auto') {
      fileChanges[`${basePath}/feed.xml`] = fileMapToRssFeed(localFiles, basePath);
    }
    if (settings.generateDashyYml === 'auto') {
      fileChanges[`${basePath}/dashy-conf.yml`] = fileMapToDashyYaml(localFiles, basePath);
    }

    // Encrypted settings sync
    const encSettings = await buildEncryptedSettings(settings);
    if (encSettings) {
      fileChanges[`${basePath}/${encSettings.filename}`] = encSettings.content;
    }

    await debugLog(`push() fileChanges count: ${Object.keys(fileChanges).length}`);

    if (Object.keys(fileChanges).length === 0) {
      return { success: true, message: getMessage('sync_noChanges') };
    }

    const commitMsg = `Bookmark sync (push) from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
    let newCommitSha;
    try {
      newCommitSha = await api.atomicCommit(commitMsg, fileChanges);
    } catch (err) {
      const isModifiedConflict = /modified in the meantime/i.test(String(err?.message || ''));
      const remoteIsEmpty = !remote || Object.keys(remote.fileMap || {}).length === 0;
      if (!(isModifiedConflict && remoteIsEmpty)) throw err;
      newCommitSha = await commitViaContentsApi(api, fileChanges, commitMsg);
      if (!newCommitSha) throw err;
    }
    await debugLog(`push() committed: newCommitSha=${newCommitSha?.substring(0, 7)}`);

    const profileId = settings.profileId || await getActiveProfileId();
    // Save sync state
    await saveSyncState(profileId, api, basePath, localFiles, newCommitSha);

    return { success: true, message: getMessage('sync_pushSuccess') };
  } catch (err) {
    console.error('[GitSyncMarks] Push error:', err);
    return { success: false, message: getMessage('sync_pushFailed', [err.message]) };
  } finally {
    if (!options.fromSync) isSyncing = false;
  }
}

/**
 * Generate all enabled files (mode !== 'off') and push them to the repo.
 * Used for the "Generate now" button — generates files in both 'manual' and 'auto' modes.
 */
export async function generateFilesNow() {
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    return { success: false, message: getMessage('sync_notConfigured') };
  }

  const basePath = settings[STORAGE_KEYS.FILE_PATH];
  const deviceId = await getDeviceId();
  const api = createApi(settings);
  const localFiles = await getLocalFileMap(basePath);
  const fileChanges = {};

  if (settings.generateReadmeMd !== 'off') {
    fileChanges[`${basePath}/README.md`] = fileMapToMarkdown(localFiles, basePath);
  }
  if (settings.generateBookmarksHtml !== 'off') {
    fileChanges[`${basePath}/bookmarks.html`] = fileMapToNetscapeHtml(localFiles, basePath);
  }
  if (settings.generateFeedXml !== 'off') {
    fileChanges[`${basePath}/feed.xml`] = fileMapToRssFeed(localFiles, basePath);
  }
  if (settings.generateDashyYml !== 'off') {
    fileChanges[`${basePath}/dashy-conf.yml`] = fileMapToDashyYaml(localFiles, basePath);
  }

  if (Object.keys(fileChanges).length === 0) {
    return { success: true, message: getMessage('sync_noChanges') };
  }

  try {
    const commitMsg = `Generate files from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
    await api.atomicCommit(commitMsg, fileChanges);
    return { success: true, message: getMessage('sync_pushSuccess') };
  } catch (err) {
    console.error('[GitSyncMarks] Generate files error:', err);
    return { success: false, message: getMessage('sync_pushFailed', [err.message]) };
  }
}

/**
 * Full pull: replace all local bookmarks with remote data.
 * @param {{ fromSync?: boolean }} [options] - fromSync: true when called from sync() (skip lock to avoid race)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function pull(options = {}) {
  if (!options.fromSync) {
    if (isSyncing) return { success: false, message: getMessage('sync_alreadyInProgress'), alreadyInProgress: true };
    isSyncing = true;
  }

  await debugLog('pull() start');

  try {
    const settings = await getSettings();
    if (!isConfigured(settings)) return { success: false, message: getMessage('sync_notConfigured') };

    const api = createApi(settings);
    const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');
    const profileId = settings.profileId || await getActiveProfileId();

    const remote = await fetchRemoteFileMap(api, basePath, null);
    const remoteCount = remote ? Object.keys(remote.fileMap).length : 0;
    await debugLog(`pull() remote: fileCount=${remoteCount} commitSha=${remote?.commitSha?.substring(0, 7) ?? 'null'}`);

    if (!remote || Object.keys(remote.fileMap).length === 0) {
      return { success: false, message: getMessage('sync_noBookmarksOnGithub') };
    }

    // Apply encrypted settings from remote (before bookmarks, so profile config is current)
    const remoteSettingsEnc = await getRemoteEncryptedSettingsContent(remote.fileMap, basePath);
    await applyEncryptedSettings(remoteSettingsEnc, settings);

    // Convert remote files to bookmark tree and apply
    const roleMap = fileMapToBookmarkTree(remote.fileMap, basePath);
    suppressAutoSyncUntil = Date.now() + 30000;
    await replaceLocalBookmarks(roleMap, {
      githubReposEnabled: settings.githubReposEnabled,
      githubReposParent: settings.githubReposParent,
      githubReposUsername: settings.githubReposUsername,
    });

    // Re-generate local file map (to capture exact state with any normalization)
    const freshLocalFiles = await getLocalFileMap(basePath);

    // Save sync state with the fresh local files (content matches what browser has)
    // but use remote SHAs for the stored state so remote diff is clean
    await saveSyncStateFromMaps(profileId, freshLocalFiles, remote.shaMap, remote.commitSha);

    return { success: true, message: getMessage('sync_pullSuccess') };
  } catch (err) {
    console.error('[GitSyncMarks] Pull error:', err);
    return { success: false, message: getMessage('sync_pullFailed', [err.message]) };
  } finally {
    if (!options.fromSync) isSyncing = false;
  }
}

/**
 * Bidirectional sync with three-way merge.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sync() {
  if (isSyncing) return { success: false, message: getMessage('sync_alreadyInProgress'), alreadyInProgress: true };
  isSyncing = true;

  await debugLog('sync() start');

  try {
    const settings = await getSettings();
    if (!isConfigured(settings)) return { success: false, message: getMessage('sync_notConfigured') };

    const api = createApi(settings);
    const basePath = settings[STORAGE_KEYS.FILE_PATH].replace(/\/+$/, '');
    const deviceId = await getDeviceId();
    const profileId = settings.profileId || await getActiveProfileId();

    // 1. Load base state
    const stored = await getSyncState(profileId);
    const baseFiles = stored.lastSyncFiles || null;
    const baseCommitSha = stored.lastCommitSha || null;
    if (baseFiles) {
      await debugLog(`sync() loaded baseCount=${Object.keys(baseFiles).length} baseCommitSha=${baseCommitSha?.substring(0, 7) ?? 'null'}`);
    }

    // 2. Get local file map
    const localFiles = await getLocalFileMap(basePath);

    // 3. Get remote file map (optimized: uses base SHAs to skip unchanged blobs)
    const remote = await fetchRemoteFileMap(api, basePath, baseFiles);
    if (remote) {
      await debugLog(`sync() fetchRemote done: remoteCommitSha=${remote.commitSha?.substring(0, 7)}`);
    }

    // 4. Handle special cases

    // 4a. No base state (first sync)
    if (!baseFiles) {
      const hasRemote = remote ? hasBookmarkPayloadFiles(remote.fileMap) : false;
      const hasLocal = hasBookmarkPayloadFiles(localFiles);

      if (!hasRemote && hasLocal) {
        // First sync, no remote data → push everything (hold lock to avoid concurrent sync)
        console.log('[GitSyncMarks] First sync: pushing local bookmarks');
        return await push({ fromSync: true });
      }
      if (hasRemote && !hasLocal) {
        // Remote has data, local is empty → pull (hold lock to avoid concurrent sync)
        console.log('[GitSyncMarks] First sync: pulling remote bookmarks');
        return await pull({ fromSync: true });
      }
      if (hasRemote && hasLocal) {
        // Both have data, no base → can't merge, user must choose
        console.log('[GitSyncMarks] First sync: both sides have data, conflict');
        await setSyncState(profileId, { hasConflict: true });
        return { success: false, message: getMessage('sync_conflictBothModified'), conflict: true };
      }
      // Neither has data
      return { success: true, message: getMessage('sync_allInSync') };
    }

    // 4b. Extract base content map (path → content) from stored state
    const baseContentMap = {};
    for (const [path, info] of Object.entries(baseFiles)) {
      baseContentMap[path] = info.content;
    }

    const remoteFiles = remote ? remote.fileMap : {};
    const baseCount = Object.keys(baseContentMap).length;
    const localCount = Object.keys(localFiles).length;
    const remoteCount = Object.keys(remoteFiles).length;
    await debugLog(`sync() baseFiles: ${baseCount} localFiles: ${localCount} remoteFiles: ${remoteCount}`);

    // 5. Compute diffs (excluding generated files like README.md)
    const localDiff = computeDiff(filterForDiff(baseContentMap), filterForDiff(localFiles));
    const remoteDiff = computeDiff(filterForDiff(baseContentMap), filterForDiff(remoteFiles));

    await debugLog(`sync() localDiff: added=${Object.keys(localDiff.added).length} removed=${localDiff.removed.length} modified=${Object.keys(localDiff.modified).length}`);
    await debugLog(`sync() remoteDiff: added=${Object.keys(remoteDiff.added).length} removed=${remoteDiff.removed.length} modified=${Object.keys(remoteDiff.modified).length}`);

    const localHasChanges = Object.keys(localDiff.added).length > 0 ||
      localDiff.removed.length > 0 || Object.keys(localDiff.modified).length > 0;
    const remoteHasChanges = Object.keys(remoteDiff.added).length > 0 ||
      remoteDiff.removed.length > 0 || Object.keys(remoteDiff.modified).length > 0;

    console.log('[GitSyncMarks] Sync analysis:', {
      localChanges: {
        added: Object.keys(localDiff.added).length,
        removed: localDiff.removed.length,
        modified: Object.keys(localDiff.modified).length,
      },
      remoteChanges: {
        added: Object.keys(remoteDiff.added).length,
        removed: remoteDiff.removed.length,
        modified: Object.keys(remoteDiff.modified).length,
      },
    });

    // 6. No changes on either side
    if (!localHasChanges && !remoteHasChanges) {
      await setSyncState(profileId, { lastSyncTime: new Date().toISOString() });
      return { success: true, message: getMessage('sync_allInSync') };
    }

    // 7. Only local changes → push
    if (localHasChanges && !remoteHasChanges) {
      const fileChanges = {};
      for (const [p, c] of Object.entries(localDiff.added)) fileChanges[p] = c;
      for (const [p, c] of Object.entries(localDiff.modified)) fileChanges[p] = c;
      for (const p of localDiff.removed) fileChanges[p] = null;

      // Regenerate overview files (auto mode only)
      if (settings.generateReadmeMd === 'auto') {
        fileChanges[`${basePath}/README.md`] = fileMapToMarkdown(localFiles, basePath);
      }
      if (settings.generateBookmarksHtml === 'auto') {
        fileChanges[`${basePath}/bookmarks.html`] = fileMapToNetscapeHtml(localFiles, basePath);
      }
      if (settings.generateFeedXml === 'auto') {
        fileChanges[`${basePath}/feed.xml`] = fileMapToRssFeed(localFiles, basePath);
      }
      if (settings.generateDashyYml === 'auto') {
        fileChanges[`${basePath}/dashy-conf.yml`] = fileMapToDashyYaml(localFiles, basePath);
      }

      const encSettings7 = await buildEncryptedSettings(settings);
      if (encSettings7) fileChanges[`${basePath}/${encSettings7.filename}`] = encSettings7.content;

      const msg = `Bookmark sync from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
      const newCommitSha = await api.atomicCommit(msg, fileChanges);
      await debugLog(`sync() path7 push: newCommitSha=${newCommitSha?.substring(0, 7)}`);
      await saveSyncState(profileId, api, basePath, localFiles, newCommitSha);

      return { success: true, message: getMessage('sync_pushSuccess') };
    }

    // 8. Only remote changes → apply locally
    if (!localHasChanges && remoteHasChanges) {
      // Guard: our fetch may have returned stale/cached data (e.g. right after our push).
      // Re-fetch branch HEAD; if it differs from what we got, the remote we have is stale—don't overwrite.
      const verifySha = await api.getLatestCommitSha();
      if (verifySha !== remote.commitSha) {
        await debugLog(`sync() path8 guard: remote.commitSha=${remote.commitSha?.substring(0,7)} != verifySha=${verifySha?.substring(0,7)} — skipping pull (stale fetch)`);
        await setSyncState(profileId, { lastSyncTime: new Date().toISOString() });
        return { success: true, message: getMessage('sync_allInSync') };
      }
      // Apply encrypted settings from remote
      const remoteSettingsEnc8 = await getRemoteEncryptedSettingsContent(remoteFiles, basePath);
      await applyEncryptedSettings(remoteSettingsEnc8, settings);

      const roleMap = fileMapToBookmarkTree(remoteFiles, basePath);
      suppressAutoSyncUntil = Date.now() + 30000;
      await replaceLocalBookmarks(roleMap, {
        githubReposEnabled: settings.githubReposEnabled,
        githubReposParent: settings.githubReposParent,
        githubReposUsername: settings.githubReposUsername,
      });

      const freshLocal = await getLocalFileMap(basePath);
      await debugLog(`sync() path8 pull: remoteCommitSha=${remote.commitSha?.substring(0, 7)}`);
      await saveSyncStateFromMaps(profileId, freshLocal, remote.shaMap, remote.commitSha);

      return { success: true, message: getMessage('sync_pullSuccess') };
    }

    // 9. Both changed → three-way merge
    const { toPush, toApplyLocal, conflicts } = mergeDiffs(
      localDiff, remoteDiff, localFiles, remoteFiles, baseContentMap
    );

    await debugLog(`sync() merge result: toPush=${Object.keys(toPush).length} toApplyLocal=${Object.keys(toApplyLocal).length} conflicts=${conflicts.length}`);

    if (conflicts.length > 0) {
      for (const c of conflicts) {
        const localPreview = c.local ? String(c.local).slice(0, 80) + (c.local.length > 80 ? '...' : '') : 'null';
        const remotePreview = c.remote ? String(c.remote).slice(0, 80) + (c.remote.length > 80 ? '...' : '') : 'null';
        await debugLog(`sync() conflict path=${c.path} local=${localPreview} remote=${remotePreview}`);
      }
      console.log('[GitSyncMarks] Merge conflicts:', conflicts.map(c => c.path));
      await setSyncState(profileId, { hasConflict: true });
      return { success: false, message: getMessage('sync_conflictBothModified'), conflict: true };
    }

    // Apply remote encrypted settings if present
    const remoteSettingsEnc9 = await getRemoteEncryptedSettingsContent(remoteFiles, basePath);
    await applyEncryptedSettings(remoteSettingsEnc9, settings);

    // Apply non-conflicting changes

    // Build merged file map (local + toApplyLocal) — used for replace and push
    const mergedFiles = { ...localFiles };
    for (const [path, content] of Object.entries(toApplyLocal)) {
      if (content === null) {
        delete mergedFiles[path];
      } else {
        mergedFiles[path] = content;
      }
    }

    // Apply remote changes locally
    if (Object.keys(toApplyLocal).length > 0) {
      const roleMap = fileMapToBookmarkTree(mergedFiles, basePath);
      suppressAutoSyncUntil = Date.now() + 30000;
      await replaceLocalBookmarks(roleMap, {
        githubReposEnabled: settings.githubReposEnabled,
        githubReposParent: settings.githubReposParent,
        githubReposUsername: settings.githubReposUsername,
      });
    }

    // Push local changes to remote
    if (Object.keys(toPush).length > 0) {
      // Ensure remote matches merged state: delete paths on remote that are not in merged
      for (const path of Object.keys(remoteFiles)) {
        if (!(path in mergedFiles) && !path.endsWith('/README.md') && !path.endsWith('/bookmarks.html') && !path.endsWith('/feed.xml') && !path.endsWith('/dashy-conf.yml') && !SETTINGS_ENC_PATTERN.test(path)) {
          toPush[path] = null;
        }
      }
      if (settings.generateReadmeMd === 'auto') {
        toPush[`${basePath}/README.md`] = fileMapToMarkdown(mergedFiles, basePath);
      }
      if (settings.generateBookmarksHtml === 'auto') {
        toPush[`${basePath}/bookmarks.html`] = fileMapToNetscapeHtml(mergedFiles, basePath);
      }
      if (settings.generateFeedXml === 'auto') {
        toPush[`${basePath}/feed.xml`] = fileMapToRssFeed(mergedFiles, basePath);
      }
      if (settings.generateDashyYml === 'auto') {
        toPush[`${basePath}/dashy-conf.yml`] = fileMapToDashyYaml(mergedFiles, basePath);
      }

      const encSettings9 = await buildEncryptedSettings(settings);
      if (encSettings9) toPush[`${basePath}/${encSettings9.filename}`] = encSettings9.content;

      const msg = `Bookmark merge from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;
      const newCommitSha = await api.atomicCommit(msg, toPush);

      const freshLocal = await getLocalFileMap(basePath);
      await saveSyncState(profileId, api, basePath, freshLocal, newCommitSha);
      await debugLog(`sync() saved state: savedCount=${Object.keys(freshLocal).length} commitSha=${newCommitSha.substring(0, 7)}`);
    } else if (Object.keys(toApplyLocal).length > 0) {
      const freshLocal = await getLocalFileMap(basePath);
      await saveSyncStateFromMaps(profileId, freshLocal, remote.shaMap, remote.commitSha);
      await debugLog(`sync() saved state: savedCount=${Object.keys(freshLocal).length} commitSha=${remote.commitSha?.substring(0, 7)}`);
    }
    // Note: hasConflict: false is already set in saveSyncStateFromMaps — no redundant setSyncState

    await debugLog('sync() done (merged successfully)');
    const resultMessage =
      Object.keys(toPush).length > 0
        ? getMessage('sync_pushSuccess')
        : Object.keys(toApplyLocal).length > 0
          ? getMessage('sync_pullSuccess')
          : getMessage('sync_allInSync');
    return { success: true, message: resultMessage };

  } catch (err) {
    await debugLog(`sync() error: ${err.message}`);
    console.error('[GitSyncMarks] Sync error:', err);
    return { success: false, message: getMessage('sync_syncFailed', [err.message]) };
  } finally {
    isSyncing = false;
  }
}

// ---- Sync state management ----

/**
 * Save sync state after a push (fetches fresh SHAs from remote tree).
 */
async function saveSyncState(profileId, api, basePath, localFiles, commitSha) {
  const commit = await api.getCommit(commitSha);
  const treeEntries = await api.getTree(commit.treeSha);
  const shaMap = gitTreeToShaMap(treeEntries, basePath);

  await saveSyncStateFromMaps(profileId, localFiles, shaMap, commitSha);
}

/**
 * Save sync state from pre-computed maps.
 */
async function saveSyncStateFromMaps(profileId, localFiles, shaMap, commitSha) {
  const syncFiles = {};
  for (const [path, content] of Object.entries(localFiles)) {
    syncFiles[path] = {
      sha: shaMap[path] || null,
      content,
    };
  }

  const now = new Date().toISOString();
  await setSyncState(profileId, {
    lastSyncFiles: syncFiles,
    lastCommitSha: commitSha,
    lastSyncTime: now,
    lastSyncWithChangesTime: now,
    hasConflict: false,
  });
}

// Re-export for backward compatibility
export { replaceLocalBookmarks, createBookmarkTree } from './bookmark-replace.js';

// ---- Sync status ----

export async function getSyncStatus() {
  const profileId = await getActiveProfileId();
  const state = await getSyncState(profileId);
  const settings = await getSettings();
  return {
    configured: isConfigured(settings),
    lastSyncTime: state.lastSyncTime || null,
    lastSyncWithChangesTime: state.lastSyncWithChangesTime || null,
    lastCommitSha: state.lastCommitSha || null,
    hasConflict: state.hasConflict || false,
    autoSync: settings[STORAGE_KEYS.AUTO_SYNC],
    repoOwner: settings[STORAGE_KEYS.REPO_OWNER] || '',
    repoName: settings[STORAGE_KEYS.REPO_NAME] || '',
  };
}

// ---- Sync lock ----

let isSyncing = false;
export function isSyncInProgress() { return isSyncing; }

// ---- Auto-sync suppression ----

let suppressAutoSyncUntil = 0;
export function isAutoSyncSuppressed() { return Date.now() < suppressAutoSyncUntil; }

// ---- Debounce for auto-sync ----

let debounceTimer = null;
let maxWaitTimer = null;

/**
 * Max wait: sync at latest after 30s or 6× debounce delay (prevents infinite deferral).
 */
const MAX_WAIT_MULTIPLIER = 6;
const MAX_WAIT_MIN_MS = 30000;

export function debouncedSync(delayMs = 5000, onComplete = null) {
  const maxWaitMs = Math.max(MAX_WAIT_MIN_MS, MAX_WAIT_MULTIPLIER * delayMs);

  const runSync = async () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = null;
    if (maxWaitTimer) clearTimeout(maxWaitTimer);
    maxWaitTimer = null;

    const settings = await getSettings();
    if (settings[STORAGE_KEYS.AUTO_SYNC]) {
      console.log('[GitSyncMarks] Auto-sync triggered');
      const result = await sync();
      console.log('[GitSyncMarks] Auto-sync result:', result.message);
      if (result.success) {
        chrome.action.setBadgeText({ text: '' });
      } else {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
      }
      if (onComplete) onComplete(result);
    }
  };

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runSync, delayMs);

  if (!maxWaitTimer) {
    maxWaitTimer = setTimeout(runSync, maxWaitMs);
  }
}

// Legacy alias for backward compatibility
export const debouncedPush = debouncedSync;

/**
 * Deterministic bootstrap entry for onboarding first sync.
 * Uses the normal sync merge path (no dedicated push loop).
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function bootstrapFirstSync() {
  try {
    let result = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      result = await sync();
      const msg = String(result?.message || '');
      if (result?.success) break;
      if (!/modified in the meantime/i.test(msg)) break;
    }
    return result;
  } catch (err) {
    throw err;
  }
}

// ---- Migration ----

/**
 * Check if we need to migrate from the old single-file format.
 * @param {GitHubAPI} api
 * @param {string} basePath
 * @returns {Promise<boolean>} true if migration was performed
 */
export async function migrateFromLegacyFormat(api, basePath) {
  const base = basePath.replace(/\/+$/, '');
  const legacyPath = `${base}/bookmarks.json`;

  let legacyFile;
  try {
    legacyFile = await api.getFile(legacyPath);
  } catch {
    return false;
  }

  if (!legacyFile) return false;

  console.log('[GitSyncMarks] Legacy bookmarks.json found, migrating to per-file format...');

  try {
    const data = JSON.parse(legacyFile.content);
    if (!data || data.version !== 1 || !data.bookmarks) return false;

    // The local bookmarks should already match (or the user needs to sync first).
    // We'll push the current local bookmarks as individual files and delete the old files.
    const tree = await chrome.bookmarks.getTree();
    const localFiles = bookmarkTreeToFileMap(tree, base);

    // Build file changes: add all new per-file entries, delete legacy files
    const fileChanges = {};
    for (const [path, content] of Object.entries(localFiles)) {
      fileChanges[path] = content;
    }

    // Delete old legacy files
    const legacyFiles = [
      `${base}/bookmarks.json`,
      `${base}/README.md`,
      `${base}/sync_meta.json`,
    ];
    for (const lf of legacyFiles) {
      try {
        const existing = await api.getFile(lf);
        if (existing) {
          fileChanges[lf] = null; // delete
        }
      } catch { /* ignore */ }
    }

    if (Object.keys(fileChanges).length === 0) return false;

    const deviceId = await getDeviceId();
    const msg = `Migrate to per-file format from ${deviceId.substring(0, 8)}`;
    const newCommitSha = await api.atomicCommit(msg, fileChanges);

    const profileId = await getActiveProfileId();
    // Save sync state
    await saveSyncState(profileId, api, base, localFiles, newCommitSha);

    // Clean up legacy storage keys
    await chrome.storage.local.remove([
      STORAGE_KEYS.LAST_SYNC_DATA,
      STORAGE_KEYS.LAST_REMOTE_SHA_JSON,
      STORAGE_KEYS.LAST_REMOTE_SHA_MD,
      STORAGE_KEYS.LAST_REMOTE_SHA_META,
    ]);

    console.log('[GitSyncMarks] Migration complete');
    return true;
  } catch (err) {
    console.error('[GitSyncMarks] Migration error:', err);
    return false;
  }
}
