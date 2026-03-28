/**
 * Linkwarden Save Popup
 *
 * Opened from the context menu "Save to Linkwarden..." action.
 * Lets the user customise collection, tags, description, and screenshot
 * before saving a link to their Linkwarden instance.
 */

import { initI18n, applyI18n, getMessage } from './lib/i18n.js';
import { initTheme } from './lib/theme.js';
import { initUiDensity } from './lib/ui-density.js';
import { LinkwardenAPI } from './lib/linkwarden-api.js';
import { decryptToken } from './lib/crypto.js';

// ---- DOM refs ----
const form = document.getElementById('lw-form');
const urlInput = document.getElementById('lw-url');
const titleInput = document.getElementById('lw-title');
const descInput = document.getElementById('lw-description');
const collectionSelect = document.getElementById('lw-collection');
const collectionNewBtn = document.getElementById('lw-collection-new-btn');
const collectionNewRow = document.getElementById('lw-collection-new-row');
const collectionNewInput = document.getElementById('lw-collection-new-input');
const collectionNewConfirm = document.getElementById('lw-collection-new-confirm');
const collectionNewCancel = document.getElementById('lw-collection-new-cancel');
const tagChips = document.getElementById('lw-tag-chips');
const tagInput = document.getElementById('lw-tag-input');
const tagCloud = document.getElementById('lw-tag-cloud');
const screenshotCheck = document.getElementById('lw-screenshot');
const saveBtn = document.getElementById('lw-save-btn');
const quickSaveBtn = document.getElementById('lw-quick-save-btn');
const cancelBtn = document.getElementById('lw-cancel-btn');
const deleteBtn = document.getElementById('lw-delete-btn');
const closeBtn = document.getElementById('lw-close-btn');
const statusEl = document.getElementById('lw-status');
const duplicateBadge = document.getElementById('lw-duplicate-badge');

// ---- State ----
let api = null;
let allTags = []; // { id, name } from API
let selectedTags = []; // string[]
let sourceTabId = null;
let sourceWindowId = null;
let duplicateLinkId = null;

// ---- Initialization ----

document.addEventListener('DOMContentLoaded', async () => {
    await initTheme();
    await initUiDensity();
    await initI18n();
    applyI18n();
    document.title = getMessage('linkwardenSave_title') || 'Save to Linkwarden';

    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    urlInput.value = params.get('url') || '';
    titleInput.value = params.get('title') || '';
    sourceTabId = params.get('tabId') ? parseInt(params.get('tabId'), 10) : null;
    sourceWindowId = params.get('windowId') ? parseInt(params.get('windowId'), 10) : null;

    // Init API
    try {
        const globals = await chrome.storage.sync.get({
            linkwardenUrl: '',
            linkwardenToken: '',
            linkwardenDefaultCollection: '',
            linkwardenDefaultTags: '',
            linkwardenDefaultScreenshot: false
        });

        screenshotCheck.checked = globals.linkwardenDefaultScreenshot === true;

        if (!globals.linkwardenUrl || !globals.linkwardenToken) {
            setStatus(getMessage('linkwardenSave_statusError') || 'Linkwarden not configured', 'error');
            saveBtn.disabled = true;
            return;
        }

        const token = await decryptToken(globals.linkwardenToken);
        api = new LinkwardenAPI(globals.linkwardenUrl, token);

        // Load data in parallel
        const [collectionsRes, tagsRes, lastDefaults] = await Promise.all([
            api.getCollections().catch(() => null),
            api.getTags().catch(() => null),
            chrome.storage.local.get({ linkwardenLastCollection: '', linkwardenLastTags: [] })
        ]);

        // Populate collections
        if (collectionsRes?.response) {
            const defaultCol = globals.linkwardenDefaultCollection || lastDefaults.linkwardenLastCollection || '';
            for (const c of collectionsRes.response) {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                if (c.id.toString() === defaultCol.toString()) opt.selected = true;
                collectionSelect.appendChild(opt);
            }
        }

        // Store tags for cloud
        if (tagsRes?.response) {
            allTags = tagsRes.response.map(t => ({ id: t.id, name: t.name }));
        }

        // Pre-fill tags from defaults
        let defaultTagNames = (globals.linkwardenDefaultTags || '').split(',').map(t => t.trim()).filter(Boolean);
        if (defaultTagNames.length === 0 && lastDefaults.linkwardenLastTags && lastDefaults.linkwardenLastTags.length > 0) {
            defaultTagNames = lastDefaults.linkwardenLastTags;
        }
        for (const tag of defaultTagNames) {
            addTag(tag);
        }

        // Render the tag cloud
        renderTagCloud();

        // Check for duplicate
        if (urlInput.value) {
            const existing = await api.getLinkByUrl(urlInput.value).catch(() => null);
            if (existing) {
                duplicateLinkId = existing.id;
                duplicateBadge.classList.remove('hidden');
            }
        }

    } catch (err) {
        setStatus('Error: ' + err.message, 'error');
        saveBtn.disabled = true;
    }

    titleInput.focus();
    titleInput.select();
});

// ---- Status ----

function setStatus(msg, type = '') {
    statusEl.textContent = msg;
    statusEl.className = type ? `lw-status ${type}` : 'lw-status';
}

// ---- Tags ----

function addTag(name) {
    const normalized = name.trim();
    if (!normalized || selectedTags.includes(normalized)) return;
    selectedTags.push(normalized);
    renderTagChips();
    renderTagCloud();
    tagInput.value = '';
}

function removeTag(name) {
    selectedTags = selectedTags.filter(t => t !== name);
    renderTagChips();
    renderTagCloud();
}

function renderTagChips() {
    tagChips.innerHTML = '';
    for (const tag of selectedTags) {
        const chip = document.createElement('span');
        chip.className = 'lw-tag-chip';
        chip.textContent = tag;
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'lw-tag-chip-remove';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => removeTag(tag));
        chip.appendChild(removeBtn);
        tagChips.appendChild(chip);
    }
}

function renderTagCloud(filter = '') {
    tagCloud.innerHTML = '';
    const q = filter.toLowerCase().trim();

    // Show all existing tags (filtered, excluding already selected)
    const available = allTags
        .filter(t => !selectedTags.includes(t.name))
        .filter(t => !q || t.name.toLowerCase().includes(q));

    for (const tag of available) {
        const pill = document.createElement('span');
        pill.className = 'lw-tag-cloud-item';
        pill.textContent = tag.name;
        pill.addEventListener('click', () => addTag(tag.name));
        tagCloud.appendChild(pill);
    }

    // If typing something that doesn't exactly match any tag, offer to create it
    if (q && !allTags.some(t => t.name.toLowerCase() === q) && !selectedTags.some(t => t.toLowerCase() === q)) {
        const createPill = document.createElement('span');
        createPill.className = 'lw-tag-cloud-item lw-tag-cloud-new';
        createPill.textContent = `+ "${filter.trim()}"`;
        createPill.addEventListener('click', () => addTag(filter.trim()));
        tagCloud.appendChild(createPill);
    }
}

tagInput.addEventListener('input', () => renderTagCloud(tagInput.value));

tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
        if (tagInput.value.trim()) {
            e.preventDefault();
            addTag(tagInput.value);
        }
    } else if (e.key === 'Backspace' && !tagInput.value && selectedTags.length > 0) {
        removeTag(selectedTags[selectedTags.length - 1]);
    }
});

// Click on tags container focuses the input
document.querySelector('.lw-tags-wrap').addEventListener('click', (e) => {
    if (e.target === e.currentTarget || e.target === tagChips) {
        tagInput.focus();
    }
});

// ---- Collection: create new ----

collectionNewBtn.addEventListener('click', () => {
    collectionNewRow.classList.remove('hidden');
    collectionNewInput.focus();
});

collectionNewCancel.addEventListener('click', () => {
    collectionNewRow.classList.add('hidden');
    collectionNewInput.value = '';
});

collectionNewConfirm.addEventListener('click', async () => {
    const name = collectionNewInput.value.trim();
    if (!name || !api) return;

    collectionNewConfirm.disabled = true;
    try {
        const res = await api.createCollection(name);
        const newId = res?.response?.id;
        if (newId) {
            const opt = document.createElement('option');
            opt.value = newId;
            opt.textContent = name;
            opt.selected = true;
            collectionSelect.appendChild(opt);
        }
        collectionNewRow.classList.add('hidden');
        collectionNewInput.value = '';
    } catch (err) {
        setStatus('Collection error: ' + err.message, 'error');
    } finally {
        collectionNewConfirm.disabled = false;
    }
});

collectionNewInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        collectionNewConfirm.click();
    } else if (e.key === 'Escape') {
        collectionNewCancel.click();
    }
});

// ---- Save ----

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!api) return;

    saveBtn.disabled = true;
    saveBtn.classList.add('loading');
    setStatus(getMessage('linkwardenSave_statusSaving') || 'Saving...', '');

    try {
        const url = urlInput.value;
        const name = titleInput.value.trim() || url;
        const description = descInput.value.trim();
        const collectionId = collectionSelect.value || undefined;
        const tags = selectedTags;

        const linkRes = await api.saveLink({ url, name, description, collectionId, tags });
        const linkId = linkRes?.response?.id || linkRes?.id;

        // Screenshot
        if (screenshotCheck.checked && linkId && sourceTabId) {
            try {
                const dataUrl = await chrome.runtime.sendMessage({
                    action: 'captureScreenshot',
                    tabId: sourceTabId,
                    windowId: sourceWindowId
                });
                if (dataUrl) {
                    const base64Data = dataUrl.split(',')[1];
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: 'image/png' });
                    await api.uploadScreenshot(linkId, blob);
                }
            } catch (screenshotErr) {
                console.warn('[LinkwardenSave] Screenshot failed:', screenshotErr);
                // Still count as success – link was saved
            }
        }

        // Remember defaults
        await chrome.storage.local.set({
            linkwardenLastCollection: collectionId || '',
            linkwardenLastTags: selectedTags
        });

        setStatus(getMessage('linkwardenSave_statusSaved') || 'Saved!', 'success');

        // Close after brief success message
        setTimeout(() => window.close(), 800);

    } catch (err) {
        setStatus((getMessage('linkwardenSave_statusError') || 'Error') + ': ' + err.message, 'error');
        saveBtn.disabled = false;
        saveBtn.classList.remove('loading');
    }
});

// ---- Quick Save ----

quickSaveBtn.addEventListener('click', async () => {
    if (!api) return;

    quickSaveBtn.disabled = true;
    quickSaveBtn.classList.add('loading');
    saveBtn.disabled = true;
    setStatus(getMessage('linkwardenSave_statusSaving') || 'Saving...', '');

    try {
        const url = urlInput.value;
        const name = titleInput.value.trim() || url;
        // Use currently loaded defaults from the UI (collection dropdown + tag chips)
        const collectionId = collectionSelect.value || undefined;
        const tags = selectedTags;

        await api.saveLink({ url, name, collectionId, tags });

        // Remember defaults
        await chrome.storage.local.set({
            linkwardenLastCollection: collectionId || '',
            linkwardenLastTags: selectedTags
        });

        setStatus(getMessage('linkwardenSave_statusSaved') || 'Saved!', 'success');
        setTimeout(() => window.close(), 600);
    } catch (err) {
        setStatus((getMessage('linkwardenSave_statusError') || 'Error') + ': ' + err.message, 'error');
        quickSaveBtn.disabled = false;
        quickSaveBtn.classList.remove('loading');
        saveBtn.disabled = false;
    }
});

// ---- Cancel / Close ----

cancelBtn.addEventListener('click', () => window.close());
closeBtn.addEventListener('click', () => window.close());

deleteBtn.addEventListener('click', async () => {
    if (!duplicateLinkId || !api) return;

    const confirmed = confirm(getMessage('linkwardenSave_deleteConfirm') || 'Are you sure you want to delete this link?');
    if (!confirmed) return;

    deleteBtn.disabled = true;
    deleteBtn.textContent = '...';

    try {
        await api.deleteLink(duplicateLinkId);
        duplicateLinkId = null;
        duplicateBadge.classList.add('hidden');
        setStatus(getMessage('linkwardenSave_statusDeleted') || 'Link deleted successfully', 'success');
    } catch (err) {
        setStatus('Error: ' + err.message, 'error');
        deleteBtn.disabled = false;
        deleteBtn.textContent = getMessage('linkwardenSave_deleteBtn') || 'Delete';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        e.preventDefault();
        window.close();
    }
});
