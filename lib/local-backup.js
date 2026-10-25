/**
 * Local backups of the browser's bookmark files, taken right before a sync or pull replaces
 * local bookmarks with remote content. Keeps the last few snapshots in chrome.storage.local,
 * so a bad remote state can be undone on this device without Git history.
 */

const BACKUP_KEY = 'localBackups';
/** Snapshots kept; older ones are dropped. */
export const MAX_LOCAL_BACKUPS = 3;

async function readBackups() {
  const stored = await chrome.storage.local.get({ [BACKUP_KEY]: [] });
  return Array.isArray(stored[BACKUP_KEY]) ? stored[BACKUP_KEY] : [];
}

/**
 * Store a snapshot of the local bookmark file map (newest first).
 * @param {Object<string, string>} files - Local file map (path → content)
 * @param {string} reason - Why the snapshot was taken (e.g. 'before-pull')
 */
export async function saveLocalBackup(files, reason) {
  const backups = await readBackups();
  const entry = { createdAt: new Date().toISOString(), reason, files };
  await chrome.storage.local.set({ [BACKUP_KEY]: [entry, ...backups].slice(0, MAX_LOCAL_BACKUPS) });
}

/**
 * Newest snapshot without its file contents (for UI).
 * @returns {Promise<{createdAt: string, reason: string, fileCount: number}|null>}
 */
export async function getLatestLocalBackupInfo() {
  const [latest] = await readBackups();
  if (!latest) return null;
  return { createdAt: latest.createdAt, reason: latest.reason, fileCount: Object.keys(latest.files || {}).length };
}

/**
 * Snapshot at the given position (0 = newest), including its file map.
 * @param {number} [index=0]
 * @returns {Promise<{createdAt: string, reason: string, files: Object<string, string>}|null>}
 */
export async function getLocalBackup(index = 0) {
  const backups = await readBackups();
  return backups[index] || null;
}
