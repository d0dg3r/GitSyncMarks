import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  E2E_REPO_PREFIX,
  isSafeE2eRepoName,
  ephemeralRepoName,
} = require('../e2e/helpers/e2e-repo-names.js');

describe('e2e repo names', () => {
  it('uses a unified safe-delete prefix for all ephemeral scenarios', () => {
    assert.equal(E2E_REPO_PREFIX, 'gitsyncmarks-e2e-');
    assert.equal(isSafeE2eRepoName('gitsyncmarks-e2e-bootstrap-abc'), true);
    assert.equal(isSafeE2eRepoName('gitsyncmarks-e2e-autoseed-abc'), true);
    assert.equal(isSafeE2eRepoName('gitsyncmarks-e2e-mismatch-abc'), true);
    assert.equal(isSafeE2eRepoName('GitSyncMarks-test-sync'), false);
    assert.equal(isSafeE2eRepoName('my-bookmarks'), false);
  });

  it('builds random ephemeral names under the safe prefix', () => {
    const a = ephemeralRepoName('bootstrap');
    const b = ephemeralRepoName('autoseed');
    assert.match(a, /^gitsyncmarks-e2e-bootstrap-[a-f0-9]{8}$/);
    assert.match(b, /^gitsyncmarks-e2e-autoseed-[a-f0-9]{8}$/);
    assert.notEqual(a, b);
    assert.equal(isSafeE2eRepoName(a), true);
  });
});
