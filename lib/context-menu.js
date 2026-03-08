/**
 * Context Menu Module
 *
 * Registers right-click context menu items and handles click events.
 * Items: Add to Toolbar, Add to Other Bookmarks, Sync Now,
 *        Copy Favicon URL, Download Favicon, Switch Profile.
 */

// Use browser namespace if available (Firefox), fallback to chrome
const browserObj = typeof browser !== 'undefined' ? browser : chrome;

import { getMessage } from './i18n.js';
import { getRootFolderIdForRole } from './github-repos.js';
import { detectRootFolderRole, SYNC_ROLES } from './bookmark-serializer.js';
import { sync, getSettings, isConfigured, STORAGE_KEYS } from './sync-engine.js';
import { log as debugLog } from './debug-log.js';
import { getProfiles, getActiveProfileId, switchProfile } from './profile-manager.js';
import { LinkwardenAPI } from './linkwarden-api.js';

import { decryptToken } from './crypto.js';


const MENU_IDS = {
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

const CATEGORIES = {
  ADD: 'ADD',
  LINKWARDEN: 'LINKWARDEN',
  TOOLS: 'TOOLS',
  FAVICONS: 'FAVICONS',
};

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

const PROFILE_ID_PREFIX = 'gitsyncmarks-profile-';
const QUICK_FOLDER_ID_PREFIX = 'gitsyncmarks-quick-folder-';
const DYNAMIC_FOLDER_ID_PREFIX = 'gitsyncmarks-dynamic-folder-';
const OPEN_ALL_FOLDER_ID_PREFIX = 'gitsyncmarks-openall-folder-';
const DEFAULT_OPEN_ALL_CONFIRM_THRESHOLD = 15;
const OPEN_ALL_CONFIRM_WINDOW_MS = 15000;
const SEARCH_POPUP_WIDTH = 520;
const SEARCH_POPUP_HEIGHT = 640;
const LW_SAVE_POPUP_WIDTH = 500;
const LW_SAVE_POPUP_HEIGHT = 620;

let currentProfileMenuIds = [];
let currentQuickFolderMenuIds = [];
let currentDynamicFolderMenuIds = [];
let currentOpenAllFolderMenuIds = [];
const pendingOpenAllConfirm = new Map();
let bookmarkSearchWindowId = null;
let linkwardenSaveWindowId = null;

// Lock to prevent concurrent rebuilds
let isRefreshing = false;
let refreshPending = false;

/**
 * Simple debounce helper
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

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

  browserObj.contextMenus.removeAll(async () => {
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
  });
}

/**
 * Rebuild dynamic context-menu sections.
 * Uses a lockout to prevent concurrent overlapping rebuilds.
 */
export async function refreshContextMenuDynamicItems() {
  if (isRefreshing) {
    refreshPending = true;
    return;
  }

  isRefreshing = true;
  try {
    await Promise.all([
      refreshDynamicFolderMenu(),
      refreshQuickFolderMenuItems(),
      refreshOpenAllFolderMenuItems(),
      refreshProfileMenuItems(),
    ]);
  } catch (err) {
    console.warn('[GitSyncMarks] Failed to rebuild context menu:', err);
  } finally {
    isRefreshing = false;
    if (refreshPending) {
      refreshPending = false;
      refreshContextMenuDynamicItems();
    }
  }
}

/**
 * Debounced version for high-frequency events (like bookmarks).
 */
export const refreshContextMenuDynamicItemsDebounced = debounce(refreshContextMenuDynamicItems, 500);

/**
 * Rebuild the profile radio items under the Switch Profile submenu.
 * Call after profile CRUD (add/delete/rename/switch) and on install.
 */
export async function refreshProfileMenuItems() {
  for (const id of currentProfileMenuIds) {
    try { browserObj.contextMenus.remove(id); } catch { /* already gone */ }
  }
  currentProfileMenuIds = [];

  try {
    const [profiles, activeId] = await Promise.all([getProfiles(), getActiveProfileId()]);
    const entries = Object.entries(profiles);
    if (entries.length === 0) return;

    for (const [id, profile] of entries) {
      const menuId = PROFILE_ID_PREFIX + id;
      browserObj.contextMenus.create({
        id: menuId,
        parentId: MENU_IDS.SWITCH_PROFILE,
        title: profile.name || id,
        type: 'radio',
        checked: id === activeId,
        contexts: ['page', 'link'],
      });
      currentProfileMenuIds.push(menuId);
    }
  } catch (err) {
    console.warn('[GitSyncMarks] Failed to refresh profile menu:', err);
  }
}

async function refreshQuickFolderMenuItems() {
  for (const id of currentQuickFolderMenuIds) {
    try { browserObj.contextMenus.remove(id); } catch { /* already gone */ }
  }
  currentQuickFolderMenuIds = [];

  try {
    const [profiles, activeId, folderMap] = await Promise.all([
      getProfiles(),
      getActiveProfileId(),
      getBookmarkFolderMap(),
    ]);
    const quickFolderIds = Array.isArray(profiles?.[activeId]?.contextQuickFolderIds)
      ? profiles[activeId].contextQuickFolderIds.slice(0, 3)
      : [];
    const validFolders = quickFolderIds
      .map((id) => folderMap.get(id))
      .filter(Boolean);

    browserObj.contextMenus.update(MENU_IDS.SEP_QUICK, { visible: validFolders.length > 0 });

    for (const folder of validFolders) {
      const menuId = QUICK_FOLDER_ID_PREFIX + folder.id;
      browserObj.contextMenus.create({
        id: menuId,
        parentId: MENU_IDS.PARENT,
        title: getMessage('contextMenu_addToQuickFolder', [folder.pathLabel || folder.title]),
        contexts: ['page', 'link'],
      });
      currentQuickFolderMenuIds.push(menuId);
    }
  } catch (err) {
    console.warn('[GitSyncMarks] Failed to refresh quick-folder menu:', err);
    try { chrome.contextMenus.update(MENU_IDS.SEP_QUICK, { visible: false }); } catch { /* ignored */ }
  }
}

async function refreshDynamicFolderMenu() {
  for (const id of currentDynamicFolderMenuIds) {
    try { browserObj.contextMenus.remove(id); } catch { /* already gone */ }
  }
  currentDynamicFolderMenuIds = [];

  try {
    const tree = await chrome.bookmarks.getTree();
    const roots = Array.isArray(tree) ? tree : [];

    function buildMenuEntries(node, currentParentId) {
      if (!node || node.url) return;

      const children = Array.isArray(node.children) ? node.children : [];
      const folderChildren = children.filter(c => !c.url);

      // Skip the root node (id '0' in Chrome, 'root________' in Firefox) by checking for parentId
      if (node.parentId) {
        const title = node.title || '(untitled folder)';
        const menuId = DYNAMIC_FOLDER_ID_PREFIX + node.id;

        browserObj.contextMenus.create({
          id: menuId,
          parentId: currentParentId,
          title: title,
          contexts: ['page', 'link'],
        });
        currentDynamicFolderMenuIds.push(menuId);

        if (folderChildren.length > 0) {
          const addHereId = DYNAMIC_FOLDER_ID_PREFIX + 'addhere-' + node.id;
          browserObj.contextMenus.create({
            id: addHereId,
            parentId: menuId,
            title: getMessage('contextMenu_addToThisFolder'),
            contexts: ['page', 'link'],
          });
          currentDynamicFolderMenuIds.push(addHereId);

          const sepId = DYNAMIC_FOLDER_ID_PREFIX + 'sep-' + node.id;
          browserObj.contextMenus.create({
            id: sepId,
            parentId: menuId,
            type: 'separator',
            contexts: ['page', 'link'],
          });
          currentDynamicFolderMenuIds.push(sepId);
        }

        for (const child of folderChildren) {
          buildMenuEntries(child, menuId);
        }
      } else {
        // Root nodes
        for (const child of folderChildren) {
          const role = detectRootFolderRole(child);
          if (SYNC_ROLES.includes(role)) {
            buildMenuEntries(child, MENU_IDS.ADD_TO_FOLDER);
          }
        }
      }
    }

    for (const root of roots) {
      buildMenuEntries(root, MENU_IDS.ADD_TO_FOLDER);
    }
  } catch (err) {
    console.warn('[GitSyncMarks] Failed to refresh dynamic folder menu:', err);
  }
}

async function refreshOpenAllFolderMenuItems() {
  for (const id of currentOpenAllFolderMenuIds) {
    try { browserObj.contextMenus.remove(id); } catch { /* already gone */ }
  }
  currentOpenAllFolderMenuIds = [];

  try {
    const folders = await getBookmarkFoldersFlat();
    const limited = folders.slice(0, 30);
    for (const folder of limited) {
      const menuId = OPEN_ALL_FOLDER_ID_PREFIX + folder.id;
      chrome.contextMenus.create({
        id: menuId,
        parentId: MENU_IDS.OPEN_ALL_FOLDER,
        title: folder.pathLabel || folder.title,
        contexts: ['page', 'link'],
      });
      currentOpenAllFolderMenuIds.push(menuId);
    }
  } catch (err) {
    console.warn('[GitSyncMarks] Failed to refresh open-all menu:', err);
  }
}

/**
 * Handle context menu item clicks. Wire this to chrome.contextMenus.onClicked
 * at the top level of the service worker.
 */
export async function handleContextMenuClick(info, tab) {
  try {
    await debugLog(`context-menu: clicked item ${info.menuItemId}`);
    switch (info.menuItemId) {
      case MENU_IDS.ADD_TOOLBAR:
        await addBookmark('toolbar', info, tab);
        break;
      case MENU_IDS.ADD_OTHER:
        await addBookmark('other', info, tab);
        break;
      case MENU_IDS.SYNC_NOW:
        await doSyncNow();
        break;
      case MENU_IDS.SEARCH_BOOKMARKS:
        await openBookmarkSearch();
        break;
      case MENU_IDS.COPY_FAVICON:
        await copyFaviconUrl(tab);
        break;
      case MENU_IDS.DOWNLOAD_FAVICON:
        await downloadFavicon(tab);
        break;
      case MENU_IDS.LINKWARDEN_SAVE:
        await openLinkwardenSavePopup(info, tab);
        break;

      default:
        if (info.menuItemId.startsWith(PROFILE_ID_PREFIX)) {
          await doSwitchProfile(info.menuItemId.slice(PROFILE_ID_PREFIX.length));
        } else if (info.menuItemId.startsWith(QUICK_FOLDER_ID_PREFIX)) {
          await addBookmarkToFolder(info.menuItemId.slice(QUICK_FOLDER_ID_PREFIX.length), info, tab);
        } else if (info.menuItemId.startsWith(DYNAMIC_FOLDER_ID_PREFIX)) {
          let folderId = info.menuItemId.slice(DYNAMIC_FOLDER_ID_PREFIX.length);
          await debugLog(`context-menu: dynamic folder branch, raw suffix=${folderId}`);
          if (folderId.startsWith('sep-')) return;
          if (folderId.startsWith('addhere-')) {
            folderId = folderId.slice(8); // "addhere-".length
            await debugLog(`context-menu: it is an addhere item, resolved folderId=${folderId}`);
          }
          await addBookmarkToFolder(folderId, info, tab);
        } else if (info.menuItemId.startsWith(OPEN_ALL_FOLDER_ID_PREFIX)) {
          await openAllFromFolder(info.menuItemId.slice(OPEN_ALL_FOLDER_ID_PREFIX.length));
        }
        break;
    }
  } catch (err) {
    console.error('[GitSyncMarks] Context menu action failed:', err);
    await notify(getMessage('contextMenu_notifError'), false);
  }
}

// ---- Action handlers ----

async function saveToLinkwarden(info, tab, options = {}) {
  try {
    const globals = await browserObj.storage.sync.get({
      linkwardenEnabled: false,
      linkwardenUrl: '',
      linkwardenToken: '',
      linkwardenDefaultCollection: '',
      linkwardenDefaultTags: ''
    });

    if (!globals.linkwardenEnabled || !globals.linkwardenUrl || !globals.linkwardenToken) {
      await notify('Linkwarden not configured', false);
      return;
    }

    const token = await decryptToken(globals.linkwardenToken);
    const instanceUrl = globals.linkwardenUrl;
    let origin;
    try {
      origin = new URL(instanceUrl).origin + '/*';
    } catch {
      await notify('Linkwarden URL is invalid', false);
      return;
    }

    const hasPermission = await browserObj.permissions.contains({ origins: [origin] });
    if (!hasPermission) {
      await notify('Please grant permissions via "Test Connection" in Options', false);
      return;
    }

    const api = new LinkwardenAPI(instanceUrl, token);


    const url = info.linkUrl || info.pageUrl || tab?.url;
    if (!url) throw new Error('No URL found');

    let defaultTitle = info.selectionText || tab?.title || url;
    if (info.linkUrl && !info.selectionText) {
      try {
        const parsed = new URL(info.linkUrl);
        defaultTitle = parsed.hostname + parsed.pathname.replace(/\/$/, '');
      } catch {
        defaultTitle = info.linkUrl;
      }
    }

    const tags = globals.linkwardenDefaultTags ? globals.linkwardenDefaultTags.split(',').map(t => t.trim()) : [];

    // Save Link
    const linkRes = await api.saveLink({
      url,
      name: defaultTitle,
      collectionId: globals.linkwardenDefaultCollection || undefined,
      tags
    });

    if (!linkRes || (!linkRes.response && !linkRes.id)) {
      throw new Error('Failed to parse Linkwarden response');
    }

    const linkId = linkRes.response?.id || linkRes.id;

    if (options.withScreenshot && linkId) {
      // Chrome extension API for screenshot
      const dataUrl = await browserObj.tabs.captureVisibleTab(tab.windowId, { format: 'png' });

      // Convert data URL to Blob properly in Service Worker
      const base64Data = dataUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const decLen = binaryString.length;
      const bytes = new Uint8Array(decLen);
      for (let i = 0; i < decLen; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });

      await api.uploadScreenshot(linkId, blob);
      await notify('Link & Screenshot saved to Linkwarden', true);
    } else {
      await notify('Link saved to Linkwarden', true);
    }

  } catch (err) {
    console.error('[GitSyncMarks] Linkwarden save error:', err);
    await debugLog(`context-menu: Linkwarden error - ${err.message}`);
    await notify(`Linkwarden Error: ${err.message}`, false);
  }
}

async function addBookmark(role, info, tab) {

  const settings = await getSettings();
  if (!isConfigured(settings)) {
    await notify(getMessage('contextMenu_notifNotConfigured'), false);
    return;
  }

  const parentId = await getRootFolderIdForRole(role);
  if (!parentId) {
    await notify(getMessage('contextMenu_notifError'), false);
    return;
  }

  const url = info.linkUrl || tab.url;
  let title;
  if (info.linkUrl) {
    try {
      const parsed = new URL(info.linkUrl);
      title = parsed.hostname + parsed.pathname.replace(/\/$/, '');
    } catch {
      title = info.linkUrl;
    }
  } else {
    title = tab.title || url;
  }

  await chrome.bookmarks.create({ parentId, title, url });

  const folderLabel = role === 'toolbar'
    ? getMessage('contextMenu_addToToolbar')
    : getMessage('contextMenu_addToOther');
  await notify(getMessage('contextMenu_notifAdded', [folderLabel]), true);
}

async function addBookmarkToFolder(folderId, info, tab) {
  await debugLog(`context-menu: addBookmarkToFolder start, folderId=${folderId}`);
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    await notify(getMessage('contextMenu_notifNotConfigured'), false);
    return;
  }

  const folder = await getFolderById(folderId);
  if (!folder) {
    await notify(getMessage('contextMenu_notifFolderMissing'), false);
    await refreshContextMenuDynamicItems();
    return;
  }

  const url = info.linkUrl || info.pageUrl || tab?.url;
  if (!url) {
    await debugLog(`context-menu: failed to create bookmark, no URL found`);
    await notify(getMessage('contextMenu_notifError'), false);
    return;
  }

  let title = info.selectionText || tab?.title || url;
  if (info.linkUrl) {
    try {
      const parsed = new URL(info.linkUrl);
      title = parsed.hostname + parsed.pathname.replace(/\/$/, '');
    } catch {
      title = info.linkUrl;
    }
  }

  try {
    const created = await browserObj.bookmarks.create({ parentId: folderId, title, url });
    await debugLog(`context-menu: bookmark created in folder ${folderId}: ${created.id}`);
    console.log(`[GitSyncMarks] Bookmark created: ${created.id} in ${folderId}`);
    await notify(getMessage('contextMenu_notifAdded', [folder.title || folderId]), true);
  } catch (err) {
    console.error('[GitSyncMarks] Failed to create bookmark:', err);
    await debugLog(`context-menu: failed to create bookmark in folder ${folderId}: ${err.message}`);
    await notify(getMessage('contextMenu_notifError'), false);
  }
}

async function doSyncNow() {
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    await notify(getMessage('contextMenu_notifNotConfigured'), false);
    return;
  }

  const result = await sync();
  if (!result.success) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
  await notify(
    result.message || (result.success ? 'Sync complete' : 'Sync failed'),
    result.success
  );
}

async function doSwitchProfile(targetId) {
  const activeId = await getActiveProfileId();
  if (targetId === activeId) return;

  const profiles = await getProfiles();
  const targetProfile = profiles[targetId];
  if (!targetProfile) {
    await notify(getMessage('contextMenu_notifError'), false);
    return;
  }

  await switchProfile(targetId, { skipConfirm: true });
  await refreshProfileMenuItems();
  await notify(
    getMessage('contextMenu_notifProfileSwitched', [targetProfile.name || targetId]),
    true
  );
}

async function openBookmarkSearch() {
  const searchUrl = chrome.runtime.getURL('search.html');

  if (bookmarkSearchWindowId !== null) {
    try {
      const existing = await chrome.windows.get(bookmarkSearchWindowId, { populate: true });
      const existingTab = (existing.tabs || []).find((tab) => String(tab.url || '').startsWith(searchUrl));
      if (existingTab) {
        await chrome.windows.update(existing.id, { focused: true });
        if (existingTab.id) {
          await chrome.tabs.update(existingTab.id, { active: true });
        }
        return;
      }
    } catch {
      bookmarkSearchWindowId = null;
    }
  }

  try {
    const created = await chrome.windows.create({
      url: searchUrl,
      type: 'popup',
      width: SEARCH_POPUP_WIDTH,
      height: SEARCH_POPUP_HEIGHT,
      focused: true,
    });
    bookmarkSearchWindowId = created?.id ?? null;
  } catch {
    // Fallback for browsers/platforms without popup-window support.
    await chrome.tabs.create({ url: searchUrl });
  }
}

async function openLinkwardenSavePopup(info, tab) {
  const url = info.linkUrl || (tab && tab.url) || '';
  const title = tab?.title || '';
  const tabId = tab?.id || '';
  const windowId = tab?.windowId || '';
  const params = new URLSearchParams({ url, title, tabId, windowId });
  const popupUrl = chrome.runtime.getURL('linkwarden-save.html') + '?' + params.toString();

  if (linkwardenSaveWindowId !== null) {
    try {
      const existing = await chrome.windows.get(linkwardenSaveWindowId, { populate: true });
      const existingTab = (existing.tabs || []).find((t) => String(t.url || '').includes('linkwarden-save.html'));
      if (existingTab) {
        // Update existing popup with new URL
        await chrome.tabs.update(existingTab.id, { url: popupUrl, active: true });
        await chrome.windows.update(existing.id, { focused: true });
        return;
      }
    } catch {
      linkwardenSaveWindowId = null;
    }
  }

  try {
    const created = await chrome.windows.create({
      url: popupUrl,
      type: 'popup',
      width: LW_SAVE_POPUP_WIDTH,
      height: LW_SAVE_POPUP_HEIGHT,
      focused: true,
    });
    linkwardenSaveWindowId = created?.id ?? null;
  } catch {
    await chrome.tabs.create({ url: popupUrl });
  }
}

async function openAllFromFolder(folderId) {
  const folder = await getFolderById(folderId);
  if (!folder) {
    await notify(getMessage('contextMenu_notifFolderMissing'), false);
    await refreshContextMenuDynamicItems();
    return;
  }

  const nodes = await chrome.bookmarks.getSubTree(folderId);
  const urls = [];
  collectBookmarkUrls(nodes[0], urls);
  if (urls.length === 0) {
    await notify(getMessage('contextMenu_notifOpenAllEmpty'), false);
    return;
  }

  const { contextOpenAllThreshold = DEFAULT_OPEN_ALL_CONFIRM_THRESHOLD } =
    await chrome.storage.sync.get({ contextOpenAllThreshold: DEFAULT_OPEN_ALL_CONFIRM_THRESHOLD });
  const threshold = Number.isFinite(contextOpenAllThreshold)
    ? Math.max(1, parseInt(contextOpenAllThreshold, 10) || DEFAULT_OPEN_ALL_CONFIRM_THRESHOLD)
    : DEFAULT_OPEN_ALL_CONFIRM_THRESHOLD;

  const confirmKey = folderId;
  const expiry = pendingOpenAllConfirm.get(confirmKey) || 0;
  if (urls.length > threshold && expiry < Date.now()) {
    pendingOpenAllConfirm.set(confirmKey, Date.now() + OPEN_ALL_CONFIRM_WINDOW_MS);
    await notify(getMessage('contextMenu_notifOpenAllNeedsConfirm', [String(urls.length), String(threshold)]), false);
    return;
  }
  pendingOpenAllConfirm.delete(confirmKey);

  for (let i = 0; i < urls.length; i += 1) {
    const bookmarkUrl = urls[i];
    if (!bookmarkUrl) continue;
    try {
      await chrome.tabs.create({ url: bookmarkUrl, active: i === 0 });
    } catch {
      // Skip invalid or blocked URL entries.
    }
  }

  await notify(getMessage('contextMenu_notifOpenAllSuccess', [String(urls.length), folder.title || folderId]), true);
}

async function copyFaviconUrl(tab) {
  const faviconUrl = getFaviconUrl(tab);
  if (!faviconUrl) {
    await notify(getMessage('contextMenu_notifNoFavicon'), false);
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (url) => navigator.clipboard.writeText(url),
      args: [faviconUrl],
    });
    await notify(getMessage('contextMenu_notifFaviconCopied'), true);
  } catch (err) {
    console.warn('[GitSyncMarks] Clipboard write failed, falling back:', err);
    await notify(getMessage('contextMenu_notifError'), false);
  }
}

async function downloadFavicon(tab) {
  const faviconUrl = getFaviconUrl(tab);
  if (!faviconUrl) {
    await notify(getMessage('contextMenu_notifNoFavicon'), false);
    return;
  }

  try {
    const hostname = new URL(tab.url).hostname.replace(/\./g, '_');
    await chrome.downloads.download({
      url: faviconUrl,
      filename: `favicon_${hostname}.png`,
      saveAs: true,
    });
  } catch (err) {
    console.warn('[GitSyncMarks] Favicon download failed:', err);
    await notify(getMessage('contextMenu_notifError'), false);
  }
}

// ---- Helpers ----

function getFaviconUrl(tab) {
  if (tab.favIconUrl) return tab.favIconUrl;
  try {
    const domain = new URL(tab.url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

function collectBookmarkUrls(node, result) {
  if (!node) return;
  if (node.url) {
    result.push(node.url);
    return;
  }
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    collectBookmarkUrls(child, result);
  }
}

async function getFolderById(folderId) {
  if (!folderId) return null;
  try {
    const nodes = await chrome.bookmarks.get(folderId);
    return nodes?.find((node) => !node.url) || null;
  } catch {
    return null;
  }
}

async function getBookmarkFolderMap() {
  const folders = await getBookmarkFoldersFlat();
  const map = new Map();
  for (const folder of folders) {
    map.set(folder.id, folder);
  }
  return map;
}

async function getBookmarkFoldersFlat() {
  const tree = await chrome.bookmarks.getTree();
  const roots = Array.isArray(tree) ? tree : [];
  const result = [];
  for (const root of roots) {
    const rootChildren = Array.isArray(root.children) ? root.children : [];
    for (const child of rootChildren) {
      walkFolderTree(child, [], result);
    }
  }
  return result;
}

function walkFolderTree(node, parents, output) {
  if (!node || node.url) return;
  const title = node.title || '';
  const pathParts = [...parents, title].filter(Boolean);
  output.push({
    id: node.id,
    title: title || '(untitled folder)',
    pathLabel: pathParts.join(' / ') || '(untitled folder)',
  });
  const nextParents = [...parents, title];
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    walkFolderTree(child, nextParents, output);
  }
}

const NOTIFICATION_ID = 'gitsyncmarks-context';

async function notify(message, success) {
  try {
    const settings = await getSettings();
    const mode = settings[STORAGE_KEYS.NOTIFICATIONS_MODE] ?? 'all';
    if (mode === 'off') return;
    if (mode === 'errorsOnly' && success) return;

    await chrome.notifications.create(NOTIFICATION_ID, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128-plain.png'),
      title: success
        ? getMessage('notification_titleSuccess')
        : getMessage('notification_titleFailure'),
      message,
    });
  } catch (err) {
    console.warn('[GitSyncMarks] Context menu notification failed:', err);
  }
}
