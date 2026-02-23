/**
 * Context Menu Module
 *
 * Registers right-click context menu items and handles click events.
 * Items: Add to Toolbar, Add to Other Bookmarks, Sync Now,
 *        Copy Favicon URL, Download Favicon.
 */

import { getMessage } from './i18n.js';
import { getRootFolderIdForRole } from './github-repos.js';
import { sync, getSettings, isConfigured, STORAGE_KEYS } from './sync-engine.js';

const MENU_IDS = {
  PARENT: 'gitsyncmarks',
  ADD_TOOLBAR: 'gitsyncmarks-add-toolbar',
  ADD_OTHER: 'gitsyncmarks-add-other',
  SEP_1: 'gitsyncmarks-sep-1',
  SYNC_NOW: 'gitsyncmarks-sync-now',
  SEP_2: 'gitsyncmarks-sep-2',
  COPY_FAVICON: 'gitsyncmarks-copy-favicon',
  DOWNLOAD_FAVICON: 'gitsyncmarks-download-favicon',
};

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
      contexts: ['page'],
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
  });
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
      case MENU_IDS.COPY_FAVICON:
        await copyFaviconUrl(tab);
        break;
      case MENU_IDS.DOWNLOAD_FAVICON:
        await downloadFavicon(tab);
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

const NOTIFICATION_ID = 'gitsyncmarks-context';

async function notify(message, success) {
  try {
    const settings = await getSettings();
    const mode = settings[STORAGE_KEYS.NOTIFICATIONS_MODE] ?? 'all';
    if (mode === 'off') return;
    if (mode === 'errorsOnly' && success) return;

    await chrome.notifications.create(NOTIFICATION_ID, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: success
        ? getMessage('notification_titleSuccess')
        : getMessage('notification_titleFailure'),
      message,
    });
  } catch (err) {
    console.warn('[GitSyncMarks] Context menu notification failed:', err);
  }
}
