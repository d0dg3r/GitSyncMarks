/**
 * Context Menu Handlers
 * Click event handling for all context menu actions.
 */

import { getMessage } from './i18n.js';
import { getRootFolderIdForRole } from './github-repos.js';
import { sync, getSettings, isConfigured, STORAGE_KEYS } from './sync-engine.js';
import { log as debugLog } from './debug-log.js';
import { getProfiles, getActiveProfileId, switchProfile } from './profile-manager.js';
import { LinkwardenAPI } from './linkwarden-api.js';
import { decryptToken } from './crypto.js';
import {
  browserObj,
  MENU_IDS,
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
import {
  refreshContextMenuDynamicItems,
  refreshProfileMenuItems,
} from './context-menu-dynamic.js';

const pendingOpenAllConfirm = new Map();
let bookmarkSearchWindowId = null;
let linkwardenSaveWindowId = null;

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
      await notify(getMessage('contextMenu_notifLinkwardenNotConfigured'), false);
      return;
    }

    const token = await decryptToken(globals.linkwardenToken);
    const instanceUrl = globals.linkwardenUrl;
    let origin;
    try {
      origin = new URL(instanceUrl).origin + '/*';
    } catch {
      await notify(getMessage('contextMenu_notifLinkwardenUrlInvalid'), false);
      return;
    }

    const hasPermission = await browserObj.permissions.contains({ origins: [origin] });
    if (!hasPermission) {
      await notify(getMessage('contextMenu_notifLinkwardenGrantPermissions'), false);
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
      await notify(getMessage('contextMenu_notifLinkwardenSavedWithScreenshot'), true);
    } else {
      await notify(getMessage('contextMenu_notifLinkwardenSaved'), true);
    }

  } catch (err) {
    console.error('[GitSyncMarks] Linkwarden save error:', err);
    await debugLog(`context-menu: Linkwarden error - ${err.message}`);
    await notify(getMessage('contextMenu_notifLinkwardenError', [err.message]), false);
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
    chrome.action.setBadgeBackgroundColor({ color: '#FF9800' }); // Orange
    chrome.action.setTitle({ title: `Sync Error: ${result.message || 'Unknown'}` });
  } else {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'GitSyncMarks' });
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
