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
 * Ensure the extension can fetch the given Gitea server origin.
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
    if (has) {
      return { granted: true, pattern };
    }
    const granted = await chrome.permissions.request({ origins: [pattern] });
    return { granted: !!granted, pattern };
  } catch (err) {
    console.warn('[GitSyncMarks] Host permission request failed:', err);
    return { granted: false, pattern };
  }
}
