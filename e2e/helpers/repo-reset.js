/**
 * Reset the test repo to minimal bookmark structure before sync tests.
 * Uses git clone, replace bookmarks/, commit, force-push.
 *
 * Requires: GITSYNCMARKS_TEST_PAT, GITSYNCMARKS_TEST_REPO_OWNER, GITSYNCMARKS_TEST_REPO
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const os = require('os');

const BASE_PATH = 'bookmarks';

/** GitHub owner and repo name segments (no shell metacharacters). */
const SAFE_REPO_SEGMENT = /^[a-zA-Z0-9._-]+$/;

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
 * Run git without a shell (avoids CodeQL js/indirect-command-line-injection on env-derived strings).
 * @param {string | undefined} cwd
 * @param {string[]} args
 * @param {string} [label]
 * @returns {string}
 */
function gitExec(cwd, args, label = 'git') {
  try {
    return execFileSync('git', args, {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
  } catch (err) {
    const stdout = String(err?.stdout || '').trim();
    const stderr = String(err?.stderr || '').trim();
    const detail = [stdout, stderr].filter(Boolean).join('\n');
    throw new Error(
      `repo-reset git failed (${label}): ${args.join(' ')}${detail ? `\n${detail}` : ''}`
    );
  }
}

/**
 * @param {string} cloneDir
 * @returns {boolean}
 */
function hasStagedChanges(cloneDir) {
  try {
    execFileSync('git', ['diff', '--cached', '--quiet'], {
      cwd: cloneDir,
      stdio: 'pipe',
    });
    return false;
  } catch {
    return true;
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

  if (!SAFE_REPO_SEGMENT.test(owner) || !SAFE_REPO_SEGMENT.test(repo)) {
    throw new Error(
      'Invalid GITSYNCMARKS_TEST_REPO_OWNER or GITSYNCMARKS_TEST_REPO (use [a-zA-Z0-9._-]+ only)'
    );
  }

  const cloneDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitsyncmarks-reset-'));
  const url = `https://${token}@github.com/${owner}/${repo}.git`;

  try {
    gitExec(undefined, ['clone', '--depth', '1', url, cloneDir], 'clone');

    // Remove existing bookmarks, create minimal structure
    const bookmarksPath = path.join(cloneDir, BASE_PATH);
    if (fs.existsSync(bookmarksPath)) {
      fs.rmSync(bookmarksPath, { recursive: true });
    }
    createMinimalStructure(cloneDir);

    gitExec(cloneDir, ['add', '-A'], 'add');

    if (hasStagedChanges(cloneDir)) {
      gitExec(cloneDir, ['commit', '-m', 'E2E reset: minimal bookmark structure'], 'commit');
      gitExec(cloneDir, ['push', '--force', 'origin', 'main'], 'push');
    }

    fs.rmSync(cloneDir, { recursive: true, force: true });
  } catch (err) {
    if (fs.existsSync(cloneDir)) {
      fs.rmSync(cloneDir, { recursive: true, force: true });
    }
    throw err;
  }
}

module.exports = { resetTestRepo, createMinimalStructure };
