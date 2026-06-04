/**
 * Background keep-alive for the non-persistent background context
 * (Firefox MV3 event page / Chrome MV3 service worker).
 *
 * Long-running operations (sync, push, pull, restore) can exceed the browser's
 * ~30s idle lifetime. When that happens the browser terminates the background
 * mid-operation: the work is aborted and the popup's pending `sendMessage`
 * rejects with "Could not establish connection. Receiving end does not exist."
 * (issue #143).
 *
 * Periodically touching a lightweight extension API resets the idle timer so the
 * operation can run to completion. Reference-counted so overlapping callers do
 * not stop the timer prematurely.
 */

const browserObj =
  typeof browser !== 'undefined' ? browser : typeof chrome !== 'undefined' ? chrome : null;

// Touch interval well under the ~30s idle limit so the timer always resets in time.
const KEEP_ALIVE_INTERVAL_MS = 20000;

let timer = null;
let activeCount = 0;

function touch() {
  try {
    const result = browserObj?.runtime?.getPlatformInfo?.();
    if (result && typeof result.then === 'function') {
      result.catch(() => {
        /* best-effort keep-alive; ignore failures */
      });
    }
  } catch {
    /* best-effort keep-alive; ignore failures */
  }
}

/**
 * Begin keeping the background alive. Safe to call repeatedly (reference counted).
 */
export function startKeepAlive() {
  activeCount += 1;
  if (timer || !browserObj?.runtime?.getPlatformInfo) return;
  touch();
  timer = setInterval(touch, KEEP_ALIVE_INTERVAL_MS);
}

/**
 * Release one keep-alive hold; the timer stops once all holds are released.
 */
export function stopKeepAlive() {
  if (activeCount > 0) activeCount -= 1;
  if (activeCount > 0) return;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
