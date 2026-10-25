import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GitHubAPI, REMOTE_MOVED_MESSAGE } from '../lib/providers/github-api.js';

/** GitHubAPI with the network calls replaced by recorders; `head` is the branch tip. */
function makeApi(head) {
  const api = new GitHubAPI('token', 'owner', 'repo', 'main');
  const calls = { updateRef: 0 };
  api.getLatestCommitSha = async () => head;
  api.getCommit = async (sha) => ({ sha, treeSha: `tree-of-${sha}` });
  api.buildLayeredTree = async () => 'new-tree';
  api.createCommit = async () => 'new-commit';
  api.updateRef = async () => { calls.updateRef += 1; };
  return { api, calls };
}

const changes = { 'bm/toolbar/a.json': '{"title":"a","url":"https://a.test/"}' };

describe('GitHubAPI.atomicCommit expectedParentSha guard', () => {
  it('refuses to commit when the branch moved since the changes were planned', async () => {
    const { api, calls } = makeApi('head-2');
    await assert.rejects(
      api.atomicCommit('msg', changes, undefined, { expectedParentSha: 'head-1' }),
      (err) => err.message === REMOTE_MOVED_MESSAGE && err.statusCode === 409
    );
    assert.equal(calls.updateRef, 0, 'no ref must be written when the head moved');
  });

  it('commits normally when the branch is still at the planned head', async () => {
    const { api, calls } = makeApi('head-1');
    const sha = await api.atomicCommit('msg', changes, undefined, { expectedParentSha: 'head-1' });
    assert.equal(sha, 'new-commit');
    assert.equal(calls.updateRef, 1);
  });

  it('keeps the legacy behaviour when no expectedParentSha is given', async () => {
    const { api, calls } = makeApi('head-2');
    const sha = await api.atomicCommit('msg', changes);
    assert.equal(sha, 'new-commit');
    assert.equal(calls.updateRef, 1);
  });
});
