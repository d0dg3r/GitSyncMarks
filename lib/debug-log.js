/**
 * Debug Log – In-memory ring buffer for sync diagnostics.
 * Enable via settings; export via "Log exportieren" button in options.
 * Persisted to chrome.storage.local so it survives service worker restarts.
 */

const MAX_LINES = 500;
const STORAGE_KEY = 'debugLogEnabled';
const STORAGE_LOG_KEY = 'debugLogLines';

/** @type {string[]} */
let lines = [];

/**
 * Check if debug logging is enabled (async, from storage).
 * @returns {Promise<boolean>}
 */
export async function isDebugLogEnabled() {
  try {
    const r = await chrome.storage.sync.get(STORAGE_KEY);
    return !!r[STORAGE_KEY];
  } catch {
    return false;
  }
}

/**
 * Set debug log enabled state.
 * @param {boolean} enabled
 */
export async function setDebugLogEnabled(enabled) {
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
 * @returns {string | Promise<string>}
 */
export function getLogAsString() {
  if (lines.length > 0) return lines.join('\n');
  return loadLinesFromStorage().then((arr) => arr.join('\n'));
}

/**
 * Export log as downloadable file (txt).
 * @returns {string} - Blob URL for download
 */
export function exportLog() {
  const content = getLogAsString();
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  return URL.createObjectURL(blob);
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
