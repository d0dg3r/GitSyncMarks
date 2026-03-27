/**
 * Options Page – Context Menu Configuration
 * Handles context menu item ordering, toggling, and category submenu configuration.
 */

import { getMessage, applyI18n } from '../lib/i18n.js';

export const DEFAULT_CONTEXT_MENU_ITEMS = [
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

const STORAGE_KEYS = {
  CONTEXT_MENU_ITEMS: 'contextMenuItems',
  CONTEXT_MENU_SUBMENUS: 'contextMenuSubmenus',
  CONTEXT_OPEN_ALL_THRESHOLD: 'contextOpenAllThreshold',
};

const contextMenuItemsList = document.getElementById('context-menu-items-list');
const contextMenuResetBtn = document.getElementById('context-menu-reset-btn');
const openAllThresholdInput = document.getElementById('open-all-threshold');

export async function renderContextMenuConfig(items) {
  if (!contextMenuItemsList) return;
  contextMenuItemsList.innerHTML = '';

  const { contextMenuSubmenus = {} } = await chrome.storage.sync.get({ contextMenuSubmenus: {} });

  const grouped = {};
  items.forEach(item => {
    const cat = ITEM_CATEGORY_MAP[item.id] || 'OTHER';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  for (const [catKey, catItems] of Object.entries(grouped)) {
    const header = document.createElement('div');
    header.className = 'context-menu-category-header';

    const title = document.createElement('span');
    title.className = 'category-title';
    title.textContent = getMessage(`contextMenu_category_${catKey}`);
    header.appendChild(title);

    const submenuToggleWrap = document.createElement('div');
    submenuToggleWrap.className = 'submenu-toggle-wrap';

    const submenuLabel = document.createElement('span');
    submenuLabel.textContent = getMessage('options_menu_showAsSubmenu');
    submenuToggleWrap.appendChild(submenuLabel);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = contextMenuSubmenus[catKey] !== false;
    checkbox.addEventListener('change', () => toggleCategorySubmenu(catKey, checkbox.checked));

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'toggle-label';
    const slider = document.createElement('span');
    slider.className = 'toggle-slider toggle-slider-sm';
    toggleLabel.appendChild(checkbox);
    toggleLabel.appendChild(slider);

    submenuToggleWrap.appendChild(toggleLabel);
    header.appendChild(submenuToggleWrap);
    contextMenuItemsList.appendChild(header);

    catItems.forEach((item) => {
      const globalIndex = items.findIndex(i => i.id === item.id);
      const row = document.createElement('div');
      row.className = 'context-menu-item-row';
      row.dataset.id = item.id;

      const label = document.createElement('span');
      label.className = 'context-menu-item-label';
      label.textContent = getMessage(`options_contextMenuItem_${item.id}`) || item.id;
      row.appendChild(label);

      const actions = document.createElement('div');
      actions.className = 'context-menu-item-actions';

      const upBtn = document.createElement('button');
      upBtn.className = 'context-menu-item-reorder-btn';
      upBtn.textContent = '↑';
      upBtn.disabled = globalIndex === 0;
      upBtn.addEventListener('click', () => moveContextMenuItem(globalIndex, -1));
      actions.appendChild(upBtn);

      const downBtn = document.createElement('button');
      downBtn.className = 'context-menu-item-reorder-btn';
      downBtn.textContent = '↓';
      downBtn.disabled = globalIndex === items.length - 1;
      downBtn.addEventListener('click', () => moveContextMenuItem(globalIndex, 1));
      actions.appendChild(downBtn);

      row.appendChild(actions);

      const toggleWrap = document.createElement('label');
      toggleWrap.className = 'toggle-label context-menu-item-toggle';

      const itemCheckbox = document.createElement('input');
      itemCheckbox.type = 'checkbox';
      itemCheckbox.checked = item.enabled !== false;
      itemCheckbox.addEventListener('change', () => toggleContextMenuItem(item.id, itemCheckbox.checked));

      const itemSlider = document.createElement('span');
      itemSlider.className = 'toggle-slider toggle-slider-sm';

      toggleWrap.appendChild(itemCheckbox);
      toggleWrap.appendChild(itemSlider);
      row.appendChild(toggleWrap);

      contextMenuItemsList.appendChild(row);
    });
  }
}

async function toggleCategorySubmenu(catKey, enabled) {
  const { contextMenuSubmenus = {} } = await chrome.storage.sync.get({ contextMenuSubmenus: {} });
  contextMenuSubmenus[catKey] = enabled;
  await chrome.storage.sync.set({ [STORAGE_KEYS.CONTEXT_MENU_SUBMENUS]: contextMenuSubmenus });
  chrome.runtime.sendMessage({ action: 'refreshContextMenus' });
}

async function moveContextMenuItem(index, direction) {
  const { contextMenuItems } = await chrome.storage.sync.get({ contextMenuItems: DEFAULT_CONTEXT_MENU_ITEMS });
  const newItems = [...contextMenuItems];
  const targetIndex = index + direction;

  if (targetIndex >= 0 && targetIndex < newItems.length) {
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    await chrome.storage.sync.set({ [STORAGE_KEYS.CONTEXT_MENU_ITEMS]: newItems });
    renderContextMenuConfig(newItems);
    chrome.runtime.sendMessage({ action: 'refreshContextMenus' });
  }
}

async function toggleContextMenuItem(id, enabled) {
  const { contextMenuItems } = await chrome.storage.sync.get({ contextMenuItems: DEFAULT_CONTEXT_MENU_ITEMS });
  const newItems = contextMenuItems.map(item =>
    item.id === id ? { ...item, enabled } : item
  );
  await chrome.storage.sync.set({ [STORAGE_KEYS.CONTEXT_MENU_ITEMS]: newItems });
  renderContextMenuConfig(newItems);
  chrome.runtime.sendMessage({ action: 'refreshContextMenus' });
}

export function initContextMenuConfig() {
  contextMenuResetBtn?.addEventListener('click', async () => {
    await chrome.storage.sync.set({ [STORAGE_KEYS.CONTEXT_MENU_ITEMS]: DEFAULT_CONTEXT_MENU_ITEMS });
    renderContextMenuConfig(DEFAULT_CONTEXT_MENU_ITEMS);
    chrome.runtime.sendMessage({ action: 'refreshContextMenus' });
  });

  openAllThresholdInput?.addEventListener('change', async () => {
    const val = Math.max(1, parseInt(openAllThresholdInput.value, 10) || 15);
    await chrome.storage.sync.set({ [STORAGE_KEYS.CONTEXT_OPEN_ALL_THRESHOLD]: val });
  });
}
