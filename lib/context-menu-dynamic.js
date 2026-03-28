/**
 * Context Menu Dynamic Items
 * Manages dynamic context menu sections: profiles, quick folders,
 * folder tree, and open-all-from-folder submenus.
 */

import { getMessage } from './i18n.js';
import { detectRootFolderRole, SYNC_ROLES } from './bookmark-serializer.js';
import { getProfiles, getActiveProfileId } from './profile-manager.js';
import {
  browserObj,
  MENU_IDS,
  PROFILE_ID_PREFIX,
  QUICK_FOLDER_ID_PREFIX,
  DYNAMIC_FOLDER_ID_PREFIX,
  OPEN_ALL_FOLDER_ID_PREFIX,
} from './context-menu-constants.js';

let currentProfileMenuIds = [];
let currentQuickFolderMenuIds = [];
let currentDynamicFolderMenuIds = [];
let currentOpenAllFolderMenuIds = [];
let isRefreshing = false;
let refreshPending = false;

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
 * Debounce helper with a maximum wait time before forced invocation.
 *
 * Ensures that under a sustained event stream, the wrapped function
 * still runs at least once every `maxWait` milliseconds.
 */
function debounceWithMaxWait(func, wait, maxWait) {
  let timeoutId = null;
  let maxTimeoutId = null;
  let lastInvokeTime = 0;

  const invoke = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxTimeoutId !== null) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = null;
    }
    lastInvokeTime = Date.now();
    func();
  };

  return function debounced(...args) {
    const now = Date.now();
    if (!lastInvokeTime) {
      lastInvokeTime = now;
    }

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      invoke();
    }, wait);

    if (typeof maxWait === 'number' && isFinite(maxWait)) {
      const timeSinceLastInvoke = now - lastInvokeTime;
      const remaining = maxWait - timeSinceLastInvoke;

      if (remaining <= 0) {
        invoke();
      } else if (maxTimeoutId === null) {
        maxTimeoutId = setTimeout(() => {
          invoke();
        }, remaining);
      }
    }
  };
}

/**
 * Debounced version for high-frequency events (like bookmarks).
 * Uses a max-wait to avoid indefinite postponement under heavy load.
 */
export const refreshContextMenuDynamicItemsDebounced =
  debounceWithMaxWait(refreshContextMenuDynamicItems, 500, 5000);

/**
 * Rebuild the profile radio items under the Switch Profile submenu.
 * Call after profile CRUD (add/delete/rename/switch) and on install.
 */
export async function refreshProfileMenuItems() {
  for (const id of currentProfileMenuIds) {
    try { await browserObj.contextMenus.remove(id); } catch { /* already gone */ }
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
      }, () => {
        const runtimeError = chrome?.runtime?.lastError?.message || browserObj?.runtime?.lastError?.message;
        if (runtimeError) console.warn('[GitSyncMarks] profile menu create error:', runtimeError);
      });
      currentProfileMenuIds.push(menuId);
    }
  } catch (err) {
    console.warn('[GitSyncMarks] Failed to refresh profile menu:', err);
  }
}

async function refreshQuickFolderMenuItems() {
  for (const id of currentQuickFolderMenuIds) {
    try { await browserObj.contextMenus.remove(id); } catch { /* already gone */ }
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
    try { await browserObj.contextMenus.remove(id); } catch { /* already gone */ }
  }
  currentDynamicFolderMenuIds = [];

  try {
    const tree = await chrome.bookmarks.getTree();
    const roots = Array.isArray(tree) ? tree : [];

    function buildMenuEntries(node, currentParentId) {
      if (!node || node.url) return;

      const children = Array.isArray(node.children) ? node.children : [];
      const folderChildren = children.filter(c => !c.url);

      if (node.parentId) {
        const title = node.title || '(untitled folder)';
        const menuId = DYNAMIC_FOLDER_ID_PREFIX + node.id;

        browserObj.contextMenus.create({
          id: menuId,
          parentId: currentParentId,
          title: title,
          contexts: ['page', 'link'],
        }, () => {
          const runtimeError = chrome?.runtime?.lastError?.message || browserObj?.runtime?.lastError?.message;
          if (runtimeError) console.warn('[GitSyncMarks] dynamic folder create error:', runtimeError);
        });
        currentDynamicFolderMenuIds.push(menuId);

        if (folderChildren.length > 0) {
          const addHereId = DYNAMIC_FOLDER_ID_PREFIX + 'addhere-' + node.id;
          browserObj.contextMenus.create({
            id: addHereId,
            parentId: menuId,
            title: getMessage('contextMenu_addToThisFolder'),
            contexts: ['page', 'link'],
          }, () => {
            const runtimeError = chrome?.runtime?.lastError?.message || browserObj?.runtime?.lastError?.message;
            if (runtimeError) console.warn('[GitSyncMarks] dynamic addhere create error:', runtimeError);
          });
          currentDynamicFolderMenuIds.push(addHereId);

          const sepId = DYNAMIC_FOLDER_ID_PREFIX + 'sep-' + node.id;
          browserObj.contextMenus.create({
            id: sepId,
            parentId: menuId,
            type: 'separator',
            contexts: ['page', 'link'],
          }, () => {
            const runtimeError = chrome?.runtime?.lastError?.message || browserObj?.runtime?.lastError?.message;
            if (runtimeError) console.warn('[GitSyncMarks] dynamic separator create error:', runtimeError);
          });
          currentDynamicFolderMenuIds.push(sepId);
        }

        for (const child of folderChildren) {
          buildMenuEntries(child, menuId);
        }
      } else {
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
    try { await browserObj.contextMenus.remove(id); } catch { /* already gone */ }
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
      }, () => {
        const runtimeError = chrome?.runtime?.lastError?.message || browserObj?.runtime?.lastError?.message;
        if (runtimeError) console.warn('[GitSyncMarks] open-all create error:', runtimeError);
      });
      currentOpenAllFolderMenuIds.push(menuId);
    }
  } catch (err) {
    console.warn('[GitSyncMarks] Failed to refresh open-all menu:', err);
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
