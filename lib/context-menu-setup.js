/**
 * Context Menu Setup
 * Creates the static context menu structure on extension install.
 */

import { getMessage } from './i18n.js';
import { browserObj, MENU_IDS, CATEGORIES } from './context-menu-constants.js';
import {
  DEFAULT_CONTEXT_MENU_ITEMS,
  DEFAULT_CONTEXT_MENU_SUBMENUS,
  ensureContextMenuItemDefaults,
} from './context-menu-defaults.js';
import {
  contextMenuCreateAsync,
  refreshContextMenuDynamicItems,
  setStaticContextMenuReady,
} from './context-menu-dynamic.js';

/** Only one static+dynamic build at a time; concurrent callers coalesce to the in-flight run. */
let _setupContextMenusInFlight = null;

const ITEM_CATEGORY_MAP = {
  ADD_TOOLBAR: CATEGORIES.ADD,
  ADD_OTHER: CATEGORIES.ADD,
  ADD_TO_FOLDER: CATEGORIES.ADD,
  QUICK_FOLDERS: CATEGORIES.ADD,
  LINKWARDEN_SAVE: CATEGORIES.LINKWARDEN,
  SYNC_NOW: CATEGORIES.TOOLS,
  SEARCH_BOOKMARKS: CATEGORIES.TOOLS,
  OPEN_ALL_FOLDER: CATEGORIES.TOOLS,
  SWITCH_PROFILE: CATEGORIES.TOOLS,
  COPY_FAVICON: CATEGORIES.FAVICONS,
  DOWNLOAD_FAVICON: CATEGORIES.FAVICONS,
};

/** Chrome/Firefox `contextMenus.removeAll` is callback-based; align with `async/await` flow. */
function contextMenusRemoveAllAsync() {
  return new Promise((resolve) => {
    try {
      browserObj.contextMenus.removeAll(() => resolve());
    } catch {
      resolve();
    }
  });
}

/**
 * Register all context menu items.
 * Call from the background service worker on startup and on chrome.runtime.onInstalled
 * (MV3 SW restarts do not fire onInstalled; menu registration is not only at install time).
 * @returns {Promise<void>}
 */
export function setupContextMenus() {
  if (_setupContextMenusInFlight) {
    return _setupContextMenusInFlight;
  }
  const run = (async () => {
    try {
    setStaticContextMenuReady(false);
    await contextMenusRemoveAllAsync();
    const {
      contextMenuItems: rawItems = DEFAULT_CONTEXT_MENU_ITEMS,
      contextMenuSubmenus = DEFAULT_CONTEXT_MENU_SUBMENUS,
      linkwardenEnabled = false,
    } = await browserObj.storage.sync.get({
      contextMenuItems: DEFAULT_CONTEXT_MENU_ITEMS,
      contextMenuSubmenus: DEFAULT_CONTEXT_MENU_SUBMENUS,
      linkwardenEnabled: false,
    });
    const contextMenuItems = Array.isArray(rawItems) && rawItems.length
      ? rawItems
      : DEFAULT_CONTEXT_MENU_ITEMS.map((i) => ({ ...i }));
    // Ensure users migrating from old versions have new items injected
    ensureContextMenuItemDefaults(contextMenuItems);

    await contextMenuCreateAsync({
      id: MENU_IDS.PARENT,
      title: 'GitSyncMarks',
      contexts: ['page', 'link'],
    });

    const isFirefox = typeof browser !== 'undefined';
    const toolbarTitle = isFirefox
      ? getMessage('contextMenu_addToToolbar_firefox')
      : getMessage('contextMenu_addToToolbar_chrome');
    const otherTitle = isFirefox
      ? getMessage('contextMenu_addToOther_firefox')
      : getMessage('contextMenu_addToOther_chrome');

    // Create Category Submenus if enabled
    const categoryParentIds = {};
    for (const [catKey, catId] of Object.entries({
      [CATEGORIES.ADD]: MENU_IDS.CAT_ADD,
      [CATEGORIES.LINKWARDEN]: MENU_IDS.CAT_LINKWARDEN,
      [CATEGORIES.TOOLS]: MENU_IDS.CAT_TOOLS,
      [CATEGORIES.FAVICONS]: MENU_IDS.CAT_FAVICONS,
    })) {
      if (contextMenuSubmenus[catKey]) {
        const createOptions = {
          id: catId,
          parentId: MENU_IDS.PARENT,
          title: getMessage(`contextMenu_category_${catKey}`),
          contexts: ['page', 'link'],
        };
        if (catKey === CATEGORIES.LINKWARDEN) {
          createOptions.visible = linkwardenEnabled;
        }
        await contextMenuCreateAsync(createOptions);
        categoryParentIds[catKey] = catId;

      } else {
        categoryParentIds[catKey] = MENU_IDS.PARENT;
      }
    }

    let lastCategory = null;

    for (const item of contextMenuItems) {
      if (item.enabled === false) continue;

      const category = ITEM_CATEGORY_MAP[item.id];
      const parentId = categoryParentIds[category] || MENU_IDS.PARENT;

      // Add separator if transitioning between categories and NOT in submenus
      if (!contextMenuSubmenus[category] && lastCategory && lastCategory !== category) {
        await contextMenuCreateAsync({
          id: `gitsyncmarks-sep-dyn-${item.id}`,
          parentId: MENU_IDS.PARENT,
          type: 'separator',
          contexts: ['page', 'link'],
        });
      }
      lastCategory = category;

      switch (item.id) {
        case 'ADD_TOOLBAR':
          await contextMenuCreateAsync({
            id: MENU_IDS.ADD_TOOLBAR,
            parentId: parentId,
            title: toolbarTitle,
            contexts: ['page', 'link'],
          });
          break;
        case 'ADD_OTHER':
          await contextMenuCreateAsync({
            id: MENU_IDS.ADD_OTHER,
            parentId: parentId,
            title: otherTitle,
            contexts: ['page', 'link'],
          });
          break;
        case 'ADD_TO_FOLDER':
          await contextMenuCreateAsync({
            id: MENU_IDS.ADD_TO_FOLDER,
            parentId: parentId,
            title: getMessage('contextMenu_addToFolderMenu'),
            contexts: ['page', 'link'],
          });
          break;
        case 'QUICK_FOLDERS':
          await contextMenuCreateAsync({
            id: MENU_IDS.SEP_QUICK,
            parentId: parentId,
            type: 'separator',
            contexts: ['page', 'link'],
            visible: false,
          });
          break;
        case 'LINKWARDEN_SAVE':
          await contextMenuCreateAsync({
            id: MENU_IDS.LINKWARDEN_SAVE,
            parentId: parentId,
            title: getMessage('contextMenu_saveToLinkwarden'),
            contexts: ['page', 'link'],
            visible: linkwardenEnabled,
          });
          break;

        case 'SYNC_NOW':
          await contextMenuCreateAsync({
            id: MENU_IDS.SYNC_NOW,
            parentId: parentId,
            title: getMessage('contextMenu_syncNow'),
            contexts: ['page', 'link'],
          });
          break;
        case 'SEARCH_BOOKMARKS':
          await contextMenuCreateAsync({
            id: MENU_IDS.SEARCH_BOOKMARKS,
            parentId: parentId,
            title: getMessage('contextMenu_searchBookmarks'),
            contexts: ['page', 'link'],
          });
          break;
        case 'OPEN_ALL_FOLDER':
          await contextMenuCreateAsync({
            id: MENU_IDS.OPEN_ALL_FOLDER,
            parentId: parentId,
            title: getMessage('contextMenu_openAllFromFolder'),
            contexts: ['page', 'link'],
          });
          break;
        case 'COPY_FAVICON':
          await contextMenuCreateAsync({
            id: MENU_IDS.COPY_FAVICON,
            parentId: parentId,
            title: getMessage('contextMenu_copyFaviconUrl'),
            contexts: ['page'],
          });
          break;
        case 'DOWNLOAD_FAVICON':
          await contextMenuCreateAsync({
            id: MENU_IDS.DOWNLOAD_FAVICON,
            parentId: parentId,
            title: getMessage('contextMenu_downloadFavicon'),
            contexts: ['page'],
          });
          break;
        case 'SWITCH_PROFILE':
          await contextMenuCreateAsync({
            id: MENU_IDS.SWITCH_PROFILE,
            parentId: parentId,
            title: getMessage('contextMenu_switchProfile'),
            contexts: ['page', 'link'],
          });
          break;
      }
    }

    setStaticContextMenuReady(true);
    await refreshContextMenuDynamicItems();
  } catch (err) {
    setStaticContextMenuReady(false);
    console.error('[GitSyncMarks] setupContextMenus error:', err);
  }
  })();
  _setupContextMenusInFlight = run;
  return run.finally(() => {
    _setupContextMenusInFlight = null;
  });
}
