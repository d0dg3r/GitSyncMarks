import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseGitHubTokenExpiry } from '../lib/providers/github-api.js';

describe('parseGitHubTokenExpiry', () => {
  it('converts GitHub header format to an ISO timestamp', () => {
    assert.equal(parseGitHubTokenExpiry('2026-12-31 23:59:59 +0000'), '2026-12-31T23:59:59.000Z');
  });

  it('applies a non-UTC offset', () => {
    assert.equal(parseGitHubTokenExpiry('2026-06-01 12:00:00 +0200'), '2026-06-01T10:00:00.000Z');
  });

  it('returns null for missing or malformed values', () => {
    assert.equal(parseGitHubTokenExpiry(null), null);
    assert.equal(parseGitHubTokenExpiry(''), null);
    assert.equal(parseGitHubTokenExpiry('next tuesday'), null);
  });
});
