import { initI18n, applyI18n, getMessage } from './lib/i18n.js';

const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const searchStatus = document.getElementById('search-status');
const searchResults = document.getElementById('search-results');

let searchTimer = null;

function setStatus(message = '', type = '') {
  searchStatus.textContent = message;
  searchStatus.className = type ? `search-status ${type}` : 'search-status';
}

function renderResults(items) {
  searchResults.innerHTML = '';
  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'search-result-item';

    const info = document.createElement('div');
    info.className = 'search-result-info';

    const title = document.createElement('div');
    title.className = 'search-result-title';
    title.textContent = item.title || item.url;
    info.appendChild(title);

    const url = document.createElement('div');
    url.className = 'search-result-url';
    url.textContent = item.url || '';
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
    renderResults(matches);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await initI18n();
  applyI18n();

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get('q') || '';
  searchInput.value = initialQuery;
  searchInput.focus();
  if (initialQuery) runSearch(initialQuery);
});

searchInput.addEventListener('input', (e) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => runSearch(e.target.value), 150);
});

searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  setStatus('');
  renderResults([]);
  searchInput.focus();
});
