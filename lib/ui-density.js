/**
 * UI Density
 * Three density levels: compact, medium (default), large.
 * Stored in chrome.storage.sync as "uiDensity".
 * Sets data-ui-density attribute on <html> for CSS token selection.
 */

const STORAGE_KEY = 'uiDensity';
const VALID = ['compact', 'medium', 'large'];
const DEFAULT = 'medium';

function normalize(value) {
  return VALID.includes(value) ? value : DEFAULT;
}

function apply(density) {
  document.documentElement.setAttribute('data-ui-density', density);
}

export async function initUiDensity() {
  const result = await chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT });
  apply(normalize(result[STORAGE_KEY]));
}

export function applyUiDensity(density) {
  const d = normalize(density);
  apply(d);
  chrome.storage.sync.set({ [STORAGE_KEY]: d });
}
