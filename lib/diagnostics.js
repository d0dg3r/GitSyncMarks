/**
 * Plain-text diagnostics for bug reports. Built from the same status the popup shows.
 * Never contains tokens, owner or repository names; error texts go through the log redaction.
 */

import { redactSecrets } from './debug-log.js';

/**
 * @param {object} input
 * @param {string} input.version - Extension version
 * @param {string} input.browser - 'chrome' | 'firefox'
 * @param {object} input.status - Result of getStatus (see background.js)
 * @param {{createdAt: string, reason: string, fileCount: number}|null} input.localBackup
 * @param {Date} [input.now]
 * @returns {string}
 */
export function buildDiagnosticsText({ version, browser, status, localBackup, now = new Date() }) {
  const lines = [];
  const add = (label, value) => lines.push(`${label}: ${value ?? '-'}`);
  const ago = (iso) => (iso ? `${iso} (${Math.round((now - new Date(iso)) / 60000)} min ago)` : null);

  lines.push('GitSyncMarks diagnostics');
  add('Generated', now.toISOString());
  add('Extension', version);
  add('Browser', browser);
  add('Configured', status?.configured ? 'yes' : 'no');
  add('Provider', status?.gitProvider);
  add('Auto-sync', status?.autoSync ? 'on' : 'off');
  add('Last sync', ago(status?.lastSyncTime));
  add('Last change synced', ago(status?.lastSyncWithChangesTime));
  add('Conflict', status?.hasConflict ? `yes (${status.conflictReason || 'unknown'})` : 'no');
  add('Last error', status?.lastError ? redactSecrets(status.lastError) : null);
  add('Token expires', status?.tokenExpiresAt || null);
  add('Mirrors', status?.mirrorSummary ? `${status.mirrorSummary} ok` : 'none');
  // Numbered only: a mirror's label falls back to its repository name.
  (status?.mirrorStatuses || []).forEach((mirror, index) => {
    const state = mirror.paused ? 'paused' : mirror.lastError ? `error: ${redactSecrets(mirror.lastError)}` : 'ok';
    add(`  Mirror ${index + 1}`, state);
  });
  add('Local backup', localBackup ? `${localBackup.createdAt} (${localBackup.reason}, ${localBackup.fileCount} files)` : 'none');
  return lines.join('\n');
}
