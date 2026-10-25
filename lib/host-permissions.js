/**
 * Runtime host permission helpers for self-hosted Git providers (Gitea/Forgejo).
 */

import { normalizeServerUrl } from './git-provider-common.js';

/**
 * Convert a server URL to a chrome.permissions origin pattern.
 * @param {string} serverUrl
 * @returns {string|null}
 */
export function serverUrlToOriginPattern(serverUrl) {
  const normalized = normalizeServerUrl(serverUrl);
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    return `${parsed.origin}/*`;
  } catch {
    return null;
  }
}

/**
 * Check whether the origin is already granted (no user-gesture prompt).
 * @param {string} serverUrl
 * @returns {Promise<{ granted: boolean, pattern: string|null }>}
 */
export async function ensureHostPermissionForServerUrl(serverUrl) {
  const pattern = serverUrlToOriginPattern(serverUrl);
  if (!pattern) {
    return { granted: false, pattern: null };
  }
  try {
    const has = await chrome.permissions.contains({ origins: [pattern] });
    return { granted: !!has, pattern };
  } catch (err) {
    console.warn('[GitSyncMarks] Host permission check failed:', err);
    return { granted: false, pattern };
  }
}

/**
 * Request the origin immediately (must be the first await in a user-input handler).
 * Resolves true without a prompt when already granted.
 * @param {string} serverUrl
 * @returns {Promise<{ granted: boolean, pattern: string|null }>}
 */
export async function requestHostPermissionForServerUrl(serverUrl) {
  const pattern = serverUrlToOriginPattern(serverUrl);
  if (!pattern) {
    return { granted: false, pattern: null };
  }
  try {
    const granted = await chrome.permissions.request({ origins: [pattern] });
    return { granted: !!granted, pattern };
  } catch (err) {
    console.warn('[GitSyncMarks] Host permission request failed:', err);
    return { granted: false, pattern };
  }
}
