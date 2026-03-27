/**
 * Context Menu Setup
 * Creates the static context menu structure on extension install.
 */

import { getMessage } from './i18n.js';
import { browserObj, MENU_IDS, CATEGORIES } from './context-menu-constants.js';
import { refreshContextMenuDynamicItems } from './context-menu-dynamic.js';

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

/**
 * Register all context menu items.
 * Call from chrome.runtime.onInstalled — items persist across SW restarts.
 */
export function setupContextMenus() {
  const DEFAULT_ITEMS = [
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

  const DEFAULT_SUBMENUS = {
    [CATEGORIES.ADD]: true,
    [CATEGORIES.LINKWARDEN]: true,
    [CATEGORIES.TOOLS]: true,
    [CATEGORIES.FAVICONS]: true,
  };

  browserObj.contextMenus.removeAll(() => {
    (async () => {
      try {
        const {
          contextMenuItems = DEFAULT_ITEMS,
          contextMenuSubmenus = DEFAULT_SUBMENUS,
          linkwardenEnabled = false
        } = await browserObj.storage.sync.get({
          contextMenuItems: DEFAULT_ITEMS,
          contextMenuSubmenus: DEFAULT_SUBMENUS,
          linkwardenEnabled: false
        });

    // Ensure users migrating from old versions have new items injected
    const existingIds = new Set(contextMenuItems.map(i => i.id));
    for (const defItem of DEFAULT_ITEMS) {
      if (!existingIds.has(defItem.id)) {
        contextMenuItems.push(defItem);
        existingIds.add(defItem.id);
      }
    }

    browserObj.contextMenus.create({
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
        browserObj.contextMenus.create(createOptions);
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
        browserObj.contextMenus.create({
          id: `gitsyncmarks-sep-dyn-${item.id}`,
          parentId: MENU_IDS.PARENT,
          type: 'separator',
          contexts: ['page', 'link'],
        });
      }
      lastCategory = category;

      switch (item.id) {
        case 'ADD_TOOLBAR':
          browserObj.contextMenus.create({
            id: MENU_IDS.ADD_TOOLBAR,
            parentId: parentId,
            title: toolbarTitle,
            contexts: ['page', 'link'],
          });
          break;
        case 'ADD_OTHER':
          browserObj.contextMenus.create({
            id: MENU_IDS.ADD_OTHER,
            parentId: parentId,
            title: otherTitle,
            contexts: ['page', 'link'],
          });
          break;
        case 'ADD_TO_FOLDER':
          browserObj.contextMenus.create({
            id: MENU_IDS.ADD_TO_FOLDER,
            parentId: parentId,
            title: getMessage('contextMenu_addToFolderMenu'),
            contexts: ['page', 'link'],
          });
          break;
        case 'QUICK_FOLDERS':
          browserObj.contextMenus.create({
            id: MENU_IDS.SEP_QUICK,
            parentId: parentId,
            type: 'separator',
            contexts: ['page', 'link'],
            visible: false,
          });
          break;
        case 'LINKWARDEN_SAVE':
          browserObj.contextMenus.create({
            id: MENU_IDS.LINKWARDEN_SAVE,
            parentId: parentId,
            title: getMessage('contextMenu_saveToLinkwarden'),
            contexts: ['page', 'link'],
            visible: linkwardenEnabled,
          });
          break;

        case 'SYNC_NOW':
          browserObj.contextMenus.create({
            id: MENU_IDS.SYNC_NOW,
            parentId: parentId,
            title: getMessage('contextMenu_syncNow'),
            contexts: ['page', 'link'],
          });
          break;
        case 'SEARCH_BOOKMARKS':
          browserObj.contextMenus.create({
            id: MENU_IDS.SEARCH_BOOKMARKS,
            parentId: parentId,
            title: getMessage('contextMenu_searchBookmarks'),
            contexts: ['page', 'link'],
          });
          break;
        case 'OPEN_ALL_FOLDER':
          browserObj.contextMenus.create({
            id: MENU_IDS.OPEN_ALL_FOLDER,
            parentId: parentId,
            title: getMessage('contextMenu_openAllFromFolder'),
            contexts: ['page', 'link'],
          });
          break;
        case 'COPY_FAVICON':
          browserObj.contextMenus.create({
            id: MENU_IDS.COPY_FAVICON,
            parentId: parentId,
            title: getMessage('contextMenu_copyFaviconUrl'),
            contexts: ['page'],
          });
          break;
        case 'DOWNLOAD_FAVICON':
          browserObj.contextMenus.create({
            id: MENU_IDS.DOWNLOAD_FAVICON,
            parentId: parentId,
            title: getMessage('contextMenu_downloadFavicon'),
            contexts: ['page'],
          });
          break;
        case 'SWITCH_PROFILE':
          browserObj.contextMenus.create({
            id: MENU_IDS.SWITCH_PROFILE,
            parentId: parentId,
            title: getMessage('contextMenu_switchProfile'),
            contexts: ['page', 'link'],
          });
          break;
      }
    }

    refreshContextMenuDynamicItems();
      } catch (err) {
        console.error('[GitSyncMarks] setupContextMenus error:', err);
      }
    })();
  });
}
