/**
 * Help tab: display extension keyboard shortcut strings and "Customize" link.
 */

import { getMessage } from '../lib/i18n.js';

const SHORTCUT_FORMAT = {
  Period: '.',
  Comma: ',',
  Space: 'Space',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};

export function formatShortcut(raw) {
  if (!raw) return getMessage('help_shortcutNotSet');
  return raw
    .split('+')
    .map((p) => SHORTCUT_FORMAT[p] || p)
    .join('+');
}

export function loadShortcuts() {
  if (!chrome.commands?.getAll) return;
  chrome.commands.getAll((commands) => {
    for (const cmd of commands) {
      if (cmd.name === 'quick-sync') {
        const el = document.getElementById('shortcut-quick-sync');
        if (el) el.textContent = formatShortcut(cmd.shortcut);
      } else if (cmd.name === 'open-options') {
        const el = document.getElementById('shortcut-open-options');
        if (el) el.textContent = formatShortcut(cmd.shortcut);
      }
    }
  });
}

export function initHelpTabShortcuts() {
  document.getElementById('btn-customize-shortcuts')?.addEventListener('click', () => {
    const isFirefox = navigator.userAgent.includes('Firefox');
    const url = isFirefox ? 'about:addons' : 'chrome://extensions/shortcuts';
    chrome.tabs.create({ url });
  });
}
