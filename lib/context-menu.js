/**
 * Context Menu – Barrel module
 *
 * Re-exports from focused sub-modules:
 * - context-menu-constants.js: IDs, categories, prefixes
 * - context-menu-setup.js: Static menu creation (onInstalled)
 * - context-menu-dynamic.js: Dynamic profile/folder menus
 * - context-menu-handlers.js: Click event dispatch
 */

// ---- Constants ----
export {
  browserObj,
  MENU_IDS,
  CATEGORIES,
  PROFILE_ID_PREFIX,
  QUICK_FOLDER_ID_PREFIX,
  DYNAMIC_FOLDER_ID_PREFIX,
  OPEN_ALL_FOLDER_ID_PREFIX,
  DEFAULT_OPEN_ALL_CONFIRM_THRESHOLD,
  OPEN_ALL_CONFIRM_WINDOW_MS,
  SEARCH_POPUP_WIDTH,
  SEARCH_POPUP_HEIGHT,
  LW_SAVE_POPUP_WIDTH,
  LW_SAVE_POPUP_HEIGHT,
  NOTIFICATION_ID,
} from './context-menu-constants.js';

// ---- Setup ----
export { setupContextMenus } from './context-menu-setup.js';

// ---- Dynamic ----
export {
  refreshContextMenuDynamicItems,
  refreshContextMenuDynamicItemsDebounced,
  refreshProfileMenuItems,
} from './context-menu-dynamic.js';

// ---- Handlers ----
export { handleContextMenuClick } from './context-menu-handlers.js';
