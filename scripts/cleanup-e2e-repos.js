#!/usr/bin/env node
/**
 * Manually clean up orphaned gitsyncmarks-e2e-bootstrap-* repos.
 * Requires: GITSYNCMARKS_TEST_PAT or GITHUB_ADMIN_TOKEN,
 * optionally GITSYNCMARKS_TEST_REPO_OWNER
 *
 * Usage: node scripts/cleanup-e2e-repos.js
 *   or:  npm run cleanup:e2e-repos
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { cleanupAllOrphanedBootstrapRepos } = require('../e2e/helpers/e2e-repo-cleanup.js');

async function main() {
  const { deleted, failed, results } = await cleanupAllOrphanedBootstrapRepos();

  if (deleted > 0) {
    console.log(`Deleted ${deleted} orphaned bootstrap repo(s).`);
  }
  if (failed > 0) {
    const failedRepos = results.filter((r) => !r.result.success && !r.result.skipped);
    failedRepos.forEach((r) => {
      console.error(`Failed to delete ${r.repo}:`, r.result.message || r.result);
    });
    process.exit(1);
  }
  if (deleted === 0 && failed === 0) {
    console.log('No orphaned bootstrap repos found.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
