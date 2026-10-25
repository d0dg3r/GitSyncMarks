import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDiagnosticsText } from '../lib/diagnostics.js';

const now = new Date('2026-10-25T12:00:00Z');

describe('buildDiagnosticsText', () => {
  it('summarises the state without tokens or repository names', () => {
    const text = buildDiagnosticsText({
      version: '3.0.9',
      browser: 'chrome',
      now,
      status: {
        configured: true,
        gitProvider: 'github',
        autoSync: true,
        lastSyncTime: '2026-10-25T11:50:00Z',
        hasConflict: false,
        repoOwner: 'alice',
        repoName: 'secret-repo',
        lastError: 'Request failed for token=ghp_abcdefghijklmnopqrstuvwx',
        mirrorStatuses: [{ id: 'm1', label: 'alice/secret-mirror', paused: false, lastError: null }],
        mirrorSummary: '1/1',
      },
      localBackup: null,
    });
    assert.match(text, /Extension: 3\.0\.9/);
    assert.match(text, /Last sync: 2026-10-25T11:50:00Z \(10 min ago\)/);
    assert.match(text, /Local backup: none/);
    assert.ok(!text.includes('alice'));
    assert.ok(!text.includes('secret-repo'));
    assert.ok(!text.includes('secret-mirror'), 'mirror labels can be repository names');
    assert.match(text, /Mirror 1: ok/);
    assert.ok(!text.includes('ghp_abcdef'));
    assert.match(text, /token=\[redacted\]/);
  });
});
