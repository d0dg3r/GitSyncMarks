/**
 * Playwright global teardown: Clean up orphaned gitsyncmarks-e2e-bootstrap-* repos
 * after all tests complete (including on failure).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { cleanupAllOrphanedBootstrapRepos } = require('./helpers/e2e-repo-cleanup.js');

module.exports = async function globalTeardown() {
  const { deleted, failed, results } = await cleanupAllOrphanedBootstrapRepos();

  if (deleted > 0 || failed > 0) {
    console.log(
      `[E2E cleanup] Deleted ${deleted} orphaned bootstrap repo(s), failed: ${failed}`
    );
    if (failed > 0 && results.length > 0) {
      const failedRepos = results.filter((r) => !r.result.success && !r.result.skipped);
      failedRepos.forEach((r) => {
        console.warn(`[E2E cleanup] Failed to delete ${r.repo}:`, r.result.message || r.result);
      });
    }
  } else {
    console.log('[E2E cleanup] No orphaned bootstrap repos found.');
  }
};
