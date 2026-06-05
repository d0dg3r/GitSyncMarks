/**
 * Git provider factory for GitHub, Gitea/Forgejo, etc.
 */

import { GitHubAPI, GitHubError } from './providers/github-api.js';
import { GiteaAPI } from './providers/gitea-api.js';
import {
  GIT_PROVIDERS,
  GitProviderError,
  normalizeServerUrl,
  resolveApiBase,
  resolveWebBaseUrl,
  buildCommitUrl,
} from './git-provider-common.js';

export {
  GIT_PROVIDERS,
  GitProviderError,
  normalizeServerUrl,
  resolveApiBase,
  resolveWebBaseUrl,
  buildCommitUrl,
};

/**
 * @typedef {Object} GitProviderOptions
 * @property {import('./git-provider-common.js').GitProviderId} [provider]
 * @property {string} token
 * @property {string} [owner]
 * @property {string} [repo]
 * @property {string} [branch]
 * @property {string} [serverUrl]
 */

/**
 * Create a Git provider client for the active profile settings.
 * @param {GitProviderOptions} options
 * @returns {GitHubAPI|GiteaAPI}
 */
export function createGitProvider(options) {
  const provider = options.provider || GIT_PROVIDERS.GITHUB;
  if (provider === GIT_PROVIDERS.GITEA) {
    return new GiteaAPI(options);
  }
  return new GitHubAPI(options);
}

export { GitHubAPI, GitHubError, GiteaAPI };
