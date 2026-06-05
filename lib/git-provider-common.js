/**
 * Shared Git provider constants and URL helpers (no provider class imports).
 */

export const GIT_PROVIDERS = {
  GITHUB: 'github',
  GITEA: 'gitea',
};

/** @typedef {'github'|'gitea'} GitProviderId */

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
 * Normalize a user-entered server URL (strip trailing slashes and /api/v1 suffix).
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
    if (path.endsWith('/api/v1')) {
      path = path.slice(0, -'/api/v1'.length);
    }
    return `${parsed.protocol}//${parsed.host}${path}`.replace(/\/+$/, '');
  } catch {
    return trimmed.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
  }
}

/**
 * Resolve REST API base URL for a provider.
 * @param {GitProviderId} provider
 * @param {string} serverUrl
 * @returns {string}
 */
export function resolveApiBase(provider, serverUrl) {
  if (provider === GIT_PROVIDERS.GITEA) {
    const base = normalizeServerUrl(serverUrl);
    if (!base) {
      throw new GitProviderError('Gitea server URL is required', 400);
    }
    return `${base}/api/v1`;
  }
  const normalized = normalizeServerUrl(serverUrl);
  if (normalized) {
    return `${normalized}/api/v3`;
  }
  return 'https://api.github.com';
}

/**
 * Resolve web UI base URL for commit links.
 * @param {GitProviderId} provider
 * @param {string} serverUrl
 * @returns {string}
 */
export function resolveWebBaseUrl(provider, serverUrl) {
  if (provider === GIT_PROVIDERS.GITEA) {
    return normalizeServerUrl(serverUrl);
  }
  const normalized = normalizeServerUrl(serverUrl);
  return normalized || 'https://github.com';
}

/**
 * Build commit page URL for a repository commit.
 * @param {{ provider?: GitProviderId, serverUrl?: string, owner: string, repo: string, commitSha: string }} params
 * @returns {string}
 */
export function buildCommitUrl({ provider = GIT_PROVIDERS.GITHUB, serverUrl = '', owner, repo, commitSha }) {
  const webBase = resolveWebBaseUrl(provider, serverUrl).replace(/\/+$/, '');
  return `${webBase}/${owner}/${repo}/commit/${commitSha}`;
}
