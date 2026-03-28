/**
 * Debug Log – In-memory ring buffer for sync diagnostics.
 * Enable via settings; export via "Log exportieren" button in options.
 * Persisted to chrome.storage.local so it survives service worker restarts.
 */

const MAX_LINES = 500;
import { getSettings, isConfigured, STORAGE_KEYS } from './sync-engine.js';
import { getActiveProfileId } from './profile-manager.js';

const STORAGE_KEY = 'debugLogEnabled';
const STORAGE_LOG_KEY = 'debugLogLines';

/** @type {string[]} */
let lines = [];

/** Cached enable flag — avoids async storage read per log call. */
let cachedEnabled = null;

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[STORAGE_KEY]) {
      cachedEnabled = !!changes[STORAGE_KEY].newValue;
    }
  });
} catch { /* not in extension context (e.g. tests) */ }

/**
 * Check if debug logging is enabled (async, from storage).
 * @returns {Promise<boolean>}
 */
export async function isDebugLogEnabled() {
  if (cachedEnabled !== null) return cachedEnabled;
  try {
    const r = await chrome.storage.sync.get(STORAGE_KEY);
    cachedEnabled = !!r[STORAGE_KEY];
    return cachedEnabled;
  } catch {
    return false;
  }
}

/**
 * Set debug log enabled state.
 * @param {boolean} enabled
 */
export async function setDebugLogEnabled(enabled) {
  cachedEnabled = enabled;
  await chrome.storage.sync.set({ [STORAGE_KEY]: enabled });
}

/**
 * Append a log message (only if debug log is enabled).
 * @param {string} msg - Message to log (will be prefixed with timestamp)
 */
export async function log(msg) {
  const enabled = await isDebugLogEnabled();
  if (!enabled) return;

  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  lines.push(line);
  if (lines.length > MAX_LINES) {
    lines = lines.slice(-MAX_LINES);
  }
  try {
    await chrome.storage.local.set({ [STORAGE_LOG_KEY]: lines });
  } catch (e) {
    console.warn('[GitSyncMarks] Debug log persist failed:', e);
  }
}

/**
 * Append a log message synchronously (use when async not possible).
 * Only logs if the setting was previously fetched and is true.
 * Use log() when you can await.
 * @param {string} msg
 * @param {boolean} [enabled] - Pre-fetched isDebugLogEnabled result
 */
export function logSync(msg, enabled = false) {
  if (!enabled) return;
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  lines.push(line);
  if (lines.length > MAX_LINES) {
    lines = lines.slice(-MAX_LINES);
  }
}

/**
 * Load log from storage (when in-memory is empty, e.g. after service worker restart).
 * @returns {Promise<string[]>}
 */
async function loadLinesFromStorage() {
  if (lines.length > 0) return lines;
  try {
    const r = await chrome.storage.local.get(STORAGE_LOG_KEY);
    lines = r[STORAGE_LOG_KEY] || [];
  } catch {
    lines = [];
  }
  return lines;
}

/**
 * Get all log lines as array.
 * @returns {string[]}
 */
export function getLog() {
  return [...lines];
}

/**
 * Get log as a single string. In background context, loads from storage if empty.
 * @returns {Promise<string>}
 */
export async function getLogAsString() {
  let content = '';
  if (lines.length > 0) {
    content = lines.join('\n');
  } else {
    const arr = await loadLinesFromStorage();
    content = arr.join('\n');
  }
  return content;
}

/**
 * Generate a system and configuration snapshot for the debug log header.
 * @returns {Promise<string>}
 */
async function generateHeader() {
  const manifest = chrome.runtime.getManifest();
  const version = manifest.version;
  const userAgent = navigator.userAgent;

  let configSnapshot = 'Not configured';
  try {
    const settings = await getSettings();
    if (isConfigured(settings)) {
      const activeId = await getActiveProfileId();
      configSnapshot = `
Active Profile ID: ${activeId}
Auto Sync: ${settings[STORAGE_KEYS.AUTO_SYNC]}
Sync Interval: ${settings[STORAGE_KEYS.SYNC_INTERVAL]}
Sync on Startup: ${settings[STORAGE_KEYS.SYNC_ON_STARTUP]}
Sync on Focus: ${settings[STORAGE_KEYS.SYNC_ON_FOCUS]}
Generate README.md: ${settings[STORAGE_KEYS.GENERATE_README_MD]}
Generate HTML: ${settings[STORAGE_KEYS.GENERATE_BOOKMARKS_HTML]}
Generate Feed: ${settings[STORAGE_KEYS.GENERATE_FEED_XML]}
Generate Dashy: ${settings[STORAGE_KEYS.GENERATE_DASHY_YML]}
GitHub Repos Enabled: ${settings.githubReposEnabled}
`.trim();
    }
  } catch (err) {
    configSnapshot = `Error fetching config: ${err.message}`;
  }

  return `=== GitSyncMarks Debug Log ===
Version: ${version}
UserAgent: ${userAgent}
Time: ${new Date().toISOString()}

--- Configuration Snapshot ---
${configSnapshot}

--- Log Data ---
`;
}

/**
 * Get the full debug log with system and configuration headers.
 * @returns {Promise<string>} - Text content of the log
 */
export async function getDebugLogExportContent() {
  const header = await generateHeader();
  const content = await getLogAsString();
  return header + content;
}

/**
 * Clear the log buffer (in-memory and storage).
 */
export async function clearLog() {
  lines = [];
  try {
    await chrome.storage.local.remove(STORAGE_LOG_KEY);
  } catch {
    // ignore
  }
}
