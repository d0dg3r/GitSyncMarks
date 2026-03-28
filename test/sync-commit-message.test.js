import assert from 'node:assert';
import { describe, it } from 'node:test';
import { extractClientIdFromCommitMessage } from '../lib/sync-commit-message.js';

describe('sync-commit-message', () => {
  it('extracts 8-char id from bookmark sync', () => {
    const msg = 'Bookmark sync from 3a9b2ca8 — 2026-03-28T11:41:13.220Z';
    assert.strictEqual(extractClientIdFromCommitMessage(msg), '3a9b2ca8');
  });

  it('extracts id from push and merge variants', () => {
    assert.strictEqual(
      extractClientIdFromCommitMessage('Bookmark sync (push) from deadbeef — 2026-01-01T00:00:00.000Z'),
      'deadbeef'
    );
    assert.strictEqual(
      extractClientIdFromCommitMessage('Bookmark merge from a1b2c3d4 — 2026-01-01T00:00:00.000Z'),
      'a1b2c3d4'
    );
  });

  it('extracts generate-files and profile-switch forms', () => {
    assert.strictEqual(
      extractClientIdFromCommitMessage('Generate files from 12345678 — 2026-01-01T00:00:00.000Z'),
      '12345678'
    );
    assert.strictEqual(
      extractClientIdFromCommitMessage(
        'Bookmark sync (switch) from 550e8400-e29b-41d4-a716-446655440000 — 2026-01-01T00:00:00.000Z'
      ),
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('returns empty for unknown or empty input', () => {
    assert.strictEqual(extractClientIdFromCommitMessage(''), '');
    assert.strictEqual(extractClientIdFromCommitMessage('manual commit'), '');
    assert.strictEqual(extractClientIdFromCommitMessage(null), '');
  });
});
