/**
 * "What's new" after extension update — storage key, per-version bullet copy, helpers.
 */

export const WHATS_NEW_STORAGE_KEY = 'showWhatsNewForVersion';

/** @type {Record<string, { bullets: string[] }>} */
const WHATS_NEW_BY_VERSION = {
  '2.8.0': {
    bullets: [
      'Reliable long syncs: large or slow syncs no longer get cut off with "Could not establish connection" — the background now stays alive until the sync finishes.',
      'Safer sync on large repos: GitSyncMarks now stops with a clear message instead of risking data loss when GitHub returns an incomplete file list.',
      'More resilient connection: automatic retry on network hiccups and GitHub rate limits.',
      'Fewer false conflicts: cosmetic differences (spacing, key order) no longer count as changes.',
      'Faster syncs: generated files (README, bookmarks.html, feed, Dashy) are only re-committed when their content really changed.',
      'Accessibility: keyboard navigation for settings tabs and search results, plus screen-reader announcements.',
    ],
  },
  '2.7.3': {
    bullets: [
      'Popup: after a successful sync, a stale “Failed to fetch” line no longer comes back when you reopen the toolbar menu (sync state cleanup).',
      'Maintenance: contributor documentation for optional Cursor MCP (Chrome / Firefox DevTools).',
    ],
  },
  '2.7.2': {
    bullets: [
      'Context menu: all items you enabled in Settings now show on right-click immediately — no need to toggle a switch to refresh the menu (service worker startup fix).',
      '“Add to folder” and other dynamic submenus: nested updates no longer break when the browser builds the menu in the background.',
      'Under the hood: more reliable options code layout and automated checks (typecheck, tests) for stability.',
    ],
  },
  '2.7.0': {
    bullets: [
      'Sync History: browse recent commits and restore any previous state.',
      'Diff preview before restore — see exactly what will change.',
      'Duplicate fix: same-name folders no longer multiply across syncs.',
      'UI density (S / M / L) and segmented theme controls in Settings.',
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
