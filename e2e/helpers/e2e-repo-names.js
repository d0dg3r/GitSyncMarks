/**
 * Ephemeral E2E repository naming.
 * Any name under E2E_REPO_PREFIX is safe to delete; stable fixtures (GitSyncMarks-test-sync) are not.
 */

const { randomUUID } = require('crypto');

/** Safe-delete prefix for all onboarding autoCreate / mismatch repos. */
const E2E_REPO_PREFIX = 'gitsyncmarks-e2e-';

/** @deprecated Use E2E_REPO_PREFIX — kept for callers that still import the old name. */
const E2E_BOOTSTRAP_REPO_PREFIX = E2E_REPO_PREFIX;

/**
 * @param {string} repoName
 * @returns {boolean}
 */
function isSafeE2eRepoName(repoName) {
  return typeof repoName === 'string' && repoName.startsWith(E2E_REPO_PREFIX);
}

/**
 * @param {string} scenario - e.g. bootstrap, autoseed, mismatch
 * @returns {string}
 */
function ephemeralRepoName(scenario = 'bootstrap') {
  const safeScenario = String(scenario || 'bootstrap').replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'bootstrap';
  return `${E2E_REPO_PREFIX}${safeScenario}-${randomUUID().slice(0, 8)}`;
}

module.exports = {
  E2E_REPO_PREFIX,
  E2E_BOOTSTRAP_REPO_PREFIX,
  isSafeE2eRepoName,
  ephemeralRepoName,
};
