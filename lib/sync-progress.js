/**
 * Sync progress formatting and long-running sync actions over a runtime port.
 */

import { getMessage } from './i18n.js';

function progressText(key, substitutions, fallback) {
  const msg = getMessage(key, substitutions);
  return !msg || msg === key ? fallback : msg;
}

/**
 * @param {{ phase?: string, current?: number, total?: number }} payload
 * @returns {string}
 */
export function formatSyncProgress(payload = {}) {
  const { phase = 'loading', current = 0, total = 0 } = payload;
  const cur = String(current);
  const tot = String(total);

  if (phase === 'pushing' && total > 0) {
    return progressText('sync_progressFiles', [cur, tot], `${cur} / ${tot} files`);
  }
  if (phase === 'applying' && total > 0) {
    return progressText('sync_progressApplyingBookmarks', [cur, tot], `${cur} / ${tot} bookmarks`);
  }
  if (phase === 'fetching') {
    return progressText('sync_progressFetching', [], 'Fetching remote…');
  }
  if (phase === 'generating') {
    return progressText('sync_progressGenerating', [], 'Generating files…');
  }
  if (phase === 'applying') {
    return progressText('sync_progressApplying', [], 'Applying bookmarks…');
  }
  return progressText('popup_syncing', [], 'Syncing…');
}

/**
 * Run sync/push/pull/generate/bootstrap actions with live progress events.
 * @param {'sync'|'push'|'pull'|'generateFilesNow'|'bootstrapFirstSync'} action
 * @param {object} [params]
 * @param {(payload: { phase?: string, current?: number, total?: number }) => void} [onProgress]
 * @returns {Promise<object>}
 */
export function runSyncPortAction(action, params = {}, onProgress) {
  return new Promise((resolve, reject) => {
    let port;
    try {
      port = chrome.runtime.connect({ name: 'syncProgress' });
    } catch (err) {
      reject(err);
      return;
    }

    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      try {
        port.disconnect();
      } catch {
        /* ignore */
      }
      fn(value);
    };

    port.onMessage.addListener((msg) => {
      if (msg?.type === 'syncProgress') {
        onProgress?.(msg);
        return;
      }
      if (msg?.type === 'syncDone') {
        if (msg.error) finish(reject, new Error(msg.error));
        else finish(resolve, msg.result);
      }
    });

    port.onDisconnect.addListener(() => {
      if (chrome.runtime.lastError && !settled) {
        finish(reject, new Error(chrome.runtime.lastError.message));
      }
    });

    port.postMessage({ action, params });
  });
}
