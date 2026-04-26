/**
 * Context Menu Dynamic Items
 * Manages dynamic context menu sections: profiles, quick folders,
 * folder tree, and open-all-from-folder submenus.
 */

import { getMessage } from './i18n.js';
import { detectRootFolderRole, SYNC_ROLES } from './bookmark-serializer.js';
import { getProfiles, getActiveProfileId } from './profile-manager.js';
import {
  DEFAULT_CONTEXT_MENU_ITEMS,
  ensureContextMenuItemDefaults,
  isContextMenuItemEnabled,
} from './context-menu-defaults.js';
import {
  browserObj,
  MENU_IDS,
  PROFILE_ID_PREFIX,
  QUICK_FOLDER_ID_PREFIX,
  DYNAMIC_FOLDER_ID_PREFIX,
  OPEN_ALL_FOLDER_ID_PREFIX,
} from './context-menu-constants.js';

/** `false` while `setupContextMenus` has cleared the menu and not yet finished all static + dynamic creation. */
let staticContextMenuReady = false;

/**
 * @param {boolean} ready - Set `false` before `removeAll`; `true` after all static `contextMenus.create` calls, before the dynamic pass.
 */
export function setStaticContextMenuReady(ready) {
  staticContextMenuReady = ready;
}

async function getMergedContextMenuItems() {
  const { contextMenuItems: raw = [] } = await browserObj.storage.sync.get({
    contextMenuItems: [],
  });
  const items = Array.isArray(raw) && raw.length
    ? raw
    : DEFAULT_CONTEXT_MENU_ITEMS.map((i) => ({ ...i }));
  ensureContextMenuItemDefaults(items);
  return items;
}

/**
 * `contextMenus.update` may return a Promise (MV3); rejected updates must not be left uncaught.
 */
async function safeContextMenuUpdate(id, updateProperties) {
  try {
    const p = browserObj.contextMenus.update(id, updateProperties);
    if (p && typeof p.then === 'function') {
      await p.catch(() => {});
    }
  } catch {
    /* e.g. parent not registered yet, or id disabled in settings */
  }
}

/**
 * Wait until `contextMenus.create` has finished. MV3 can register the parent asynchronously;
 * children must not be created in the same synchronous turn as the parent, or "Cannot find menu
 * item with id" appears for the parent.
 * @param {object} createProperties
 */
function contextMenuCreateAsync(createProperties) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      void browserObj?.runtime?.lastError;
      void chrome?.runtime?.lastError;
      resolve();
    };
    try {
      const ret = browserObj.contextMenus.create(createProperties, finish);
      if (ret && typeof ret.then === 'function') {
        void ret.then(finish).catch(finish);
      }
    } catch {
      finish();
    }
  });
}

let currentProfileMenuIds = [];
let currentQuickFolderMenuIds = [];
let currentDynamicFolderMenuIds = [];
let currentOpenAllFolderMenuIds = [];
let isRefreshing = false;
let refreshPending = false;

/**
 * Rebuild dynamic context-menu sections.
 * Uses a lockout to prevent concurrent overlapping rebuilds.
 * Skips while the static context menu is being rebuilt; skips sections whose items are off in user settings
 * (otherwise `create`/`update` targets missing parent ids and Chrome logs errors).
 */
export async function refreshContextMenuDynamicItems() {
  if (!staticContextMenuReady) {
    return;
  }
  if (isRefreshing) {
    refreshPending = true;
    return;
  }

  isRefreshing = true;
  let menuItems;
  try {
    menuItems = await getMergedContextMenuItems();
  } catch {
    isRefreshing = false;
    if (refreshPending) {
      refreshPending = false;
      refreshContextMenuDynamicItems();
    }
    return;
  }
  try {
    await Promise.all([
      refreshDynamicFolderMenu(menuItems),
      refreshQuickFolderMenuItems(menuItems),
      refreshOpenAllFolderMenuItems(menuItems),
      refreshProfileMenuItemsWithMenuList(menuItems),
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
  if (!staticContextMenuReady) {
    return;
  }
  const menuItems = await getMergedContextMenuItems();
  return refreshProfileMenuItemsWithMenuList(menuItems);
}

/**
 * @param {{ id: string, enabled?: boolean }[]} contextMenuItems
 */
async function refreshProfileMenuItemsWithMenuList(contextMenuItems) {
  for (const id of currentProfileMenuIds) {
    try { await browserObj.contextMenus.remove(id); } catch { /* already gone */ }
  }
  currentProfileMenuIds = [];

  if (!isContextMenuItemEnabled(contextMenuItems, 'SWITCH_PROFILE')) {
    return;
  }

  try {
    const [profiles, activeId] = await Promise.all([getProfiles(), getActiveProfileId()]);
    const entries = Object.entries(profiles);
    if (entries.length === 0) return;

    for (const [id, profile] of entries) {
      const menuId = PROFILE_ID_PREFIX + id;
      await contextMenuCreateAsync({
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

/**
 * @param {{ id: string, enabled?: boolean }[]} contextMenuItems
 */
async function refreshQuickFolderMenuItems(contextMenuItems) {
  for (const id of currentQuickFolderMenuIds) {
    try { await browserObj.contextMenus.remove(id); } catch { /* already gone */ }
  }
  currentQuickFolderMenuIds = [];

  if (!isContextMenuItemEnabled(contextMenuItems, 'QUICK_FOLDERS')) {
    return;
  }

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

    await safeContextMenuUpdate(MENU_IDS.SEP_QUICK, { visible: validFolders.length > 0 });

    for (const folder of validFolders) {
      const menuId = QUICK_FOLDER_ID_PREFIX + folder.id;
      await contextMenuCreateAsync({
        id: menuId,
        parentId: MENU_IDS.PARENT,
        title: getMessage('contextMenu_addToQuickFolder', [folder.pathLabel || folder.title]),
        contexts: ['page', 'link'],
      });
      currentQuickFolderMenuIds.push(menuId);
    }
  } catch (err) {
    console.warn('[GitSyncMarks] Failed to refresh quick-folder menu:', err);
    try {
      await safeContextMenuUpdate(MENU_IDS.SEP_QUICK, { visible: false });
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {{ id: string, enabled?: boolean }[]} contextMenuItems
 */
async function refreshDynamicFolderMenu(contextMenuItems) {
  for (const id of currentDynamicFolderMenuIds) {
    try { await browserObj.contextMenus.remove(id); } catch { /* already gone */ }
  }
  currentDynamicFolderMenuIds = [];

  if (!isContextMenuItemEnabled(contextMenuItems, 'ADD_TO_FOLDER')) {
    return;
  }

  try {
    const tree = await chrome.bookmarks.getTree();
    const roots = Array.isArray(tree) ? tree : [];

    async function buildMenuEntries(node, currentParentId) {
      if (!node || node.url) return;

      const children = Array.isArray(node.children) ? node.children : [];
      const folderChildren = children.filter((c) => !c.url);

      if (node.parentId) {
        const title = node.title || '(untitled folder)';
        const menuId = DYNAMIC_FOLDER_ID_PREFIX + node.id;

        await contextMenuCreateAsync({
          id: menuId,
          parentId: currentParentId,
          title,
          contexts: ['page', 'link'],
        });
        currentDynamicFolderMenuIds.push(menuId);

        if (folderChildren.length > 0) {
          const addHereId = DYNAMIC_FOLDER_ID_PREFIX + 'addhere-' + node.id;
          await contextMenuCreateAsync({
            id: addHereId,
            parentId: menuId,
            title: getMessage('contextMenu_addToThisFolder'),
            contexts: ['page', 'link'],
          });
          currentDynamicFolderMenuIds.push(addHereId);

          const sepId = DYNAMIC_FOLDER_ID_PREFIX + 'sep-' + node.id;
          await contextMenuCreateAsync({
            id: sepId,
            parentId: menuId,
            type: 'separator',
            contexts: ['page', 'link'],
          });
          currentDynamicFolderMenuIds.push(sepId);
        }

        for (const child of folderChildren) {
          await buildMenuEntries(child, menuId);
        }
      } else {
        for (const child of folderChildren) {
          const role = detectRootFolderRole(child);
          if (SYNC_ROLES.includes(role)) {
            await buildMenuEntries(child, MENU_IDS.ADD_TO_FOLDER);
          }
        }
      }
    }

    for (const root of roots) {
      await buildMenuEntries(root, MENU_IDS.ADD_TO_FOLDER);
    }
  } catch (err) {
    console.warn('[GitSyncMarks] Failed to refresh dynamic folder menu:', err);
  }
}

/**
 * @param {{ id: string, enabled?: boolean }[]} contextMenuItems
 */
async function refreshOpenAllFolderMenuItems(contextMenuItems) {
  for (const id of currentOpenAllFolderMenuIds) {
    try { await browserObj.contextMenus.remove(id); } catch { /* already gone */ }
  }
  currentOpenAllFolderMenuIds = [];

  if (!isContextMenuItemEnabled(contextMenuItems, 'OPEN_ALL_FOLDER')) {
    return;
  }

  try {
    const folders = await getBookmarkFoldersFlat();
    const limited = folders.slice(0, 30);
    for (const folder of limited) {
      const menuId = OPEN_ALL_FOLDER_ID_PREFIX + folder.id;
      await contextMenuCreateAsync({
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
