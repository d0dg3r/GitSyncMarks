/**
 * Files tab: full extension data reset (sync + local storage).
 * @param {{ resetBtn: HTMLElement | null, resetConfirmDialog: HTMLElement | null }} els
 */
export function initFactoryReset(els) {
  const { resetBtn, resetConfirmDialog } = els;
  const resetConfirmBtn = document.getElementById('btn-reset-confirm');
  const resetCancelBtn = document.getElementById('btn-reset-cancel');

  resetBtn?.addEventListener('click', () => {
    if (!resetBtn || !resetConfirmDialog) return;
    resetBtn.style.display = 'none';
    resetConfirmDialog.style.display = 'flex';
  });

  resetCancelBtn?.addEventListener('click', () => {
    if (!resetConfirmDialog || !resetBtn) return;
    resetConfirmDialog.style.display = 'none';
    resetBtn.style.display = '';
  });

  resetConfirmBtn?.addEventListener('click', async () => {
    if (!resetConfirmBtn || !resetCancelBtn) return;
    resetConfirmBtn.disabled = true;
    resetCancelBtn.disabled = true;
    try {
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      location.reload();
    } catch (err) {
      console.error('[GitSyncMarks] Reset failed:', err);
      resetConfirmBtn.disabled = false;
      resetCancelBtn.disabled = false;
      if (resetConfirmDialog) resetConfirmDialog.style.display = 'none';
      if (resetBtn) resetBtn.style.display = '';
    }
  });
}
