/**
 * Options – clean remote orphan bookmark files (replace push vs local baseline)
 */

import { getMessage } from '../lib/i18n.js';

const previewBtn = document.getElementById('clean-orphans-preview-btn');
const runBtn = document.getElementById('clean-orphans-run-btn');
const resultEl = document.getElementById('clean-orphans-result');
const spinner = document.getElementById('clean-orphans-spinner');

let lastPreview = null;

function formatPreview(preview) {
  if (!preview.success) return preview.message || getMessage('cleanOrphans_previewFailed');
  if (preview.orphanFileCount === 0) return getMessage('cleanOrphans_none');
  let text = getMessage('cleanOrphans_previewResult', [
    String(preview.orphanFileCount),
    String(preview.orphanFolderCount),
  ]);
  if (preview.sampleFolders?.length) {
    text += ` (${preview.sampleFolders.join(', ')})`;
  }
  return text;
}

async function runPreview() {
  if (previewBtn) previewBtn.disabled = true;
  if (runBtn) runBtn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';
  if (resultEl) resultEl.textContent = '';
  try {
    const preview = await chrome.runtime.sendMessage({ action: 'previewRemoteOrphans' });
    lastPreview = preview;
    if (resultEl) {
      resultEl.textContent = formatPreview(preview);
      resultEl.className = preview.success && preview.orphanFileCount > 0
        ? 'validation-result warning'
        : 'validation-result';
    }
    if (runBtn) runBtn.disabled = !preview.success || preview.orphanFileCount === 0;
  } catch (err) {
    if (resultEl) resultEl.textContent = err.message;
    lastPreview = null;
    if (runBtn) runBtn.disabled = true;
  } finally {
    if (previewBtn) previewBtn.disabled = false;
    if (spinner) spinner.style.display = 'none';
  }
}

async function runCleanup() {
  if (!lastPreview?.success || lastPreview.orphanFileCount === 0) {
    await runPreview();
    if (!lastPreview?.success || lastPreview.orphanFileCount === 0) return;
  }

  const confirmed = window.confirm(getMessage('cleanOrphans_confirm', [
    String(lastPreview.orphanFileCount),
    String(lastPreview.orphanFolderCount),
  ]));
  if (!confirmed) return;

  if (runBtn) runBtn.disabled = true;
  if (previewBtn) previewBtn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';
  try {
    const result = await chrome.runtime.sendMessage({ action: 'cleanRemoteOrphans' });
    if (resultEl) {
      resultEl.textContent = result.message || (result.success ? getMessage('cleanOrphans_success', ['0', '0']) : 'Failed');
      resultEl.className = result.success ? 'validation-result success' : 'validation-result error';
    }
    lastPreview = null;
  } catch (err) {
    if (resultEl) resultEl.textContent = err.message;
  } finally {
    if (previewBtn) previewBtn.disabled = false;
    if (runBtn) runBtn.disabled = true;
    if (spinner) spinner.style.display = 'none';
  }
}

export function initRemoteCleanup() {
  if (!previewBtn || !runBtn) return;
  previewBtn.addEventListener('click', runPreview);
  runBtn.addEventListener('click', runCleanup);
}
