/**
 * Helpers for building Git provider clients from connection form values.
 */

import { STORAGE_KEYS } from './storage-keys.js';
import { createGitProvider } from './git-provider.js';
import { ensureHostPermissionForServerUrl } from './host-permissions.js';

/**
 * @param {string} value
 * @returns {'github'|'gitea'}
 */
export function normalizeGitProvider(value) {
  return value === 'gitea' ? 'gitea' : 'github';
}

/**
 * @param {Object} fields
 * @param {string} fields.token
 * @param {string} [fields.owner]
 * @param {string} [fields.repo]
 * @param {string} [fields.branch]
 * @param {'github'|'gitea'} [fields.gitProvider]
 * @param {string} [fields.serverUrl]
 * @returns {Record<string, string>}
 */
export function buildConnectionSettings(fields) {
  return {
    [STORAGE_KEYS.GITHUB_TOKEN]: fields.token || '',
    [STORAGE_KEYS.REPO_OWNER]: fields.owner || '',
    [STORAGE_KEYS.REPO_NAME]: fields.repo || '',
    [STORAGE_KEYS.BRANCH]: fields.branch || 'main',
    [STORAGE_KEYS.GIT_PROVIDER]: normalizeGitProvider(fields.gitProvider),
    [STORAGE_KEYS.SERVER_URL]: fields.serverUrl || '',
  };
}

/**
 * @param {Object} fields
 * @returns {import('./providers/github-api.js').GitHubAPI|import('./providers/gitea-api.js').GiteaAPI}
 */
export function createConnectionApi(fields) {
  const provider = normalizeGitProvider(fields.gitProvider);
  return createGitProvider({
    provider,
    token: fields.token || '',
    owner: fields.owner || '',
    repo: fields.repo || '',
    branch: fields.branch || 'main',
    serverUrl: fields.serverUrl || '',
  });
}

/**
 * @param {'github'|'gitea'} gitProvider
 * @param {string} serverUrl
 * @returns {Promise<{ granted: boolean }>}
 */
export async function ensureProviderHostPermission(gitProvider, serverUrl) {
  if (gitProvider !== 'gitea') {
    return { granted: true };
  }
  const result = await ensureHostPermissionForServerUrl(serverUrl);
  return { granted: result.granted };
}

/**
 * @param {Object} fields
 * @returns {boolean}
 */
export function isConnectionFormConfigured(fields) {
  const provider = normalizeGitProvider(fields.gitProvider);
  const hasCore = !!(fields.token?.trim() && fields.owner?.trim() && fields.repo?.trim());
  if (provider === 'gitea') {
    return !!(hasCore && fields.serverUrl?.trim());
  }
  return hasCore;
}
