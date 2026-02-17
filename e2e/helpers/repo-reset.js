/**
 * Reset the test repo to minimal bookmark structure before sync tests.
 * Uses git clone, replace bookmarks/, commit, force-push.
 *
 * Requires: GITSYNCMARKS_TEST_PAT, GITSYNCMARKS_TEST_REPO_OWNER, GITSYNCMARKS_TEST_REPO
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const BASE_PATH = 'bookmarks';

function createMinimalStructure(dir) {
  const bookmarksDir = path.join(dir, BASE_PATH);
  fs.mkdirSync(bookmarksDir, { recursive: true });

  fs.writeFileSync(
    path.join(bookmarksDir, '_index.json'),
    JSON.stringify({ version: 2 }, null, 2)
  );
  for (const role of ['toolbar', 'other']) {
    const roleDir = path.join(bookmarksDir, role);
    fs.mkdirSync(roleDir, { recursive: true });
    fs.writeFileSync(
      path.join(roleDir, '_order.json'),
      JSON.stringify([], null, 2)
    );
  }
}

/**
 * Reset the test repo to minimal state. Clones, replaces bookmarks/, pushes.
 * @returns {Promise<void>}
 */
async function resetTestRepo() {
  const token = process.env.GITSYNCMARKS_TEST_PAT;
  const owner = process.env.GITSYNCMARKS_TEST_REPO_OWNER;
  const repo = process.env.GITSYNCMARKS_TEST_REPO;

  if (!token || !owner || !repo) {
    throw new Error(
      'Missing env: GITSYNCMARKS_TEST_PAT, GITSYNCMARKS_TEST_REPO_OWNER, GITSYNCMARKS_TEST_REPO'
    );
  }

  const cloneDir = path.join(os.tmpdir(), `gitsyncmarks-reset-${Date.now()}`);
  const url = `https://${token}@github.com/${owner}/${repo}.git`;

  try {
    execSync(`git clone --depth 1 ${url} ${cloneDir}`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    // Remove existing bookmarks, create minimal structure
    const bookmarksPath = path.join(cloneDir, BASE_PATH);
    if (fs.existsSync(bookmarksPath)) {
      fs.rmSync(bookmarksPath, { recursive: true });
    }
    createMinimalStructure(cloneDir);

    execSync('git add -A && git commit -m "E2E reset: minimal bookmark structure"', {
      cwd: cloneDir,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    execSync('git push --force origin main', {
      cwd: cloneDir,
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    fs.rmSync(cloneDir, { recursive: true, force: true });
  } catch (err) {
    if (fs.existsSync(cloneDir)) {
      fs.rmSync(cloneDir, { recursive: true, force: true });
    }
    throw err;
  }
}

module.exports = { resetTestRepo, createMinimalStructure };
