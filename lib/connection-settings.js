/**
 * Helpers for building Git provider clients from connection form values.
 */

import { STORAGE_KEYS } from './storage-keys.js';
import { createGitProvider } from './git-provider.js';
import { ensureHostPermissionForServerUrl } from './host-permissions.js';
import {
  getProviderCaps,
  needsRuntimeHostPermission,
  normalizeServerUrl,
  SUPPORTED_PROVIDER_IDS,
} from './git-provider-common.js';

/**
 * @param {string} value
 * @returns {string}
 */
export function normalizeGitProvider(value) {
  const id = String(value || '').trim();
  return SUPPORTED_PROVIDER_IDS.includes(id) ? id : 'github';
}

/**
 * @param {Object} fields
 * @param {string} fields.token
 * @param {string} [fields.owner]
 * @param {string} [fields.repo]
 * @param {string} [fields.branch]
 * @param {string} [fields.gitProvider]
 * @param {string} [fields.serverUrl]
 * @returns {Record<string, string>}
 */
export function buildConnectionSettings(fields) {
  const provider = normalizeGitProvider(fields.gitProvider);
  const caps = getProviderCaps(provider);
  let serverUrl = fields.serverUrl || '';
  if (!serverUrl && caps.defaultServerUrl) {
    serverUrl = caps.defaultServerUrl;
  }
  return {
    [STORAGE_KEYS.GITHUB_TOKEN]: fields.token || '',
    [STORAGE_KEYS.REPO_OWNER]: fields.owner || '',
    [STORAGE_KEYS.REPO_NAME]: fields.repo || '',
    [STORAGE_KEYS.BRANCH]: fields.branch || 'main',
    [STORAGE_KEYS.GIT_PROVIDER]: provider,
    [STORAGE_KEYS.SERVER_URL]: serverUrl,
  };
}

/**
 * @param {Object} fields
 * @returns {import('./providers/github-api.js').GitHubAPI|import('./providers/gitea-api.js').GiteaAPI|import('./providers/gitlab-api.js').GitLabAPI}
 */
export function createConnectionApi(fields) {
  const provider = normalizeGitProvider(fields.gitProvider);
  const caps = getProviderCaps(provider);
  let serverUrl = fields.serverUrl || '';
  if (!serverUrl && caps.defaultServerUrl) {
    serverUrl = caps.defaultServerUrl;
  }
  return createGitProvider({
    provider,
    token: fields.token || '',
    owner: fields.owner || '',
    repo: fields.repo || '',
    branch: fields.branch || 'main',
    serverUrl,
  });
}

/**
 * @param {string} gitProvider
 * @param {string} serverUrl
 * @returns {Promise<{ granted: boolean }>}
 */
export async function ensureProviderHostPermission(gitProvider, serverUrl) {
  const provider = normalizeGitProvider(gitProvider);
  const caps = getProviderCaps(provider);
  const effectiveUrl = serverUrl?.trim() || caps.defaultServerUrl || '';
  if (!needsRuntimeHostPermission(provider, effectiveUrl)) {
    return { granted: true };
  }
  const normalized = normalizeServerUrl(effectiveUrl);
  if (!normalized) {
    return { granted: false };
  }
  const result = await ensureHostPermissionForServerUrl(normalized);
  return { granted: result.granted };
}

/**
 * @typedef {Object} ConnectionFormFields
 * @property {string} token
 * @property {string} [owner]
 * @property {string} [repo]
 * @property {string} [branch]
 * @property {string} [gitProvider]
 * @property {string} [serverUrl]
 */

/**
 * @param {ConnectionFormFields} fields
 * @returns {boolean}
 */
export function isConnectionFormConfigured(fields) {
  const provider = normalizeGitProvider(fields.gitProvider);
  const caps = getProviderCaps(provider);
  const hasCore = !!(fields.token?.trim() && fields.owner?.trim() && fields.repo?.trim());
  if (caps.requireServerUrl) {
    const serverUrl = fields.serverUrl?.trim() || caps.defaultServerUrl || '';
    return !!(hasCore && serverUrl);
  }
  return hasCore;
}
