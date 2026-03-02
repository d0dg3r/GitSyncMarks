/**
 * Context Menu Module
 *
 * Registers right-click context menu items and handles click events.
 * Items: Add to Toolbar, Add to Other Bookmarks, Sync Now,
 *        Copy Favicon URL, Download Favicon, Switch Profile.
 */

import { getMessage } from './i18n.js';
import { getRootFolderIdForRole } from './github-repos.js';
import { sync, getSettings, isConfigured, STORAGE_KEYS } from './sync-engine.js';
import { getProfiles, getActiveProfileId, switchProfile } from './profile-manager.js';

const MENU_IDS = {
  PARENT: 'gitsyncmarks',
  ADD_TOOLBAR: 'gitsyncmarks-add-toolbar',
  ADD_OTHER: 'gitsyncmarks-add-other',
  SEP_QUICK: 'gitsyncmarks-sep-quick',
  SEP_1: 'gitsyncmarks-sep-1',
  SYNC_NOW: 'gitsyncmarks-sync-now',
  SEP_2: 'gitsyncmarks-sep-2',
  SEARCH_BOOKMARKS: 'gitsyncmarks-search-bookmarks',
  OPEN_ALL_FOLDER: 'gitsyncmarks-open-all-folder',
  SEP_25: 'gitsyncmarks-sep-25',
  COPY_FAVICON: 'gitsyncmarks-copy-favicon',
  DOWNLOAD_FAVICON: 'gitsyncmarks-download-favicon',
  SEP_3: 'gitsyncmarks-sep-3',
  SWITCH_PROFILE: 'gitsyncmarks-switch-profile',
};

const PROFILE_ID_PREFIX = 'gitsyncmarks-profile-';
const QUICK_FOLDER_ID_PREFIX = 'gitsyncmarks-quick-folder-';
const OPEN_ALL_FOLDER_ID_PREFIX = 'gitsyncmarks-openall-folder-';
const DEFAULT_OPEN_ALL_CONFIRM_THRESHOLD = 15;
const OPEN_ALL_CONFIRM_WINDOW_MS = 15000;
const SEARCH_POPUP_WIDTH = 520;
const SEARCH_POPUP_HEIGHT = 640;

let currentProfileMenuIds = [];
let currentQuickFolderMenuIds = [];
let currentOpenAllFolderMenuIds = [];
const pendingOpenAllConfirm = new Map();
let bookmarkSearchWindowId = null;

/**
 * Register all context menu items.
 * Call from chrome.runtime.onInstalled — items persist across SW restarts.
 */
export function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_IDS.PARENT,
      title: 'GitSyncMarks',
      contexts: ['page', 'link'],
    });

    chrome.contextMenus.create({
      id: MENU_IDS.ADD_TOOLBAR,
      parentId: MENU_IDS.PARENT,
      title: getMessage('contextMenu_addToToolbar'),
      contexts: ['page', 'link'],
    });

    chrome.contextMenus.create({
      id: MENU_IDS.ADD_OTHER,
      parentId: MENU_IDS.PARENT,
      title: getMessage('contextMenu_addToOther'),
      contexts: ['page', 'link'],
    });

    chrome.contextMenus.create({
      id: MENU_IDS.SEP_QUICK,
      parentId: MENU_IDS.PARENT,
      type: 'separator',
      contexts: ['page', 'link'],
      visible: false,
    });

    chrome.contextMenus.create({
      id: MENU_IDS.SEP_1,
      parentId: MENU_IDS.PARENT,
      type: 'separator',
      contexts: ['page', 'link'],
    });

    chrome.contextMenus.create({
      id: MENU_IDS.SYNC_NOW,
      parentId: MENU_IDS.PARENT,
      title: getMessage('contextMenu_syncNow'),
      contexts: ['page', 'link'],
    });

    chrome.contextMenus.create({
      id: MENU_IDS.SEP_2,
      parentId: MENU_IDS.PARENT,
      type: 'separator',
      contexts: ['page', 'link'],
    });

    chrome.contextMenus.create({
      id: MENU_IDS.SEARCH_BOOKMARKS,
      parentId: MENU_IDS.PARENT,
      title: getMessage('contextMenu_searchBookmarks'),
      contexts: ['page', 'link'],
    });

    chrome.contextMenus.create({
      id: MENU_IDS.OPEN_ALL_FOLDER,
      parentId: MENU_IDS.PARENT,
      title: getMessage('contextMenu_openAllFromFolder'),
      contexts: ['page', 'link'],
    });

    chrome.contextMenus.create({
      id: MENU_IDS.SEP_25,
      parentId: MENU_IDS.PARENT,
      type: 'separator',
      contexts: ['page', 'link'],
    });

    chrome.contextMenus.create({
      id: MENU_IDS.COPY_FAVICON,
      parentId: MENU_IDS.PARENT,
      title: getMessage('contextMenu_copyFaviconUrl'),
      contexts: ['page'],
    });

    chrome.contextMenus.create({
      id: MENU_IDS.DOWNLOAD_FAVICON,
      parentId: MENU_IDS.PARENT,
      title: getMessage('contextMenu_downloadFavicon'),
      contexts: ['page'],
    });

    chrome.contextMenus.create({
      id: MENU_IDS.SEP_3,
      parentId: MENU_IDS.PARENT,
      type: 'separator',
      contexts: ['page', 'link'],
    });

    chrome.contextMenus.create({
      id: MENU_IDS.SWITCH_PROFILE,
      parentId: MENU_IDS.PARENT,
      title: getMessage('contextMenu_switchProfile'),
      contexts: ['page', 'link'],
    });

    refreshContextMenuDynamicItems();
  });
}

/**
 * Rebuild dynamic context-menu sections.
 */
export async function refreshContextMenuDynamicItems() {
  await Promise.all([
    refreshQuickFolderMenuItems(),
    refreshOpenAllFolderMenuItems(),
    refreshProfileMenuItems(),
  ]);
}

/**
 * Rebuild the profile radio items under the Switch Profile submenu.
 * Call after profile CRUD (add/delete/rename/switch) and on install.
 */
export async function refreshProfileMenuItems() {
  for (const id of currentProfileMenuIds) {
    try { chrome.contextMenus.remove(id); } catch { /* already gone */ }
  }
  currentProfileMenuIds = [];

  try {
    const [profiles, activeId] = await Promise.all([getProfiles(), getActiveProfileId()]);
    const entries = Object.entries(profiles);
    if (entries.length === 0) return;

    for (const [id, profile] of entries) {
      const menuId = PROFILE_ID_PREFIX + id;
      chrome.contextMenus.create({
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
    try { chrome.contextMenus.remove(id); } catch { /* already gone */ }
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

    chrome.contextMenus.update(MENU_IDS.SEP_QUICK, { visible: validFolders.length > 0 });

    for (const folder of validFolders) {
      const menuId = QUICK_FOLDER_ID_PREFIX + folder.id;
      chrome.contextMenus.create({
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

async function refreshOpenAllFolderMenuItems() {
  for (const id of currentOpenAllFolderMenuIds) {
    try { chrome.contextMenus.remove(id); } catch { /* already gone */ }
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
      default:
        if (info.menuItemId.startsWith(PROFILE_ID_PREFIX)) {
          await doSwitchProfile(info.menuItemId.slice(PROFILE_ID_PREFIX.length));
        } else if (info.menuItemId.startsWith(QUICK_FOLDER_ID_PREFIX)) {
          await addBookmarkToFolder(info.menuItemId.slice(QUICK_FOLDER_ID_PREFIX.length), info, tab);
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

  await chrome.bookmarks.create({ parentId: folderId, title, url });
  await notify(getMessage('contextMenu_notifAdded', [folder.title || folderId]), true);
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
