#!/usr/bin/env node
/**
 * Create the private test repository for GitSyncMarks E2E tests.
 *
 * Creates GitSyncMarks-test-sync as a private repo.
 * Optionally initializes with minimal bookmark structure.
 *
 * Requires: GITSYNCMARKS_TEST_PAT (GitHub PAT with repo scope)
 *
 * Usage: GITSYNCMARKS_TEST_PAT=ghp_xxx node scripts/create-test-repo.js
 */

const REPO_NAME = 'GitSyncMarks-test-sync';

async function createRepo(token) {
  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: REPO_NAME,
      private: true,
      description: 'Private test repo for GitSyncMarks E2E tests',
      auto_init: true,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    if (res.status === 422 && err.message?.includes('already exists')) {
      console.log(`Repo ${REPO_NAME} already exists. Nothing to do.`);
      return;
    }
    throw new Error(`Failed to create repo: ${res.status} ${JSON.stringify(err)}`);
  }

  const repo = await res.json();
  console.log(`Created private repo: ${repo.full_name}`);
  return repo;
}

async function main() {
  const token = process.env.GITSYNCMARKS_TEST_PAT;
  if (!token) {
    console.error(
      'Missing GITSYNCMARKS_TEST_PAT. Set it before running:\n' +
        '  GITSYNCMARKS_TEST_PAT=ghp_xxx node scripts/create-test-repo.js'
    );
    process.exit(1);
  }

  try {
    await createRepo(token);
    console.log('Done. Use this repo for E2E tests. Configure:');
    console.log(`  GITSYNCMARKS_TEST_REPO_OWNER=<your-username>`);
    console.log(`  GITSYNCMARKS_TEST_REPO=${REPO_NAME}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
