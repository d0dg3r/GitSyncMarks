#!/usr/bin/env node
/**
 * List blob paths in the E2E / onboarding test repo (branch main) and verify GitSyncMarks layout.
 *
 * Requires: GITSYNCMARKS_TEST_PAT, GITSYNCMARKS_TEST_REPO_OWNER, GITSYNCMARKS_TEST_REPO
 *
 * Usage:
 *   GITSYNCMARKS_TEST_PAT=… GITSYNCMARKS_TEST_REPO_OWNER=… GITSYNCMARKS_TEST_REPO=… \
 *     node scripts/verify-test-repo.js [--verbose] [--base-path bookmarks] [--min-bookmarks N]
 *
 * Options:
 *   --verbose          Print every blob path (sorted)
 *   --base-path PATH   Bookmark root (default: bookmarks)
 *   --min-bookmarks N  Require at least N *.json files under …/toolbar/ (excluding _order.json)
 *
 * Exit 0 if checks pass; 1 if env missing, branch missing, tree truncated, required files missing, or min count not met.
 */

'use strict';

const API_BASE = 'https://api.github.com';

function getEnv() {
  const token = process.env.GITSYNCMARKS_TEST_PAT;
  const owner = process.env.GITSYNCMARKS_TEST_REPO_OWNER;
  const repo = process.env.GITSYNCMARKS_TEST_REPO;
  if (!token || !owner || !repo) {
    console.error(
      'Missing env: GITSYNCMARKS_TEST_PAT, GITSYNCMARKS_TEST_REPO_OWNER, GITSYNCMARKS_TEST_REPO\n' +
        'See e2e/README.md and .env.example'
    );
    process.exit(1);
  }
  return { token, owner, repo };
}

async function githubJson(owner, repo, path, token) {
  const url = `${API_BASE}/repos/${owner}/${repo}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (res.status === 404) {
    return { _status: 404, _body: await res.json().catch(() => ({})) };
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`GitHub API ${res.status}: ${body.message || res.statusText}`);
  }
  return res.json();
}

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const baseIdx = args.indexOf('--base-path');
  const basePath = baseIdx !== -1 && args[baseIdx + 1] ? args[baseIdx + 1].replace(/\/$/, '') : 'bookmarks';
  const minIdx = args.indexOf('--min-bookmarks');
  const minBookmarks =
    minIdx !== -1 ? parseInt(args[minIdx + 1], 10) : NaN;
  const requireMin = Number.isFinite(minBookmarks) && minBookmarks >= 0;

  const { token, owner, repo } = getEnv();

  const ref = await githubJson(owner, repo, '/git/ref/heads/main', token);
  if (ref._status === 404 || ref._status === 409) {
    console.error('Branch `main` not found (empty or uninitialized repo).');
    process.exit(1);
  }
  const commitSha = ref.object.sha;

  const commit = await githubJson(owner, repo, `/git/commits/${commitSha}`, token);
  const treeSha = commit.tree.sha;

  const tree = await githubJson(owner, repo, `/git/trees/${treeSha}?recursive=1`, token);
  if (tree.truncated) {
    console.error('Tree listing was truncated by GitHub; cannot verify full file set. Use a smaller repo or paginate.');
    process.exit(1);
  }

  const blobs = (tree.tree || []).filter((e) => e.type === 'blob');
  const paths = new Set(blobs.map((e) => e.path));

  const required = [
    `${basePath}/_index.json`,
    `${basePath}/toolbar/_order.json`,
    `${basePath}/other/_order.json`,
  ];
  const missing = required.filter((p) => !paths.has(p));

  const toolbarPrefix = `${basePath}/toolbar/`;
  const toolbarBookmarkJson = blobs.filter(
    (e) =>
      e.path.startsWith(toolbarPrefix) &&
      e.path.endsWith('.json') &&
      !e.path.endsWith('_order.json')
  );

  console.log(`Repository: ${owner}/${repo}`);
  console.log(`Branch: main @ ${commitSha.slice(0, 7)}`);
  console.log(`Blobs: ${blobs.length} (recursive tree)`);

  if (verbose) {
    console.log('\nPaths:');
    for (const p of [...paths].sort()) {
      console.log(`  ${p}`);
    }
    console.log('');
  }

  if (missing.length) {
    console.error('Missing required GitSyncMarks files:');
    for (const m of missing) console.error(`  - ${m}`);
    process.exit(1);
  }
  console.log('✓ Required structure: _index.json, toolbar/_order.json, other/_order.json');

  if (requireMin) {
    if (toolbarBookmarkJson.length < minBookmarks) {
      console.error(
        `Expected at least ${minBookmarks} bookmark JSON under ${toolbarPrefix} (excl. _order); found ${toolbarBookmarkJson.length}.`
      );
      process.exit(1);
    }
    console.log(`✓ Toolbar bookmarks: ${toolbarBookmarkJson.length} (minimum ${minBookmarks})`);
  } else {
    console.log(`  Toolbar bookmark JSON files (excl. _order): ${toolbarBookmarkJson.length}`);
  }

  console.log('\nOK — all checks passed.');
}

main().catch((err) => {
  console.error(err.message || String(err));
  process.exit(1);
});
