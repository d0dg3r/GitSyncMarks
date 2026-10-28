/**
 * Playwright global teardown: Clean up orphaned gitsyncmarks-e2e-* repos
 * on every configured host (GitHub + Forgejo) after all tests complete.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { cleanupAllOrphanedE2eRepos } = require('./helpers/e2e-repo-cleanup.js');

module.exports = async function globalTeardown() {
  const { deleted, failed, results, hosts } = await cleanupAllOrphanedE2eRepos();

  if (deleted > 0 || failed > 0) {
    console.log(
      `[E2E cleanup] hosts=${(hosts || []).join(',') || 'none'} deleted=${deleted} failed=${failed}`
    );
    if (failed > 0 && results.length > 0) {
      const failedRepos = results.filter((r) => !r.result.success && !r.result.skipped);
      failedRepos.forEach((r) => {
        console.warn(
          `[E2E cleanup] Failed to delete [${r.host}] ${r.repo}:`,
          r.result.message || r.result
        );
      });
    }
  } else {
    console.log('[E2E cleanup] No orphaned E2E repos found.');
  }
};
