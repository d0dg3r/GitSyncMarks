/**
 * Shared Git provider constants, capability map, and URL helpers (no provider class imports).
 */

export const GIT_PROVIDERS = {
  GITHUB: 'github',
  GITEA: 'gitea',
  FORGEJO: 'forgejo',
  CODEBERG: 'codeberg',
  GOGS: 'gogs',
  GITLAB: 'gitlab',
};

/** @typedef {keyof typeof PROVIDER_CAPS} GitProviderId */

/**
 * @typedef {'github'|'gitea'|'gitlab'} GitAdapterId
 * @typedef {'tree'|'contents'|'gitlab_commits'} GitWriteStrategy
 * @typedef {'optional'|'required'|'fixed'} GitSelfHostedMode
 */

/**
 * @typedef {Object} GitProviderCaps
 * @property {GitAdapterId} adapter
 * @property {string} apiPath
 * @property {string|null} defaultApiBase
 * @property {'Bearer'|'token'} authScheme
 * @property {GitSelfHostedMode} selfHosted
 * @property {boolean} requireServerUrl
 * @property {boolean} subgroups
 * @property {GitWriteStrategy} writeStrategy
 * @property {string} commitUrlInfix
 * @property {string|null} defaultWebBase
 * @property {string} repoFolderPrefix
 * @property {string} defaultServerUrl
 */

/** @type {Record<GitProviderId, GitProviderCaps>} */
const PROVIDER_CAPS = {
  github: {
    adapter: 'github',
    apiPath: '/api/v3',
    defaultApiBase: 'https://api.github.com',
    authScheme: 'Bearer',
    selfHosted: 'optional',
    requireServerUrl: false,
    subgroups: false,
    writeStrategy: 'tree',
    commitUrlInfix: '/commit/',
    defaultWebBase: 'https://github.com',
    repoFolderPrefix: 'GitHubRepos',
    defaultServerUrl: '',
  },
  gitea: {
    adapter: 'gitea',
    apiPath: '/api/v1',
    defaultApiBase: null,
    authScheme: 'token',
    selfHosted: 'required',
    requireServerUrl: true,
    subgroups: false,
    writeStrategy: 'contents',
    commitUrlInfix: '/commit/',
    defaultWebBase: null,
    repoFolderPrefix: 'GiteaRepos',
    defaultServerUrl: '',
  },
  forgejo: {
    adapter: 'gitea',
    apiPath: '/api/v1',
    defaultApiBase: null,
    authScheme: 'token',
    selfHosted: 'required',
    requireServerUrl: true,
    subgroups: false,
    writeStrategy: 'contents',
    commitUrlInfix: '/commit/',
    defaultWebBase: null,
    repoFolderPrefix: 'ForgejoRepos',
    defaultServerUrl: '',
  },
  codeberg: {
    adapter: 'gitea',
    apiPath: '/api/v1',
    defaultApiBase: 'https://codeberg.org/api/v1',
    authScheme: 'token',
    selfHosted: 'fixed',
    requireServerUrl: false,
    subgroups: false,
    writeStrategy: 'contents',
    commitUrlInfix: '/commit/',
    defaultWebBase: 'https://codeberg.org',
    repoFolderPrefix: 'CodebergRepos',
    defaultServerUrl: 'https://codeberg.org',
  },
  gogs: {
    adapter: 'gitea',
    apiPath: '/api/v1',
    defaultApiBase: null,
    authScheme: 'token',
    selfHosted: 'required',
    requireServerUrl: true,
    subgroups: false,
    writeStrategy: 'contents',
    commitUrlInfix: '/commit/',
    defaultWebBase: null,
    repoFolderPrefix: 'GogsRepos',
    defaultServerUrl: '',
  },
  gitlab: {
    adapter: 'gitlab',
    apiPath: '/api/v4',
    defaultApiBase: 'https://gitlab.com/api/v4',
    authScheme: 'Bearer',
    selfHosted: 'optional',
    requireServerUrl: false,
    subgroups: true,
    writeStrategy: 'gitlab_commits',
    commitUrlInfix: '/-/commit/',
    defaultWebBase: 'https://gitlab.com',
    repoFolderPrefix: 'GitLabRepos',
    defaultServerUrl: '',
  },
};

export const SUPPORTED_PROVIDER_IDS = Object.keys(PROVIDER_CAPS);

/**
 * @param {string} [providerId]
 * @returns {GitProviderCaps}
 */
export function getProviderCaps(providerId) {
  const id = String(providerId || GIT_PROVIDERS.GITHUB);
  return PROVIDER_CAPS[id] || PROVIDER_CAPS.github;
}

/**
 * @param {string} [providerId]
 * @returns {GitAdapterId}
 */
export function getAdapterId(providerId) {
  return getProviderCaps(providerId).adapter;
}

/**
 * @param {string} providerId
 * @returns {boolean}
 */
export function usesContentsApiReads(providerId) {
  return getProviderCaps(providerId).writeStrategy === 'contents';
}

/**
 * @param {string} providerId
 * @returns {boolean}
 */
export function usesContentsApiWriteFallback(providerId) {
  return getProviderCaps(providerId).writeStrategy === 'contents';
}

/**
 * Build a regex alternation of all provider repo-folder prefixes.
 * @returns {string}
 */
export function buildRepoFolderPrefixPattern() {
  const prefixes = [...new Set(SUPPORTED_PROVIDER_IDS.map((id) => getProviderCaps(id).repoFolderPrefix))];
  return prefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
}

/**
 * Shared error type for all Git providers. GitHubError extends this for backward compatibility.
 */
export class GitProviderError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {Error|null} [originalError]
   */
  constructor(message, statusCode, originalError = null) {
    if (originalError && originalError.stack) {
      super(`${message}\nCaused by: ${originalError.stack}`);
    } else {
      super(message);
    }
    this.name = 'GitProviderError';
    this.statusCode = statusCode;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GitProviderError);
    }
  }
}

/**
 * Normalize a user-entered server URL (strip trailing slashes and API path suffixes).
 * @param {string} url
 * @returns {string}
 */
export function normalizeServerUrl(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withScheme);
    let path = parsed.pathname.replace(/\/+$/, '');
    for (const suffix of ['/api/v4', '/api/v3', '/api/v1']) {
      if (path.endsWith(suffix)) {
        path = path.slice(0, -suffix.length);
        break;
      }
    }
    return `${parsed.protocol}//${parsed.host}${path}`.replace(/\/+$/, '');
  } catch {
    return trimmed
      .replace(/\/+$/, '')
      .replace(/\/api\/v[134]$/, '');
  }
}

/**
 * Effective web origin for a provider (user-entered server URL or default).
 * @param {string} providerId
 * @param {string} serverUrl
 * @returns {string}
 */
export function resolveEffectiveServerUrl(providerId, serverUrl) {
  const caps = getProviderCaps(providerId);
  const normalized = normalizeServerUrl(serverUrl);
  if (normalized) return normalized;
  return caps.defaultServerUrl || '';
}

/**
 * Resolve REST API base URL for a provider.
 * @param {string} provider
 * @param {string} serverUrl
 * @returns {string}
 */
export function resolveApiBase(provider, serverUrl) {
  const caps = getProviderCaps(provider);
  const normalized = resolveEffectiveServerUrl(provider, serverUrl);

  if (caps.defaultApiBase && !normalized) {
    return caps.defaultApiBase;
  }

  if (caps.adapter === 'gitea') {
    if (!normalized) {
      throw new GitProviderError(`${provider} server URL is required`, 400);
    }
    return `${normalized}${caps.apiPath}`;
  }

  if (caps.adapter === 'gitlab') {
    if (!normalized) {
      return caps.defaultApiBase || 'https://gitlab.com/api/v4';
    }
    return `${normalized}${caps.apiPath}`;
  }

  if (normalized) {
    return `${normalized}${caps.apiPath}`;
  }
  return caps.defaultApiBase || 'https://api.github.com';
}

/**
 * Resolve web UI base URL for commit links.
 * @param {string} provider
 * @param {string} serverUrl
 * @returns {string}
 */
export function resolveWebBaseUrl(provider, serverUrl) {
  const caps = getProviderCaps(provider);
  const normalized = resolveEffectiveServerUrl(provider, serverUrl);
  if (normalized) return normalized;
  return caps.defaultWebBase || 'https://github.com';
}

/**
 * Whether a provider needs a runtime host permission for the given server URL.
 * @param {string} providerId
 * @param {string} serverUrl
 * @returns {boolean}
 */
export function needsRuntimeHostPermission(providerId, serverUrl) {
  const caps = getProviderCaps(providerId);
  const normalized = normalizeServerUrl(serverUrl);
  if (!normalized) {
    return caps.selfHosted === 'required';
  }
  if (caps.selfHosted === 'fixed' && caps.defaultServerUrl) {
    const defaultOrigin = normalizeServerUrl(caps.defaultServerUrl);
    return normalized !== defaultOrigin;
  }
  if (caps.defaultWebBase) {
    const defaultOrigin = normalizeServerUrl(caps.defaultWebBase);
    if (normalized === defaultOrigin) return false;
  }
  return caps.selfHosted !== 'optional' || !!normalized;
}

/**
 * Build commit page URL for a repository commit.
 * @param {{ provider?: string, serverUrl?: string, owner: string, repo: string, commitSha: string }} params
 * @returns {string}
 */
export function buildCommitUrl({ provider = GIT_PROVIDERS.GITHUB, serverUrl = '', owner, repo, commitSha }) {
  const caps = getProviderCaps(provider);
  const webBase = resolveWebBaseUrl(provider, serverUrl).replace(/\/+$/, '');
  return `${webBase}/${owner}/${repo}${caps.commitUrlInfix}${commitSha}`;
}
