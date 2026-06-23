import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { checkPathSetup, validateSyncBasePath } from '../lib/onboarding.js';

describe('checkPathSetup', () => {
  it('maps null remote map to empty status', async () => {
    const result = await checkPathSetup({}, 'bookmarks', {
      fetchRemoteFileMapFn: async () => null,
    });
    assert.equal(result.status, 'empty');
  });

  it('returns structureReady when only minimal structure exists', async () => {
    const result = await checkPathSetup({}, 'bookmarks', {
      fetchRemoteFileMapFn: async () => ({
        commitSha: 'abc123',
        fileMap: {
          'bookmarks/_index.json': '{ "version": 2 }',
          'bookmarks/toolbar/_order.json': '[]',
          'bookmarks/other/_order.json': '[]',
        },
      }),
    });
    assert.equal(result.status, 'structureReady');
  });

  it('returns hasBookmarks when payload files exist', async () => {
    const result = await checkPathSetup({}, 'bookmarks', {
      fetchRemoteFileMapFn: async () => ({
        commitSha: 'abc123',
        fileMap: {
          'bookmarks/_index.json': '{ "version": 2 }',
          'bookmarks/toolbar/_order.json': '["example"]',
          'bookmarks/toolbar/example_1abc.json': '{"id":"x","title":"Example","url":"https://example.com"}',
        },
      }),
    });
    assert.equal(result.status, 'hasBookmarks');
  });
});

describe('validateSyncBasePath', () => {
  it('accepts folder paths', () => {
    const result = validateSyncBasePath('bookmarks/');
    assert.equal(result.valid, true);
    assert.equal(result.normalizedPath, 'bookmarks');
  });

  it('rejects empty paths', () => {
    const result = validateSyncBasePath('   ');
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'options_filePathInvalidEmpty');
  });

  it('rejects absolute paths', () => {
    const result = validateSyncBasePath('/bookmarks');
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'options_filePathInvalidAbsolute');
  });

  it('rejects file-like .json paths', () => {
    const result = validateSyncBasePath('bookmarks.json');
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'options_filePathInvalidJsonFile');
  });
});
