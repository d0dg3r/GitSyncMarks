/**
 * Context Menu Constants
 * Shared identifiers, category mappings, and configuration constants.
 */

// Use browser namespace if available (Firefox), fallback to chrome
export const browserObj = typeof browser !== 'undefined' ? browser : chrome;

export const MENU_IDS = {
  PARENT: 'gitsyncmarks',
  CAT_ADD: 'gitsyncmarks-cat-add',
  CAT_LINKWARDEN: 'gitsyncmarks-cat-linkwarden',
  CAT_TOOLS: 'gitsyncmarks-cat-tools',
  CAT_FAVICONS: 'gitsyncmarks-cat-favicons',
  ADD_TOOLBAR: 'gitsyncmarks-add-toolbar',
  ADD_OTHER: 'gitsyncmarks-add-other',
  ADD_TO_FOLDER: 'gitsyncmarks-add-to-folder-menu',
  SEP_QUICK: 'gitsyncmarks-sep-quick',
  SYNC_NOW: 'gitsyncmarks-sync-now',
  SEARCH_BOOKMARKS: 'gitsyncmarks-search-bookmarks',
  OPEN_ALL_FOLDER: 'gitsyncmarks-open-all-folder',
  LINKWARDEN_SAVE: 'gitsyncmarks-linkwarden-save',
  COPY_FAVICON: 'gitsyncmarks-copy-favicon',
  DOWNLOAD_FAVICON: 'gitsyncmarks-download-favicon',
  SWITCH_PROFILE: 'gitsyncmarks-switch-profile',
};

export const CATEGORIES = {
  ADD: 'ADD',
  LINKWARDEN: 'LINKWARDEN',
  TOOLS: 'TOOLS',
  FAVICONS: 'FAVICONS',
};


export const PROFILE_ID_PREFIX = 'gitsyncmarks-profile-';
export const QUICK_FOLDER_ID_PREFIX = 'gitsyncmarks-quick-folder-';
export const DYNAMIC_FOLDER_ID_PREFIX = 'gitsyncmarks-dynamic-folder-';
export const OPEN_ALL_FOLDER_ID_PREFIX = 'gitsyncmarks-openall-folder-';
export const DEFAULT_OPEN_ALL_CONFIRM_THRESHOLD = 15;
export const OPEN_ALL_CONFIRM_WINDOW_MS = 15000;
export const SEARCH_POPUP_WIDTH = 520;
export const SEARCH_POPUP_HEIGHT = 640;
export const LW_SAVE_POPUP_WIDTH = 500;
export const LW_SAVE_POPUP_HEIGHT = 620;
export const NOTIFICATION_ID = 'gitsyncmarks-context';
