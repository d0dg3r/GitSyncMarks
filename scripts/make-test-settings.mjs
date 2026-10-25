#!/usr/bin/env node
/**
 * Build a settings file for manual tests: import it in each test browser
 * (Options → Files → Import, type "Settings") and both use the test repository.
 *
 * Reads GITSYNCMARKS_TEST_PAT, GITSYNCMARKS_TEST_REPO_OWNER, GITSYNCMARKS_TEST_REPO from .env.
 * Writes to build/test-settings/ (ignored by git), so the token never lands in the repository.
 *
 * Usage:
 *   node scripts/make-test-settings.mjs                    # plain JSON (token in clear text)
 *   node scripts/make-test-settings.mjs --password <pw>    # password-encrypted .enc
 *
 * The profile is set up for controlled testing: auto-sync off, debug log on, wizard skipped.
 * Importing replaces the profiles of that browser, so use dedicated test browser profiles.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { encryptWithPassword } from '../lib/crypto.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
dotenv.config({ path: join(root, '.env'), quiet: true });

const token = process.env.GITSYNCMARKS_TEST_PAT;
const owner = process.env.GITSYNCMARKS_TEST_REPO_OWNER;
const repo = process.env.GITSYNCMARKS_TEST_REPO;
if (!token || !owner || !repo) {
  console.error('Missing GITSYNCMARKS_TEST_PAT / GITSYNCMARKS_TEST_REPO_OWNER / GITSYNCMARKS_TEST_REPO in .env (see .env.example).');
  process.exit(1);
}

const passwordIndex = process.argv.indexOf('--password');
const password = passwordIndex > 0 ? process.argv[passwordIndex + 1] : '';
if (passwordIndex > 0 && !password) {
  console.error('--password needs a value.');
  process.exit(1);
}

const settings = {
  profiles: {
    test: {
      id: 'test',
      name: 'Test repo',
      gitProvider: 'github',
      serverUrl: '',
      owner,
      repo,
      branch: 'main',
      filePath: 'bookmarks',
      token,
    },
  },
  activeProfileId: 'test',
  // Controlled testing: sync only when you click, and log what every sync does.
  autoSync: false,
  syncOnFocus: false,
  syncOnStartup: false,
  debugLogEnabled: true,
  onboardingWizardCompleted: true,
};

const outDir = join(root, 'build', 'test-settings');
mkdirSync(outDir, { recursive: true });
const json = JSON.stringify(settings, null, 2);
const outFile = password
  ? join(outDir, 'gitsyncmarks-test-settings.enc')
  : join(outDir, 'gitsyncmarks-test-settings.json');
writeFileSync(outFile, password ? await encryptWithPassword(json, password) : json, { mode: 0o600 });

console.log(`Wrote ${outFile}`);
console.log(`Profile "Test repo" → github.com/${owner}/${repo} (branch main, path bookmarks)`);
console.log('Import: Options → Files → Import, type "Settings". Auto-sync is off, debug log is on.');
if (!password) console.log('Note: the file contains the token in clear text. Delete it after importing, or use --password.');
