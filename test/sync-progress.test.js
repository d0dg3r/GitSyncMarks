import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { formatSyncProgress } from '../lib/sync-progress.js';

describe('formatSyncProgress', () => {
  it('formats file push progress', () => {
    const text = formatSyncProgress({ phase: 'pushing', current: 3, total: 12 });
    assert.match(text, /3/);
    assert.match(text, /12/);
  });

  it('formats pull apply progress', () => {
    const text = formatSyncProgress({ phase: 'applying', current: 5, total: 20 });
    assert.match(text, /5/);
    assert.match(text, /20/);
  });

  it('shows generating message', () => {
    const text = formatSyncProgress({ phase: 'generating', current: 0, total: 0 });
    assert.ok(text.length > 0);
  });

  it('shows fetching message without counts', () => {
    const text = formatSyncProgress({ phase: 'fetching', current: 0, total: 0 });
    assert.ok(text.length > 0);
    assert.doesNotMatch(text, /\/\s*0/);
  });

  it('falls back to syncing when phase has no counts', () => {
    const text = formatSyncProgress({ phase: 'loading', current: 0, total: 0 });
    assert.ok(text.length > 0);
  });
});
