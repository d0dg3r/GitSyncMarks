/**
 * Git provider factory for GitHub, Gitea/Forgejo, Codeberg, Gogs, GitLab, etc.
 */

import { GitHubAPI, GitHubError } from './providers/github-api.js';
import { GiteaAPI } from './providers/gitea-api.js';
import { GitLabAPI } from './providers/gitlab-api.js';
import {
  GIT_PROVIDERS,
  GitProviderError,
  getAdapterId,
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
 * @property {string} [provider]
 * @property {string} token
 * @property {string} [owner]
 * @property {string} [repo]
 * @property {string} [branch]
 * @property {string} [serverUrl]
 */

/**
 * Create a Git provider client for the active profile settings.
 * @param {GitProviderOptions} options
 * @returns {GitHubAPI|GiteaAPI|GitLabAPI}
 */
export function createGitProvider(options) {
  const provider = options.provider || GIT_PROVIDERS.GITHUB;
  const adapter = getAdapterId(provider);
  if (adapter === 'gitea') {
    return new GiteaAPI({ ...options, provider });
  }
  if (adapter === 'gitlab') {
    return new GitLabAPI({ ...options, provider });
  }
  return new GitHubAPI({ ...options, provider });
}

export { GitHubAPI, GitHubError, GiteaAPI, GitLabAPI };
