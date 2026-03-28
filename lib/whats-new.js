/**
 * "What's new" after extension update — storage key, per-version bullet copy, helpers.
 */

export const WHATS_NEW_STORAGE_KEY = 'showWhatsNewForVersion';

/** @type {Record<string, { bullets: string[] }>} */
const WHATS_NEW_BY_VERSION = {
  '2.7.0': {
    bullets: [
      'Backup: sync history, undo, diff preview before restore.',
      'Fewer duplicate folders — same-title folders merge on save/load.',
      'Options fixes (tabs, language list); tighter bookmark order in Git.',
      'CI: CodeQL v4, Node 24, lint + Playwright smoke on main.',
    ],
  },
};

/**
 * @param {string} version - manifest version string
 * @returns {{ bullets: string[] } | null}
 */
export function getWhatsNewContent(version) {
  return WHATS_NEW_BY_VERSION[version] ?? null;
}

/**
 * @param {string | null | undefined} pendingVersion - value from chrome.storage.local
 * @param {string} manifestVersion
 */
export function shouldDisplayWhatsNew(pendingVersion, manifestVersion) {
  return (
    typeof pendingVersion === 'string' &&
    pendingVersion.length > 0 &&
    pendingVersion === manifestVersion &&
    getWhatsNewContent(manifestVersion) !== null
  );
}

/**
 * @returns {Promise<string | null>}
 */
export async function getPendingWhatsNewVersion() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local?.get) return null;
  const data = await chrome.storage.local.get(WHATS_NEW_STORAGE_KEY);
  const v = data[WHATS_NEW_STORAGE_KEY];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export async function clearPendingWhatsNew() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local?.remove) return;
  await chrome.storage.local.remove(WHATS_NEW_STORAGE_KEY);
}
