/**
 * Options Page – Sync History & Restore
 * Handles commit history listing, diff preview, and bookmark restore.
 */

import { getMessage } from '../lib/i18n.js';
import { extractClientIdFromCommitMessage } from '../lib/sync-commit-message.js';

const historyLoadBtn = document.getElementById('history-load-btn');
const historyUndoBtn = document.getElementById('history-undo-btn');
const historyStatus = document.getElementById('history-status');
const historyList = document.getElementById('history-list');

let currentCommitSha = null;

// #region agent log
const DEBUG_INGEST = 'http://127.0.0.1:7246/ingest/1b416a88-d62d-415a-a55c-29910a80e72b';
const DEBUG_SESSION = 'f0a9cb';

function emitHistoryLayoutDebug(reason) {
  try {
    const html = document.documentElement;
    const body = document.body;
    const card = document.querySelector('#subtab-files-history .card');
    const list = document.getElementById('history-list');
    const lastWrap = list?.querySelector('.history-item-wrap:last-child');
    const pickRect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height, w: r.width };
    };
    const firstWrap = list?.querySelector('.history-item-wrap');
    const firstActions = firstWrap?.querySelector('.history-item-actions');
    const firstRestoreBtn = firstActions?.querySelector('.btn-primary');
    const cardR = card ? pickRect(card) : null;
    const restoreR = firstRestoreBtn ? pickRect(firstRestoreBtn) : null;
    const outflowX =
      cardR && restoreR && Number.isFinite(cardR.right) && Number.isFinite(restoreR.right)
        ? Math.round((restoreR.right - cardR.right) * 100) / 100
        : null;

    const payload = {
      sessionId: DEBUG_SESSION,
      runId: 'post-fix',
      hypothesisId: 'H-hoverflow',
      location: 'options/history.js:emitHistoryLayoutDebug',
      message: String(reason),
      timestamp: Date.now(),
      data: {
        reason,
        innerH: window.innerHeight,
        innerW: window.innerWidth,
        scrollY: window.scrollY,
        maxScrollY: html.scrollHeight - html.clientHeight,
        docClientH: html.clientHeight,
        docScrollH: html.scrollHeight,
        bodyClientH: body.clientHeight,
        bodyScrollH: body.scrollHeight,
        overflowHtml: getComputedStyle(html).overflowY,
        overflowBody: getComputedStyle(body).overflowY,
        card: card
          ? {
              overflowX: getComputedStyle(card).overflowX,
              overflowY: getComputedStyle(card).overflowY,
              maxHeight: getComputedStyle(card).maxHeight,
              rect: cardR,
            }
          : null,
        list: list
          ? {
              overflowX: getComputedStyle(list).overflowX,
              overflowY: getComputedStyle(list).overflowY,
              maxHeight: getComputedStyle(list).maxHeight,
              rect: pickRect(list),
            }
          : null,
        lastWrapRect: pickRect(lastWrap),
        firstActionsRect: pickRect(firstActions),
        firstRestoreRect: restoreR,
        outflowX,
      },
    };
    chrome.runtime.sendMessage(
      {
        action: '__debugSessionIngest',
        endpoint: DEBUG_INGEST,
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': DEBUG_SESSION },
        body: JSON.stringify(payload),
      },
      () => void chrome.runtime.lastError
    );
  } catch {
    /* ignore */
  }
}
// #endregion

const HISTORY_RESTORE_ARM_MS = 10000;

/** Inline SVG (static); injected into icon buttons only. */
const SVG_PREVIEW_HTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';

const SVG_RESTORE_HTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';

/** Active / current commit indicator (same row as data). */
const SVG_CURRENT_HTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 12 2 2 4-4"/></svg>';

function renderHistoryListHeader() {
  const header = document.createElement('div');
  header.className = 'history-list-header';

  const hDate = document.createElement('span');
  hDate.className = 'history-col-head history-col-date';
  hDate.textContent = getMessage('options_historyColDate') || 'Date';

  const hCommit = document.createElement('span');
  hCommit.className = 'history-col-head history-col-commit';
  hCommit.textContent = getMessage('options_historyColCommit') || 'Commit';

  const hClient = document.createElement('span');
  hClient.className = 'history-col-head history-col-client';
  hClient.textContent = getMessage('options_historyColClient') || 'Client';

  const hActions = document.createElement('span');
  hActions.className = 'history-col-head history-col-actions';
  const hActionsSr = document.createElement('span');
  hActionsSr.className = 'sr-only';
  hActionsSr.textContent = getMessage('options_historyColActions') || 'Actions';
  hActions.appendChild(hActionsSr);

  header.append(hDate, hCommit, hClient, hActions);
  return header;
}

function setPreviewIconButton(button) {
  const label = getMessage('options_historyPreviewBtn') || 'Preview';
  button.replaceChildren();
  const inner = document.createElement('span');
  inner.className = 'history-btn-icon-inner';
  inner.innerHTML = SVG_PREVIEW_HTML;
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = label;
  button.append(inner, sr);
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
}

function setRestoreIconButtonIdle(button, labelRestore) {
  button.replaceChildren();
  const inner = document.createElement('span');
  inner.className = 'history-btn-icon-inner';
  inner.innerHTML = SVG_RESTORE_HTML;
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = labelRestore;
  button.append(inner, sr);
  button.setAttribute('aria-label', labelRestore);
  button.setAttribute('title', labelRestore);
}

function setRestoreIconButtonArmed(button, shortLabel, fullAriaLabel) {
  button.replaceChildren();
  const span = document.createElement('span');
  span.className = 'history-restore-armed-label';
  span.textContent = shortLabel;
  button.appendChild(span);
  button.setAttribute('aria-label', fullAriaLabel);
  button.setAttribute('title', fullAriaLabel);
}

function renderHistoryList(commits) {
  historyList.innerHTML = '';
  if (commits.length === 0) {
    historyList.style.display = 'none';
    historyStatus.textContent = getMessage('options_historyEmpty') || 'No commits found.';
    return;
  }
  historyList.style.display = '';
  historyList.appendChild(renderHistoryListHeader());
  for (const c of commits) {
    const wrap = document.createElement('div');
    wrap.className = 'history-item-wrap';
    wrap.dataset.commitSha = c.sha || '';

    const row = document.createElement('div');
    row.className = 'history-item';

    const date = document.createElement('span');
    date.className = 'history-date';
    date.textContent = c.date ? new Date(c.date).toLocaleString() : '—';

    const sha = document.createElement('code');
    sha.className = 'history-sha';
    sha.textContent = c.sha ? c.sha.substring(0, 7) : '';

    const msg = document.createElement('span');
    msg.className = 'history-msg';
    const rawMessage = c.message || '';
    const clientId = extractClientIdFromCommitMessage(rawMessage);
    msg.textContent = clientId || '—';
    if (rawMessage) msg.title = rawMessage;

    row.append(date, sha, msg);

    const diffSlot = document.createElement('div');
    diffSlot.className = 'history-item-diff';
    diffSlot.style.display = 'none';
    diffSlot.setAttribute('aria-hidden', 'true');

    const isCurrent = currentCommitSha && c.sha === currentCommitSha;
    if (isCurrent) {
      const curLabel = getMessage('options_historyCurrent') || 'current';
      const badge = document.createElement('span');
      badge.className = 'history-current';
      badge.setAttribute('title', curLabel);
      const iconWrap = document.createElement('span');
      iconWrap.className = 'history-current-icon';
      iconWrap.innerHTML = SVG_CURRENT_HTML;
      const labelEl = document.createElement('span');
      labelEl.className = 'history-current-label';
      labelEl.textContent = curLabel;
      badge.append(iconWrap, labelEl);
      row.appendChild(badge);
    } else {
      const actions = document.createElement('div');
      actions.className = 'history-item-actions';

      const restoreRowBtn = document.createElement('button');
      restoreRowBtn.type = 'button';
      restoreRowBtn.className = 'btn btn-primary btn-sm history-icon-btn';
      bindTwoStepRestore(restoreRowBtn, async () => runRestoreFromCommit(c.sha, wrap), { icon: true });

      const previewBtn = document.createElement('button');
      previewBtn.type = 'button';
      previewBtn.className = 'btn btn-secondary btn-sm history-icon-btn';
      setPreviewIconButton(previewBtn);
      previewBtn.addEventListener('click', () => {
        restoreRowBtn._historyRestoreReset?.();
        loadDiffPreview(c.sha, wrap);
      });

      actions.append(previewBtn, restoreRowBtn);
      row.appendChild(actions);
    }

    wrap.append(row, diffSlot);
    historyList.appendChild(wrap);
  }
  // #region agent log
  if (commits.length > 0) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => emitHistoryLayoutDebug('renderHistoryList'));
    });
  }
  // #endregion
}

/**
 * Two-step confirm on the same Restore button: first click arms, second click runs executeRestore.
 * @param {{ icon?: boolean }} [opts] — icon row uses magnifying-glass / restore SVG; diff panel uses plain text.
 */
function bindTwoStepRestore(button, executeRestore, opts = {}) {
  const icon = Boolean(opts.icon);
  let armed = false;
  let resetTimer = null;
  const labelRestore = getMessage('options_historyRestoreBtn') || 'Restore';
  const labelConfirm = getMessage('options_historyRestoreConfirmBtn') || 'Click again to confirm';
  const labelConfirmShort = getMessage('options_historyRestoreConfirmShort') || 'Confirm';

  function reset() {
    armed = false;
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
    if (icon) {
      setRestoreIconButtonIdle(button, labelRestore);
    } else {
      button.textContent = labelRestore;
    }
    button.classList.remove('history-restore-armed');
  }

  button._historyRestoreReset = reset;

  if (icon) {
    setRestoreIconButtonIdle(button, labelRestore);
  }

  button.addEventListener('click', async () => {
    if (button.disabled) return;
    if (!armed) {
      armed = true;
      if (icon) {
        setRestoreIconButtonArmed(button, labelConfirmShort, labelConfirm);
      } else {
        button.textContent = labelConfirm;
      }
      button.classList.add('history-restore-armed');
      resetTimer = setTimeout(reset, HISTORY_RESTORE_ARM_MS);
      return;
    }
    reset();
    button.disabled = true;
    try {
      await executeRestore();
    } finally {
      button.disabled = false;
    }
  });
}

/**
 * Restore local bookmarks from a commit (after two-step button confirm).
 */
async function runRestoreFromCommit(sha, wrap) {
  closeOtherDiffPanels(wrap);
  const diffSlot = wrap?.querySelector('.history-item-diff');
  if (diffSlot) {
    diffSlot.style.display = 'none';
    diffSlot.innerHTML = '';
    diffSlot.setAttribute('aria-hidden', 'true');
  }

  historyStatus.textContent = getMessage('options_historyRestoring') || 'Restoring…';
  try {
    const resp = await chrome.runtime.sendMessage({ action: 'restoreFromCommit', commitSha: sha });
    historyStatus.textContent = resp.message || '';
    if (resp.success) closeAllInlineDiffPanels();
  } catch (err) {
    historyStatus.textContent = err.message;
  }
}

function closeOtherDiffPanels(activeWrap) {
  historyList?.querySelectorAll('.history-item-wrap').forEach((w) => {
    if (w === activeWrap) return;
    const slot = w.querySelector('.history-item-diff');
    if (slot) {
      slot.style.display = 'none';
      slot.innerHTML = '';
      slot.setAttribute('aria-hidden', 'true');
    }
  });
}

export function closeAllInlineDiffPanels() {
  historyList?.querySelectorAll('.history-item-diff').forEach((el) => {
    el.style.display = 'none';
    el.innerHTML = '';
    el.setAttribute('aria-hidden', 'true');
  });
}

function hideInlineDiff(wrap) {
  const slot = wrap?.querySelector('.history-item-diff');
  if (!slot) return;
  slot.style.display = 'none';
  slot.innerHTML = '';
  slot.setAttribute('aria-hidden', 'true');
}

async function loadDiffPreview(sha, wrap) {
  closeOtherDiffPanels(wrap);

  const diffSlot = wrap.querySelector('.history-item-diff');
  if (!diffSlot) return;

  historyStatus.textContent = getMessage('options_historyDiffLoading') || 'Loading preview…';
  diffSlot.style.display = '';
  diffSlot.setAttribute('aria-hidden', 'false');
  const loading = document.createElement('p');
  loading.className = 'history-diff-loading';
  loading.textContent = getMessage('options_historyDiffLoading') || 'Loading preview…';
  diffSlot.innerHTML = '';
  diffSlot.appendChild(loading);

  try {
    const resp = await chrome.runtime.sendMessage({ action: 'previewCommitDiff', commitSha: sha });
    historyStatus.textContent = '';
    if (!resp.success) {
      historyStatus.textContent = resp.message || 'Preview failed';
      hideInlineDiff(wrap);
      return;
    }
    renderDiffInto(diffSlot, wrap, resp, sha);
  } catch (err) {
    historyStatus.textContent = err.message;
    hideInlineDiff(wrap);
  }
}

function renderDiffInto(diffSlot, wrap, diff, sha) {
  const { summary, added, removed, changed } = diff;
  const total = summary.added + summary.removed + summary.changed;

  diffSlot.innerHTML = '';
  const inner = document.createElement('div');
  inner.className = 'history-item-diff-inner';

  if (total === 0) {
    const noChanges = document.createElement('p');
    noChanges.className = 'history-diff-no-changes';
    noChanges.textContent = getMessage('options_historyDiffNoChanges') || 'No differences — this commit matches your current bookmarks.';
    inner.appendChild(noChanges);

    const actions = document.createElement('div');
    actions.className = 'history-diff-actions';
    const restoreBtn = document.createElement('button');
    restoreBtn.type = 'button';
    restoreBtn.className = 'btn btn-primary btn-sm';
    restoreBtn.textContent = getMessage('options_historyRestoreBtn') || 'Restore';
    bindTwoStepRestore(restoreBtn, async () => runRestoreFromCommit(sha, wrap));
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn btn-secondary btn-sm';
    closeBtn.textContent = getMessage('options_historyDiffClose') || 'Close';
    closeBtn.addEventListener('click', () => hideInlineDiff(wrap));
    actions.append(restoreBtn, closeBtn);
    inner.appendChild(actions);

    diffSlot.appendChild(inner);
    return;
  }

  const summaryRow = document.createElement('div');
  summaryRow.className = 'history-diff-summary';
  if (summary.added > 0) {
    summaryRow.appendChild(makeBadge('added', `+${summary.added} ${getMessage('options_historyDiffAdded') || 'Added'}`));
  }
  if (summary.removed > 0) {
    summaryRow.appendChild(makeBadge('removed', `−${summary.removed} ${getMessage('options_historyDiffRemoved') || 'Removed'}`));
  }
  if (summary.changed > 0) {
    summaryRow.appendChild(makeBadge('changed', `~${summary.changed} ${getMessage('options_historyDiffChanged') || 'Changed'}`));
  }
  inner.appendChild(summaryRow);

  const hasAdded = added.length > 0;
  const hasRemoved = removed.length > 0;
  if (hasAdded || hasRemoved) {
    const columns = document.createElement('div');
    columns.className = 'history-diff-columns';
    if (hasAdded) {
      const col = document.createElement('div');
      col.className = 'history-diff-col';
      col.appendChild(makeDiffGroup(getMessage('options_historyDiffAdded') || 'Added', added, 'added'));
      columns.appendChild(col);
    }
    if (hasRemoved) {
      const col = document.createElement('div');
      col.className = 'history-diff-col';
      col.appendChild(makeDiffGroup(getMessage('options_historyDiffRemoved') || 'Removed', removed, 'removed'));
      columns.appendChild(col);
    }
    inner.appendChild(columns);
  }

  if (changed.length > 0) {
    const changedWrap = document.createElement('div');
    changedWrap.className = 'history-diff-changed-block';
    changedWrap.appendChild(makeChangedGroup(getMessage('options_historyDiffChanged') || 'Changed', changed));
    inner.appendChild(changedWrap);
  }

  const actions = document.createElement('div');
  actions.className = 'history-diff-actions';
  const restoreBtn = document.createElement('button');
  restoreBtn.type = 'button';
  restoreBtn.className = 'btn btn-primary btn-sm';
  restoreBtn.textContent = getMessage('options_historyRestoreBtn') || 'Restore';
  bindTwoStepRestore(restoreBtn, async () => runRestoreFromCommit(sha, wrap));
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn btn-secondary btn-sm';
  closeBtn.textContent = getMessage('options_historyDiffClose') || 'Close';
  closeBtn.addEventListener('click', () => {
    restoreBtn._historyRestoreReset?.();
    hideInlineDiff(wrap);
  });
  actions.append(restoreBtn, closeBtn);
  inner.appendChild(actions);

  diffSlot.appendChild(inner);
}

function makeBadge(type, text) {
  const span = document.createElement('span');
  span.className = `history-diff-badge ${type}`;
  span.textContent = text;
  return span;
}

function makeDiffGroup(label, entries, type) {
  const details = document.createElement('details');
  details.className = 'history-diff-group';
  details.open = false;
  const summary = document.createElement('summary');
  summary.textContent = `${label} (${entries.length})`;
  details.appendChild(summary);

  for (const entry of entries) {
    const row = document.createElement('div');
    row.className = 'history-diff-entry';
    const title = document.createElement('span');
    title.className = 'history-diff-entry-title';
    title.textContent = entry.title || entry.path;
    row.appendChild(title);
    if (entry.url) {
      const url = document.createElement('span');
      url.className = 'history-diff-entry-url';
      url.textContent = entry.url;
      row.appendChild(url);
    }
    details.appendChild(row);
  }
  return details;
}

function makeChangedGroup(label, entries) {
  const details = document.createElement('details');
  details.className = 'history-diff-group';
  details.open = false;
  const summary = document.createElement('summary');
  summary.textContent = `${label} (${entries.length})`;
  details.appendChild(summary);

  for (const entry of entries) {
    const row = document.createElement('div');
    row.className = 'history-diff-entry';

    const title = document.createElement('span');
    title.className = 'history-diff-entry-title';
    title.textContent = entry.title || entry.path;
    row.appendChild(title);

    if (entry.url) {
      const url = document.createElement('span');
      url.className = 'history-diff-entry-url';
      url.textContent = entry.url;
      row.appendChild(url);
    }

    if (entry.oldTitle && entry.oldTitle !== entry.title) {
      const old = document.createElement('span');
      old.className = 'history-diff-entry-old';
      old.textContent = entry.oldTitle;
      row.appendChild(old);
    }
    if (entry.oldUrl && entry.oldUrl !== entry.url) {
      const old = document.createElement('span');
      old.className = 'history-diff-entry-old';
      old.textContent = entry.oldUrl;
      row.appendChild(old);
    }

    details.appendChild(row);
  }
  return details;
}

function updateUndoButton(commits) {
  if (!historyUndoBtn) return;
  if (commits.length >= 2) {
    historyUndoBtn.disabled = false;
    historyUndoBtn.dataset.sha = commits[1].sha;
  } else {
    historyUndoBtn.disabled = true;
    delete historyUndoBtn.dataset.sha;
  }
}

export function initHistory() {
  historyLoadBtn?.addEventListener('click', async () => {
    historyStatus.textContent = '';
    historyLoadBtn.disabled = true;
    closeAllInlineDiffPanels();
    try {
      const [historyResp, statusResp] = await Promise.all([
        chrome.runtime.sendMessage({ action: 'listSyncHistory', perPage: 20 }),
        chrome.runtime.sendMessage({ action: 'getStatus' }),
      ]);
      if (!historyResp.success) {
        historyStatus.textContent = historyResp.message || 'Failed to load history';
        return;
      }
      currentCommitSha = statusResp?.lastCommitSha || null;
      renderHistoryList(historyResp.commits || []);
      updateUndoButton(historyResp.commits || []);
    } catch (err) {
      historyStatus.textContent = err.message;
    } finally {
      historyLoadBtn.disabled = false;
    }
  });

  historyUndoBtn?.addEventListener('click', async () => {
    let sha = historyUndoBtn.dataset.sha;
    if (!sha) {
      const resp = await chrome.runtime.sendMessage({ action: 'getPreviousCommitSha' });
      sha = resp?.sha;
    }
    if (!sha) return;
    historyUndoBtn.disabled = true;
    historyStatus.textContent = getMessage('options_historyRestoring') || 'Restoring…';
    try {
      const resp = await chrome.runtime.sendMessage({ action: 'restoreFromCommit', commitSha: sha });
      historyStatus.textContent = resp.message || '';
    } catch (err) {
      historyStatus.textContent = err.message;
    } finally {
      historyUndoBtn.disabled = false;
    }
  });

  (async () => {
    try {
      const resp = await chrome.runtime.sendMessage({ action: 'getPreviousCommitSha' });
      if (resp?.sha && historyUndoBtn) {
        historyUndoBtn.disabled = false;
        historyUndoBtn.dataset.sha = resp.sha;
      }
    } catch { /* ignore */ }
  })();
}
