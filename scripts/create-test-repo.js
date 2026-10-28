#!/usr/bin/env node
/**
 * Create the private stable fixture repository for GitSyncMarks E2E tests.
 *
 * Creates GitSyncMarks-test-sync (private, auto_init) on GitHub and/or Forgejo.
 *
 * Usage:
 *   node scripts/create-test-repo.js --host=github
 *   node scripts/create-test-repo.js --host=forgejo
 *   node scripts/create-test-repo.js --host=all
 *
 * Env:
 *   GitHub:  GITSYNCMARKS_GITHUB_PAT, optional GITSYNCMARKS_GITHUB_OWNER
 *   Forgejo: GITSYNCMARKS_FORGEJO_TOKEN, GITSYNCMARKS_FORGEJO_OWNER,
 *            GITSYNCMARKS_FORGEJO_SERVER_URL (default https://forgejo.lan)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const {
  STABLE_FIXTURE_REPO,
  getGithubHostConfig,
  getForgejoHostConfig,
  createFixtureRepo,
} = require('../e2e/helpers/git-host.js');

function parseHostArg(argv) {
  const raw = argv.find((a) => a.startsWith('--host='))?.slice('--host='.length)
    || (argv.includes('--host') ? argv[argv.indexOf('--host') + 1] : null)
    || 'github';
  const host = String(raw).toLowerCase();
  if (!['github', 'forgejo', 'all'].includes(host)) {
    throw new Error(`Unknown --host=${raw}. Use github, forgejo, or all.`);
  }
  return host;
}

async function createForHost(label, host) {
  if (!host) {
    console.error(`Skipping ${label}: credentials incomplete.`);
    return false;
  }
  const result = await createFixtureRepo(host, STABLE_FIXTURE_REPO);
  if (result.alreadyExists) {
    console.log(`[${label}] Repo ${result.fullName} already exists. Nothing to do.`);
  } else {
    console.log(`[${label}] Created private repo: ${result.fullName}`);
  }
  return true;
}

async function main() {
  const which = parseHostArg(process.argv.slice(2));
  let ok = true;

  if (which === 'github' || which === 'all') {
    const host = getGithubHostConfig();
    if (!host?.token) {
      console.error(
        'Missing GITSYNCMARKS_GITHUB_PAT for GitHub.\n' +
          '  GITSYNCMARKS_GITHUB_PAT=ghp_xxx node scripts/create-test-repo.js --host=github'
      );
      ok = false;
    } else if (!(await createForHost('github', host))) {
      ok = false;
    } else {
      console.log('  Configure: GITSYNCMARKS_GITHUB_OWNER=<user> GITSYNCMARKS_GITHUB_REPO=' + STABLE_FIXTURE_REPO);
    }
  }

  if (which === 'forgejo' || which === 'all') {
    const host = getForgejoHostConfig();
    if (!host) {
      console.error(
        'Missing Forgejo env. Set:\n' +
          '  GITSYNCMARKS_FORGEJO_TOKEN=\n' +
          '  GITSYNCMARKS_FORGEJO_OWNER=\n' +
          '  GITSYNCMARKS_FORGEJO_SERVER_URL=https://forgejo.lan\n' +
          '  GITSYNCMARKS_FORGEJO_REPO=' + STABLE_FIXTURE_REPO
      );
      ok = false;
    } else if (!(await createForHost('forgejo', host))) {
      ok = false;
    } else {
      console.log(
        `  Configure: GITSYNCMARKS_FORGEJO_* (SERVER_URL=${host.serverUrl}, REPO=${STABLE_FIXTURE_REPO})`
      );
    }
  }

  if (!ok) process.exit(1);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
