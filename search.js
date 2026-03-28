import { initI18n, applyI18n, getMessage } from './lib/i18n.js';
import { initTheme } from './lib/theme.js';
import { initUiDensity } from './lib/ui-density.js';

const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const searchCloseBtn = document.getElementById('search-close-btn');
const searchStatus = document.getElementById('search-status');
const searchResults = document.getElementById('search-results');
const searchSyncBtn = document.getElementById('search-sync-btn');

let searchTimer = null;

function updateClearButtonVisibility(value) {
  const hasValue = String(value || '').trim().length > 0;
  searchClearBtn.classList.toggle('hidden', !hasValue);
}

function setStatus(message = '', type = '') {
  searchStatus.textContent = message;
  searchStatus.className = type ? `search-status ${type}` : 'search-status';
}

function highlightText(text, query) {
  if (!query) return document.createTextNode(text);
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index === -1) return document.createTextNode(text);

  const before = text.substring(0, index);
  const match = text.substring(index, index + query.length);
  const after = text.substring(index + query.length);

  // Create safe nodes to prevent XSS
  const fragment = document.createDocumentFragment();
  if (before) fragment.appendChild(document.createTextNode(before));
  const mark = document.createElement('mark');
  mark.textContent = match;
  fragment.appendChild(mark);
  if (after) {
    // recursively highlight remaining text
    fragment.appendChild(highlightText(after, query));
  }
  return fragment;
}

function renderResults(items, query) {
  searchResults.innerHTML = '';
  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'search-result-item';

    const info = document.createElement('div');
    info.className = 'search-result-info';

    const title = document.createElement('div');
    title.className = 'search-result-title';
    const cleanTitle = item.title || item.url;

    if (query) {
      title.appendChild(highlightText(cleanTitle, query));
    } else {
      title.textContent = cleanTitle;
    }
    info.appendChild(title);

    const url = document.createElement('div');
    url.className = 'search-result-url';
    const cleanUrl = item.url || '';
    if (query) {
      url.appendChild(highlightText(cleanUrl, query));
    } else {
      url.textContent = cleanUrl;
    }
    info.appendChild(url);

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'search-open-btn';
    openBtn.textContent = getMessage('search_openBtn');
    openBtn.addEventListener('click', () => {
      if (!item.url) return;
      chrome.tabs.create({ url: item.url });
    });

    li.appendChild(info);
    li.appendChild(openBtn);
    searchResults.appendChild(li);
  }
}

function runSearch(query) {
  const term = String(query || '').trim();
  if (!term) {
    setStatus('');
    renderResults([]);
    return;
  }

  setStatus(getMessage('search_statusSearching'));
  chrome.bookmarks.search(term, (results) => {
    const matches = (results || []).filter((node) => !!node.url).slice(0, 60);
    if (matches.length === 0) {
      setStatus(getMessage('search_statusNoResults'));
      renderResults([]);
      return;
    }
    setStatus(getMessage('search_statusResultCount', [String(matches.length)]), 'success');
    renderResults(matches, term);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await initTheme();
  await initUiDensity();
  await initI18n();
  applyI18n();
  document.title = getMessage('search_windowTitle');
  searchCloseBtn.setAttribute('aria-label', getMessage('search_closeBtn'));
  searchCloseBtn.setAttribute('title', getMessage('search_closeBtn'));
  searchClearBtn.setAttribute('aria-label', getMessage('search_clearBtn'));
  searchClearBtn.setAttribute('title', getMessage('search_clearBtn'));

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get('q') || '';
  searchInput.value = initialQuery;
  updateClearButtonVisibility(initialQuery);
  searchInput.focus();
  if (initialQuery) runSearch(initialQuery);
});

searchInput.addEventListener('input', (e) => {
  updateClearButtonVisibility(e.target.value);
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => runSearch(e.target.value), 150);
});

searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  updateClearButtonVisibility('');
  setStatus('');
  renderResults([]);
  searchInput.focus();
});

searchCloseBtn.addEventListener('click', () => {
  window.close();
});

searchSyncBtn.addEventListener('click', () => {
  setStatus(getMessage('search_statusSearching') || 'Syncing...', 'success');
  searchSyncBtn.disabled = true;
  chrome.runtime.sendMessage({ action: 'sync' }, (response) => {
    searchSyncBtn.disabled = false;
    if (response && response.success) {
      setStatus('Sync complete', 'success');
      // re-run current search if any
      if (searchInput.value) {
        runSearch(searchInput.value);
      }
    } else {
      setStatus('Sync failed: ' + (response?.message || 'Unknown error'), 'error');
    }
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  window.close();
});
