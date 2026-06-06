/**
 * Backward-compatible re-export shim for GitHub API.
 * New code should import from ./git-provider.js.
 */

export { GitHubAPI, GitHubError } from './providers/github-api.js';
export {
  GiteaAPI,
  GitLabAPI,
  GitProviderError,
  GIT_PROVIDERS,
  createGitProvider,
  buildCommitUrl,
  normalizeServerUrl,
} from './git-provider.js';
