/**
 * Options Page – Profile Management
 * Handles profile switching, adding, renaming, and deleting.
 */

import { getMessage } from '../lib/i18n.js';
import {
  getProfiles,
  getActiveProfileId,
  saveProfile,
  addProfile,
  deleteProfile,
  switchProfile,
  MAX_PROFILES,
} from '../lib/profile-manager.js';

const profileSelect = document.getElementById('profile-select');
const profileAddBtn = document.getElementById('profile-add-btn');
const profileRenameBtn = document.getElementById('profile-rename-btn');
const profileDeleteBtn = document.getElementById('profile-delete-btn');
const profileLimitEl = document.getElementById('profile-limit');
const profileSpinner = document.getElementById('profile-spinner');
const profileSwitchingMsg = document.getElementById('profile-switching-msg');
const profileSwitchWithoutConfirmInput = document.getElementById('profile-switch-without-confirm');
const profileSwitchConfirm = document.getElementById('profile-switch-confirm');
const profileSwitchConfirmText = document.getElementById('profile-switch-confirm-text');
const profileSwitchConfirmBtn = document.getElementById('profile-switch-confirm-btn');
const profileDeleteConfirm = document.getElementById('profile-delete-confirm');
const profileDeleteConfirmText = document.getElementById('profile-delete-confirm-text');
const profileDeleteConfirmBtn = document.getElementById('profile-delete-confirm-btn');
const profileDeleteCancelBtn = document.getElementById('profile-delete-cancel-btn');
const profileAddDialog = document.getElementById('profile-add-dialog');
const profileAddNameInput = document.getElementById('profile-add-name-input');
const profileAddConfirmBtn = document.getElementById('profile-add-confirm-btn');
const profileAddCancelBtn = document.getElementById('profile-add-cancel-btn');
const profileRenameDialog = document.getElementById('profile-rename-dialog');
const profileRenameInput = document.getElementById('profile-rename-input');
const profileRenameConfirmBtn = document.getElementById('profile-rename-confirm-btn');
const profileRenameCancelBtn = document.getElementById('profile-rename-cancel-btn');
const profileMessage = document.getElementById('profile-message');
const profileSwitchCancelBtn = document.getElementById('profile-switch-cancel-btn');

let pendingProfileSwitchId = null;
let _loadSettings = null;
let _saveSettings = null;
let _showSaveResult = null;

function setProfileButtonsEnabled(enabled) {
  profileSelect.disabled = !enabled;
  profileAddBtn.disabled = !enabled;
  profileRenameBtn.disabled = !enabled;
  profileDeleteBtn.disabled = !enabled;
}

async function doProfileSwitch(targetId) {
  const activeId = await getActiveProfileId();
  if (targetId === activeId) return;
  profileSwitchConfirm.style.display = 'none';
  pendingProfileSwitchId = null;

  try {
    setProfileButtonsEnabled(false);
    profileSpinner.style.display = 'inline-block';
    profileSwitchingMsg.textContent = getMessage('options_profileSwitching');
    profileSwitchingMsg.style.display = '';
    await switchProfile(targetId);
    await _loadSettings();
  } catch (err) {
    showProfileMessage(getMessage('options_error', [err.message]));
    profileSelect.value = activeId;
  } finally {
    setProfileButtonsEnabled(true);
    profileSpinner.style.display = 'none';
    profileSwitchingMsg.style.display = 'none';
  }
}

export function showProfileMessage(message, isError = true) {
  profileMessage.textContent = message;
  profileMessage.style.display = '';
  profileMessage.className = 'profile-message' + (isError ? ' error' : '');
  setTimeout(() => {
    profileMessage.style.display = 'none';
  }, 5000);
}

async function hideProfileDialogs() {
  profileSwitchConfirm.style.display = 'none';
  profileDeleteConfirm.style.display = 'none';
  profileAddDialog.style.display = 'none';
  profileRenameDialog.style.display = 'none';
  pendingProfileSwitchId = null;
  const activeId = await getActiveProfileId();
  profileSelect.value = activeId;
}

export function initProfiles({ loadSettings, saveSettings, showSaveResult }) {
  _loadSettings = loadSettings;
  _saveSettings = saveSettings;
  _showSaveResult = showSaveResult;

  profileSelect.addEventListener('change', async (e) => {
    const targetId = e.target.value;
    const activeId = await getActiveProfileId();
    if (targetId === activeId) return;

    const profiles = await getProfiles();
    const targetProfile = profiles[targetId];
    if (!targetProfile) return;

    if (profileSwitchWithoutConfirmInput.checked) {
      await doProfileSwitch(targetId);
      return;
    }

    pendingProfileSwitchId = targetId;
    profileSwitchConfirmText.textContent = getMessage('options_profileSwitchConfirm', [targetProfile.name || targetId]);
    profileSwitchConfirm.style.display = '';
  });

  profileSwitchConfirmBtn.addEventListener('click', async () => {
    if (pendingProfileSwitchId) {
      await doProfileSwitch(pendingProfileSwitchId);
    }
  });

  profileSwitchCancelBtn.addEventListener('click', async () => {
    const activeId = await getActiveProfileId();
    profileSelect.value = activeId;
    profileSwitchConfirm.style.display = 'none';
    pendingProfileSwitchId = null;
  });

  profileSwitchWithoutConfirmInput.addEventListener('change', async () => {
    if (profileSwitchWithoutConfirmInput.checked) {
      profileSwitchConfirm.style.display = 'none';
      pendingProfileSwitchId = null;
      const activeId = await getActiveProfileId();
      profileSelect.value = activeId;
    }
    await _saveSettings();
  });

  profileAddBtn.addEventListener('click', async () => {
    await hideProfileDialogs();
    profileAddNameInput.value = '';
    profileAddDialog.style.display = 'flex';
    profileAddNameInput.focus();
  });

  profileAddNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') profileAddConfirmBtn.click();
  });

  profileRenameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') profileRenameConfirmBtn.click();
  });

  profileAddConfirmBtn.addEventListener('click', async () => {
    const name = profileAddNameInput.value?.trim();
    if (!name) return;
    profileAddDialog.style.display = 'none';
    try {
      const newId = await addProfile(name);
      setProfileButtonsEnabled(false);
      profileSpinner.style.display = 'inline-block';
      profileSwitchingMsg.textContent = getMessage('options_profileSwitching');
      profileSwitchingMsg.style.display = '';
      try {
        await switchProfile(newId, { skipConfirm: true });
        await _loadSettings();
      } finally {
        setProfileButtonsEnabled(true);
        profileSpinner.style.display = 'none';
        profileSwitchingMsg.style.display = 'none';
      }
    } catch (err) {
      setProfileButtonsEnabled(true);
      profileSpinner.style.display = 'none';
      profileSwitchingMsg.style.display = 'none';
      showProfileMessage(getMessage('options_error', [err.message]));
    }
  });

  profileAddCancelBtn.addEventListener('click', () => {
    profileAddDialog.style.display = 'none';
  });

  profileDeleteBtn.addEventListener('click', async () => {
    const selectedId = profileSelect.value;
    const profiles = await getProfiles();
    const profile = profiles[selectedId];
    if (!profile || Object.keys(profiles).length <= 1) return;

    await hideProfileDialogs();
    profileDeleteConfirmText.textContent = getMessage('options_profileDeleteConfirm', [profile.name || selectedId]);
    profileDeleteConfirm.style.display = 'flex';
    profileDeleteConfirm.dataset.pendingId = selectedId;
  });

  profileDeleteConfirmBtn.addEventListener('click', async () => {
    const selectedId = profileDeleteConfirm.dataset.pendingId;
    profileDeleteConfirm.style.display = 'none';
    delete profileDeleteConfirm.dataset.pendingId;
    if (!selectedId) return;

    try {
      await deleteProfile(selectedId);
      await _loadSettings();
    } catch (err) {
      showProfileMessage(getMessage('options_error', [err.message]));
    }
  });

  profileDeleteCancelBtn.addEventListener('click', () => {
    profileDeleteConfirm.style.display = 'none';
    delete profileDeleteConfirm.dataset.pendingId;
  });

  profileRenameBtn.addEventListener('click', async () => {
    const selectedId = profileSelect.value;
    const profiles = await getProfiles();
    const profile = profiles[selectedId];
    if (!profile) return;

    await hideProfileDialogs();
    profileRenameInput.value = profile.name || selectedId;
    profileRenameDialog.style.display = 'flex';
    profileRenameInput.focus();
    profileRenameDialog.dataset.pendingId = selectedId;
  });

  profileRenameConfirmBtn.addEventListener('click', async () => {
    const selectedId = profileRenameDialog.dataset.pendingId;
    const newName = profileRenameInput.value?.trim();
    profileRenameDialog.style.display = 'none';
    delete profileRenameDialog.dataset.pendingId;
    if (!selectedId || !newName) return;

    try {
      await saveProfile(selectedId, { name: newName });
      await _loadSettings();
      _showSaveResult(getMessage('options_settingsSaved'), 'success');
    } catch (err) {
      showProfileMessage(getMessage('options_error', [err.message]));
    }
  });

  profileRenameCancelBtn.addEventListener('click', () => {
    profileRenameDialog.style.display = 'none';
    delete profileRenameDialog.dataset.pendingId;
  });
}
