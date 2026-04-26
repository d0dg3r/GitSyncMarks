/**
 * Default context menu item list and submenu flags (chrome.storage.sync).
 * Single source: used by the background (context-menu-setup) and the options page.
 */

import { CATEGORIES } from './context-menu-constants.js';

export const DEFAULT_CONTEXT_MENU_ITEMS = [
  { id: 'ADD_TOOLBAR', enabled: true },
  { id: 'ADD_OTHER', enabled: true },
  { id: 'ADD_TO_FOLDER', enabled: true },
  { id: 'QUICK_FOLDERS', enabled: true },
  { id: 'LINKWARDEN_SAVE', enabled: true },
  { id: 'SYNC_NOW', enabled: true },
  { id: 'SEARCH_BOOKMARKS', enabled: true },
  { id: 'OPEN_ALL_FOLDER', enabled: true },
  { id: 'COPY_FAVICON', enabled: true },
  { id: 'DOWNLOAD_FAVICON', enabled: true },
  { id: 'SWITCH_PROFILE', enabled: true },
];

export const DEFAULT_CONTEXT_MENU_SUBMENUS = {
  [CATEGORIES.ADD]: true,
  [CATEGORIES.LINKWARDEN]: true,
  [CATEGORIES.TOOLS]: true,
  [CATEGORIES.FAVICONS]: true,
};

/**
 * Append any missing default item ids (e.g. after a version adds new menu ids).
 * Mutates the passed array in place (same as prior behavior in options + setup).
 * @param {{ id: string, enabled?: boolean }[]} contextMenuItems
 */
export function ensureContextMenuItemDefaults(contextMenuItems) {
  const existingIds = new Set(contextMenuItems.map((i) => i.id));
  for (const defItem of DEFAULT_CONTEXT_MENU_ITEMS) {
    if (!existingIds.has(defItem.id)) {
      contextMenuItems.push({ ...defItem });
      existingIds.add(defItem.id);
    }
  }
  return contextMenuItems;
}

/**
 * @param {{ id: string, enabled?: boolean }[]} contextMenuItems
 * @param {string} id
 * @returns {boolean}
 */
export function isContextMenuItemEnabled(contextMenuItems, id) {
  const item = contextMenuItems.find((i) => i.id === id);
  return item == null || item.enabled !== false;
}
