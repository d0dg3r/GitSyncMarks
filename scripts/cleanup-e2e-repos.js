#!/usr/bin/env node
/**
 * Manually clean up orphaned gitsyncmarks-e2e-* repos on configured hosts
 * (GitHub and/or Forgejo). Never deletes GitSyncMarks-test-sync.
 *
 * Requires GitHub and/or Forgejo credentials from .env (see .env.example).
 *
 * Usage: node scripts/cleanup-e2e-repos.js
 *   or:  npm run cleanup:e2e-repos
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const {
  cleanupAllOrphanedE2eRepos,
} = require('../e2e/helpers/e2e-repo-cleanup.js');
const {
  getGithubHostConfig,
  getForgejoHostConfig,
} = require('../e2e/helpers/git-host.js');

async function main() {
  const hosts = [getGithubHostConfig(), getForgejoHostConfig()].filter((h) => h?.token);
  if (hosts.length === 0) {
    console.error(
      'No host credentials configured. Set GITSYNCMARKS_GITHUB_* and/or GITSYNCMARKS_FORGEJO_* in .env'
    );
    process.exit(1);
  }

  console.log(`Cleaning ephemeral E2E repos on: ${hosts.map((h) => h.id).join(', ')}`);
  const { deleted, failed, results } = await cleanupAllOrphanedE2eRepos();

  if (deleted > 0) {
    console.log(`Deleted ${deleted} orphaned E2E repo(s).`);
  }
  if (failed > 0) {
    const failedRepos = results.filter((r) => !r.result.success && !r.result.skipped);
    failedRepos.forEach((r) => {
      console.error(`Failed to delete [${r.host}] ${r.repo}:`, r.result.message || r.result);
    });
    process.exit(1);
  }
  if (deleted === 0 && failed === 0) {
    console.log('No orphaned E2E repos found.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
