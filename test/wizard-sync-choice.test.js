import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWizardSyncOptions,
  countBookmarksInTree,
  remoteHasBookmarkPayload,
  wizardSyncConfirmKey,
  wizardSyncModeLabelKey,
} from '../lib/wizard-sync-choice.js';

describe('buildWizardSyncOptions', () => {
  it('defaults to pull when remote has bookmarks and local is empty', () => {
    const opts = buildWizardSyncOptions('hasBookmarks', 0, 12);
    assert.equal(opts.defaultMode, 'pull');
    assert.deepEqual(opts.modes, ['pull', 'sync', 'push']);
  });

  it('defaults to sync when both sides have bookmarks', () => {
    const opts = buildWizardSyncOptions('hasBookmarks', 5, 12);
    assert.equal(opts.defaultMode, 'sync');
    assert.ok(opts.modes.includes('push'));
  });

  it('offers push when remote empty and local has bookmarks', () => {
    const opts = buildWizardSyncOptions('empty', 8, 0);
    assert.equal(opts.defaultMode, 'push');
    assert.deepEqual(opts.modes, ['push', 'skip']);
  });

  it('offers initialize when both empty', () => {
    const opts = buildWizardSyncOptions('empty', 0, 0);
    assert.equal(opts.defaultMode, 'initialize');
    assert.deepEqual(opts.modes, ['initialize', 'skip']);
  });

  it('defaults to skip when structure exists and local is empty', () => {
    const opts = buildWizardSyncOptions('structureReady', 0, 0);
    assert.equal(opts.defaultMode, 'skip');
    assert.deepEqual(opts.modes, ['skip']);
  });

  it('offers push when structure exists and local has bookmarks', () => {
    const opts = buildWizardSyncOptions('structureReady', 2, 0);
    assert.equal(opts.defaultMode, 'push');
    assert.deepEqual(opts.modes, ['push', 'skip']);
  });
});

describe('remoteHasBookmarkPayload', () => {
  it('is true for hasBookmarks status', () => {
    assert.equal(remoteHasBookmarkPayload('hasBookmarks', 0), true);
  });

  it('is true when remote count positive', () => {
    assert.equal(remoteHasBookmarkPayload('empty', 3), true);
  });
});

describe('wizardSyncConfirmKey', () => {
  it('uses danger key for push with remote bookmarks', () => {
    assert.equal(wizardSyncConfirmKey('push', 0, 10), 'options_onboardingWizardSyncConfirm_pushDanger');
  });

  it('uses pull overwrite when local has bookmarks', () => {
    assert.equal(wizardSyncConfirmKey('pull', 4, 10), 'options_onboardingWizardSyncConfirm_pullOverwriteLocal');
  });
});

describe('countBookmarksInTree', () => {
  it('counts url nodes recursively', () => {
    const count = countBookmarksInTree([
      { url: 'https://a.example' },
      { children: [{ url: 'https://b.example' }, { title: 'folder' }] },
    ]);
    assert.equal(count, 2);
  });
});

describe('wizardSyncModeLabelKey', () => {
  it('maps mode to i18n key', () => {
    assert.equal(wizardSyncModeLabelKey('pull'), 'options_onboardingWizardSyncMode_pull');
  });
});
