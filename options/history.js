/**
 * Options Page – Sync History & Restore
 * Handles commit history listing, diff preview, and bookmark restore.
 */

import { getMessage } from '../lib/i18n.js';

const historyLoadBtn = document.getElementById('history-load-btn');
const historyUndoBtn = document.getElementById('history-undo-btn');
const historyStatus = document.getElementById('history-status');
const historyList = document.getElementById('history-list');

let currentCommitSha = null;

const HISTORY_RESTORE_ARM_MS = 10000;

function renderHistoryList(commits) {
  historyList.innerHTML = '';
  if (commits.length === 0) {
    historyList.style.display = 'none';
    historyStatus.textContent = getMessage('options_historyEmpty') || 'No commits found.';
    return;
  }
  historyList.style.display = '';
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
    msg.textContent = c.message || '';

    const spacer = document.createElement('span');
    spacer.className = 'history-spacer';

    row.append(date, sha, msg, spacer);

    const diffSlot = document.createElement('div');
    diffSlot.className = 'history-item-diff';
    diffSlot.style.display = 'none';
    diffSlot.setAttribute('aria-hidden', 'true');

    const isCurrent = currentCommitSha && c.sha === currentCommitSha;
    if (isCurrent) {
      const badge = document.createElement('span');
      badge.className = 'history-current';
      badge.textContent = getMessage('options_historyCurrent') || 'current';
      row.appendChild(badge);
    } else {
      const actions = document.createElement('div');
      actions.className = 'history-item-actions';

      const restoreRowBtn = document.createElement('button');
      restoreRowBtn.type = 'button';
      restoreRowBtn.className = 'btn btn-primary btn-sm';
      restoreRowBtn.textContent = getMessage('options_historyRestoreBtn') || 'Restore';
      bindTwoStepRestore(restoreRowBtn, async () => runRestoreFromCommit(c.sha, wrap));

      const previewBtn = document.createElement('button');
      previewBtn.type = 'button';
      previewBtn.className = 'btn btn-secondary btn-sm';
      previewBtn.textContent = getMessage('options_historyPreviewBtn') || 'Preview';
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
}

/**
 * Two-step confirm on the same Restore button: first click arms, second click runs executeRestore.
 */
function bindTwoStepRestore(button, executeRestore) {
  let armed = false;
  let resetTimer = null;
  const labelRestore = getMessage('options_historyRestoreBtn') || 'Restore';
  const labelConfirm = getMessage('options_historyRestoreConfirmBtn') || 'Click again to confirm';

  function reset() {
    armed = false;
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
    button.textContent = labelRestore;
    button.classList.remove('history-restore-armed');
  }

  button._historyRestoreReset = reset;

  button.addEventListener('click', async () => {
    if (button.disabled) return;
    if (!armed) {
      armed = true;
      button.textContent = labelConfirm;
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
