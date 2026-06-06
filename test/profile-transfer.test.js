import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBasePath,
  rewriteFileMapPaths,
  filterGeneratedAndAuto,
  filterFileMapByFolderPrefix,
  mergeFileMapsIntoTarget,
  findDuplicateSlugFolderPairs,
} from '../lib/profile-transfer.js';

describe('profile-transfer helpers', () => {
  it('rewriteFileMapPaths rewrites base prefix', () => {
    const map = {
      'bookmarks/toolbar/a.json': '{"title":"a"}',
      'bookmarks/other/b.json': '{"title":"b"}',
    };
    const out = rewriteFileMapPaths(map, 'bookmarks', 'data/bookmarks');
    assert.equal(out['data/bookmarks/toolbar/a.json'], '{"title":"a"}');
    assert.equal(Object.keys(out).length, 2);
  });

  it('filterGeneratedAndAuto removes generated and auto folders', () => {
    const map = {
      'bookmarks/README.md': '# x',
      'bookmarks/toolbar/GitHubRepos (u)/x.json': '{}',
      'bookmarks/toolbar/a.json': '{"title":"a"}',
      'bookmarks/profiles/default/settings.enc': 'enc',
    };
    const out = filterGeneratedAndAuto(map);
    assert.deepEqual(Object.keys(out), ['bookmarks/toolbar/a.json']);
  });

  it('filterGeneratedAndAuto strips CodebergRepos and GitLabRepos folders', () => {
    const map = {
      'bookmarks/toolbar/CodebergRepos (alice)/x.json': '{}',
      'bookmarks/other/GitLabRepos (bob)/y.json': '{}',
      'bookmarks/toolbar/a.json': '{"title":"a"}',
    };
    const out = filterGeneratedAndAuto(map);
    assert.deepEqual(Object.keys(out), ['bookmarks/toolbar/a.json']);
  });

  it('filterFileMapByFolderPrefix keeps subtree only', () => {
    const map = {
      'bookmarks/toolbar/a.json': '1',
      'bookmarks/toolbar/work/b.json': '2',
      'bookmarks/other/c.json': '3',
    };
    const out = filterFileMapByFolderPrefix(map, 'bookmarks', 'toolbar/work');
    assert.deepEqual(Object.keys(out).sort(), ['bookmarks/toolbar/work/b.json']);
  });

  it('mergeFileMapsIntoTarget detects conflicts', () => {
    const target = { 'bookmarks/toolbar/a.json': '{"title":"old"}' };
    const source = { 'bookmarks/toolbar/a.json': '{"title":"new"}' };
    const { conflicts } = mergeFileMapsIntoTarget(target, source);
    assert.equal(conflicts.length, 1);
  });

  it('normalizeBasePath strips trailing slash', () => {
    assert.equal(normalizeBasePath('bookmarks/'), 'bookmarks');
  });

  it('findDuplicateSlugFolderPairs detects stem + -2 siblings', () => {
    const map = {
      'bookmarks/toolbar/bucher/a.json': '{}',
      'bookmarks/toolbar/bucher-2/b.json': '{}',
      'bookmarks/toolbar/development/c.json': '{}',
      'bookmarks/toolbar/development-2/d.json': '{}',
    };
    const pairs = findDuplicateSlugFolderPairs(map, 'bookmarks');
    assert.deepEqual(pairs, ['toolbar/bucher + bucher-2', 'toolbar/development + development-2']);
  });
});
