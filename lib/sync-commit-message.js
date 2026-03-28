/**
 * Parse GitSyncMarks-generated Git commit messages for display (e.g. Sync History).
 * Messages look like: "Bookmark sync from abcdef12 — 2026-03-28T11:41:13.220Z"
 * or "Generate files from … — …", "Bookmark merge from … — …", etc.
 */

const FROM_THEN_EM_DASH = /\sfrom\s+(.+?)\s+—\s/;

/**
 * @param {string} [message]
 * @returns {string} Client / device id segment, or empty string if not recognized
 */
export function extractClientIdFromCommitMessage(message) {
  if (!message || typeof message !== 'string') return '';
  const m = message.match(FROM_THEN_EM_DASH);
  if (m) return m[1].trim();
  return '';
}
