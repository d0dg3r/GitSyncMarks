/**
 * E2E cleanup: Delete orphaned gitsyncmarks-e2e-* repos on configured hosts.
 * Used by connection.spec.js / onboarding-hosts.spec.js (per-test),
 * global-teardown (after all tests), and scripts/cleanup-e2e-repos.js (manual).
 */

const {
  E2E_REPO_PREFIX,
  E2E_BOOTSTRAP_REPO_PREFIX,
  isSafeE2eRepoName,
} = require('./e2e-repo-names.js');
const {
  getGithubHostConfig,
  getConfiguredHosts,
  deleteE2eRepoIfSafe: deleteOnHost,
  listOrphanedE2eRepos,
  cleanupAllOrphanedE2eRepos,
} = require('./git-host.js');

/**
 * Backward-compatible GitHub-only delete used by connection.spec.js.
 * Prefer deleteOnHost via git-host for dual-host specs.
 * @param {{ token: string, owner: string, repo: string }}
 */
async function deleteE2eRepoIfSafe({ token, owner, repo }) {
  const host = getGithubHostConfig() || {
    id: 'github',
    provider: 'github',
    token: token || '',
    owner: owner || '',
    repo: '',
    serverUrl: '',
  };
  if (token) host.token = token;
  if (owner) host.owner = owner;
  return deleteOnHost(host, { owner, repo });
}

async function listOrphanedBootstrapRepos() {
  const host = getGithubHostConfig();
  if (!host) return [];
  return listOrphanedE2eRepos(host);
}

async function cleanupAllOrphanedBootstrapRepos() {
  return cleanupAllOrphanedE2eRepos();
}

module.exports = {
  E2E_REPO_PREFIX,
  E2E_BOOTSTRAP_REPO_PREFIX,
  isSafeE2eRepoName,
  deleteE2eRepoIfSafe,
  listOrphanedBootstrapRepos,
  cleanupAllOrphanedBootstrapRepos,
  cleanupAllOrphanedE2eRepos,
  getConfiguredHosts,
};
