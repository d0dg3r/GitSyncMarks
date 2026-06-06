import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GIT_PROVIDERS,
  SUPPORTED_PROVIDER_IDS,
  buildCommitUrl,
  buildRepoFolderPrefixPattern,
  getAdapterId,
  getProviderCaps,
  resolveApiBase,
  resolveWebBaseUrl,
  usesContentsApiReads,
} from '../lib/git-provider-common.js';

describe('provider capability map', () => {
  it('lists six supported provider ids', () => {
    assert.deepEqual(SUPPORTED_PROVIDER_IDS.sort(), [
      'codeberg',
      'forgejo',
      'gitea',
      'github',
      'gitlab',
      'gogs',
    ]);
  });

  it('maps gitea-family providers to gitea adapter', () => {
    for (const id of ['gitea', 'forgejo', 'codeberg', 'gogs']) {
      assert.equal(getAdapterId(id), 'gitea');
      assert.equal(usesContentsApiReads(id), true);
    }
  });

  it('maps gitlab to gitlab adapter with subgroup support', () => {
    const caps = getProviderCaps('gitlab');
    assert.equal(getAdapterId('gitlab'), 'gitlab');
    assert.equal(caps.subgroups, true);
    assert.equal(caps.writeStrategy, 'gitlab_commits');
  });

  it('resolveApiBase for codeberg uses default host', () => {
    assert.equal(resolveApiBase('codeberg', ''), 'https://codeberg.org/api/v1');
    assert.equal(resolveWebBaseUrl('codeberg', ''), 'https://codeberg.org');
  });

  it('resolveApiBase for gitlab.com default', () => {
    assert.equal(resolveApiBase('gitlab', ''), 'https://gitlab.com/api/v4');
    assert.equal(resolveWebBaseUrl('gitlab', ''), 'https://gitlab.com');
  });

  it('resolveApiBase for self-managed gitlab', () => {
    assert.equal(
      resolveApiBase('gitlab', 'https://gitlab.example.com'),
      'https://gitlab.example.com/api/v4'
    );
  });

  it('buildCommitUrl uses gitlab infix', () => {
    const url = buildCommitUrl({
      provider: GIT_PROVIDERS.GITLAB,
      owner: 'group/sub',
      repo: 'project',
      commitSha: 'abc123',
    });
    assert.equal(url, 'https://gitlab.com/group/sub/project/-/commit/abc123');
  });

  it('buildRepoFolderPrefixPattern includes all provider folders', () => {
    const pattern = buildRepoFolderPrefixPattern();
    assert.match(pattern, /GitHubRepos/);
    assert.match(pattern, /CodebergRepos/);
    assert.match(pattern, /GitLabRepos/);
  });
});
