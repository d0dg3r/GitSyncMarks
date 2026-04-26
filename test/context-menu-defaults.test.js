import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CONTEXT_MENU_ITEMS,
  ensureContextMenuItemDefaults,
  isContextMenuItemEnabled,
} from '../lib/context-menu-defaults.js';

test('ensureContextMenuItemDefaults appends missing ids in default order', () => {
  const base = [
    { id: 'SYNC_NOW', enabled: true },
  ];
  ensureContextMenuItemDefaults(base);
  const ids = base.map((i) => i.id);
  assert.ok(ids.includes('ADD_TOOLBAR'));
  assert.equal(ids[0], 'SYNC_NOW');
  assert.equal(ids.length, DEFAULT_CONTEXT_MENU_ITEMS.length);
});

test('ensureContextMenuItemDefaults is idempotent', () => {
  const a = DEFAULT_CONTEXT_MENU_ITEMS.map((i) => ({ ...i }));
  const len = a.length;
  ensureContextMenuItemDefaults(a);
  assert.equal(a.length, len);
  ensureContextMenuItemDefaults(a);
  assert.equal(a.length, len);
});

test('isContextMenuItemEnabled', () => {
  const items = [{ id: 'OPEN_ALL_FOLDER', enabled: false }, { id: 'SYNC_NOW' }];
  assert.equal(isContextMenuItemEnabled(items, 'OPEN_ALL_FOLDER'), false);
  assert.equal(isContextMenuItemEnabled(items, 'SYNC_NOW'), true);
  assert.equal(isContextMenuItemEnabled(items, 'UNKNOWN_ID'), true);
});
