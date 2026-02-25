/**
 * E2E cleanup: Delete orphaned gitsyncmarks-e2e-bootstrap-* repos.
 * Used by connection.spec.js (per-test), global-teardown (after all tests),
 * and scripts/cleanup-e2e-repos.js (manual).
 */

const E2E_BOOTSTRAP_REPO_PREFIX = 'gitsyncmarks-e2e-bootstrap-';

function isSafeE2eRepoName(repoName) {
  return typeof repoName === 'string' && repoName.startsWith(E2E_BOOTSTRAP_REPO_PREFIX);
}

function getCleanupToken() {
  return process.env.GITSYNCMARKS_TEST_PAT || process.env.GITHUB_ADMIN_TOKEN || '';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientDeleteStatus(status) {
  return status === 429 || status >= 500;
}

/**
 * Delete a single E2E bootstrap repo if safe (name matches prefix).
 * @param {{ token: string, owner: string, repo: string }}
 * @returns {{ success?: boolean, skipped?: boolean, status?: number, attempts?: number, message?: string }}
 */
async function deleteE2eRepoIfSafe({ token, owner, repo }) {
  if (!token || !owner || !isSafeE2eRepoName(repo)) {
    return { skipped: true };
  }

  let lastStatus = null;
  let lastMessage = '';

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    lastStatus = response.status;

    if (response.status === 404 || response.status === 204) {
      return { success: true, status: response.status, attempts: attempt };
    }

    lastMessage = await response.text();
    if (!isTransientDeleteStatus(response.status) || attempt === 3) {
      return {
        success: false,
        status: response.status,
        attempts: attempt,
        message: lastMessage || `Unexpected delete response ${response.status}`,
      };
    }

    await sleep(300 * attempt);
  }

  return {
    success: false,
    status: lastStatus,
    attempts: 3,
    message: lastMessage || 'Delete retry budget exhausted',
  };
}

/**
 * List all repos for the authenticated user that match the E2E bootstrap prefix.
 * @returns {Promise<Array<{ name: string }>>}
 */
async function listOrphanedBootstrapRepos() {
  const token = getCleanupToken();
  if (!token) {
    return [];
  }

  const repos = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await fetch(
      `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=created&direction=desc`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!response.ok) {
      return repos;
    }

    const pageRepos = await response.json();
    const matching = pageRepos.filter((r) => isSafeE2eRepoName(r.name));
    repos.push(...matching);

    if (pageRepos.length < perPage) {
      break;
    }
    page += 1;
  }

  return repos;
}

/**
 * Get the owner (username) for the authenticated user.
 * @returns {Promise<string|null>}
 */
async function getAuthenticatedUser() {
  const token = getCleanupToken();
  const owner = process.env.GITSYNCMARKS_TEST_REPO_OWNER;
  if (owner) {
    return owner;
  }
  if (!token) {
    return null;
  }
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    return null;
  }
  const user = await response.json();
  return user.login || null;
}

/**
 * List all orphaned bootstrap repos and delete them.
 * @returns {Promise<{ deleted: number, failed: number, results: Array<{ repo: string, result: object }> }>}
 */
async function cleanupAllOrphanedBootstrapRepos() {
  const token = getCleanupToken();
  const owner = await getAuthenticatedUser();

  if (!token || !owner) {
    return { deleted: 0, failed: 0, results: [] };
  }

  const repos = await listOrphanedBootstrapRepos();
  const results = [];
  let deleted = 0;
  let failed = 0;

  for (const r of repos) {
    const result = await deleteE2eRepoIfSafe({ token, owner, repo: r.name });
    results.push({ repo: r.name, result });
    if (result.success) {
      deleted += 1;
    } else if (!result.skipped) {
      failed += 1;
    }
  }

  return { deleted, failed, results };
}

module.exports = {
  E2E_BOOTSTRAP_REPO_PREFIX,
  isSafeE2eRepoName,
  deleteE2eRepoIfSafe,
  listOrphanedBootstrapRepos,
  cleanupAllOrphanedBootstrapRepos,
};
