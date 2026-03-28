/**
 * Mount dismissible "What's new" overlay when an update flag is set in chrome.storage.local.
 */

import {
  getWhatsNewContent,
  getPendingWhatsNewVersion,
  clearPendingWhatsNew,
  shouldDisplayWhatsNew,
} from './whats-new.js';

/**
 * @param {HTMLElement} root - usually document.body
 * @param {{ getMessage: (key: string, subs?: (string|number)[]) => string, manifestVersion: string }} opts
 * @returns {Promise<boolean>} true if overlay was shown
 */
export async function mountWhatsNewIfPending(root, { getMessage, manifestVersion }) {
  const pending = await getPendingWhatsNewVersion();
  if (!shouldDisplayWhatsNew(pending, manifestVersion)) {
    if (pending === manifestVersion && getWhatsNewContent(manifestVersion) === null) {
      await clearPendingWhatsNew();
    }
    return false;
  }

  const content = getWhatsNewContent(manifestVersion);
  if (!content) {
    await clearPendingWhatsNew();
    return false;
  }

  const overlay = document.createElement('div');
  overlay.className = 'whats-new-overlay';
  if (typeof document !== 'undefined' && document.querySelector('.popup')) {
    overlay.classList.add('whats-new-overlay--popup');
  }
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'whats-new-heading');

  const panel = document.createElement('div');
  panel.className = 'whats-new-panel';

  const title = document.createElement('h2');
  title.id = 'whats-new-heading';
  title.className = 'whats-new-title';
  title.textContent = getMessage('whatsnew_title', [manifestVersion]);

  const list = document.createElement('ul');
  list.className = 'whats-new-list';
  for (const line of content.bullets) {
    const li = document.createElement('li');
    li.textContent = line;
    list.appendChild(li);
  }

  const actions = document.createElement('div');
  actions.className = 'whats-new-actions';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn btn-primary whats-new-close';
  closeBtn.textContent = getMessage('whatsnew_close');

  const dismiss = async () => {
    await clearPendingWhatsNew();
    overlay.remove();
  };

  closeBtn.addEventListener('click', () => { dismiss().catch(() => {}); });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dismiss().catch(() => {});
  });

  actions.appendChild(closeBtn);
  panel.appendChild(title);
  panel.appendChild(list);
  panel.appendChild(actions);
  overlay.appendChild(panel);
  root.appendChild(overlay);

  closeBtn.focus();

  return true;
}
