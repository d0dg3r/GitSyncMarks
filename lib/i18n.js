/**
 * Internationalization (i18n) Helper
 * Provides runtime language switching independent of Chrome's built-in i18n.
 * Languages can be selected manually in settings or auto-detected from the browser.
 *
 * Adding a new language:
 *   1. Create _locales/{code}/messages.json with all keys
 *   2. Add an entry to SUPPORTED_LANGUAGES below
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'pt_BR', name: 'Português (Brasil)' },
  { code: 'it', name: 'Italiano' },
  { code: 'ja', name: '日本語' },
  { code: 'zh_CN', name: '中文 (简体)' },
  { code: 'ko', name: '한국어' },
  { code: 'ru', name: 'Русский' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'pl', name: 'Polski' },
];

const DEFAULT_LANGUAGE = 'en';

let currentMessages = null;
let fallbackMessages = null;
let currentLang = DEFAULT_LANGUAGE;
let initPromise = null;

function isValidMessageEntry(entry) {
  return !!(
    entry &&
    typeof entry.message === 'string' &&
    entry.message.trim().length > 0
  );
}

async function loadMessagesForLanguage(lang) {
  const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load locale ${lang}: ${response.status}`);
  }
  return response.json();
}

function resolveMessageEntry(key) {
  const currentEntry = currentMessages?.[key];
  if (isValidMessageEntry(currentEntry)) return currentEntry;

  const fallbackEntry = fallbackMessages?.[key];
  if (isValidMessageEntry(fallbackEntry)) return fallbackEntry;

  return null;
}

/**
 * Initialize the i18n system.
 * Loads the appropriate message file based on user settings.
 * Safe to call multiple times — returns cached promise.
 * @returns {Promise<void>}
 */
export function initI18n() {
  if (initPromise) return initPromise;
  initPromise = _doInit();
  return initPromise;
}

/**
 * Internal initialization logic.
 */
async function _doInit() {
  try {
    // Always try loading English first so missing keys can reliably fall back.
    // If this fails, the extension still works but unresolved keys return key names.
    try {
      fallbackMessages = await loadMessagesForLanguage(DEFAULT_LANGUAGE);
    } catch (fallbackErr) {
      console.warn('[GitSyncMarks] Failed to load English fallback locale:', fallbackErr);
      fallbackMessages = null;
    }

    // Read language setting from storage
    const result = await chrome.storage.sync.get({ language: 'auto' });
    let lang = result.language;

    if (lang === 'auto') {
      const raw = (navigator.language || 'en').replace('-', '_');
      const exact = SUPPORTED_LANGUAGES.find(l => l.code === raw);
      if (exact) {
        lang = raw;
      } else {
        const short = raw.substring(0, 2);
        const partial = SUPPORTED_LANGUAGES.find(l => l.code === short);
        lang = partial ? short : DEFAULT_LANGUAGE;
      }
    }

    // Validate the language is supported
    if (!SUPPORTED_LANGUAGES.find(l => l.code === lang)) {
      lang = DEFAULT_LANGUAGE;
    }

    currentLang = lang;

    // For English we can directly use the fallback payload.
    if (lang === DEFAULT_LANGUAGE) {
      currentMessages = fallbackMessages || {};
      fallbackMessages = null;
      return;
    }

    try {
      currentMessages = await loadMessagesForLanguage(lang);
    } catch (langErr) {
      console.warn(`[GitSyncMarks] Failed to load locale ${lang}, falling back to English:`, langErr);
      currentLang = DEFAULT_LANGUAGE;
      currentMessages = fallbackMessages || {};
      fallbackMessages = null;
    }
  } catch (err) {
    console.error('[GitSyncMarks] Failed to initialize i18n:', err);
  }
}

/**
 * Get a translated message by key.
 * @param {string} key - Message key from messages.json
 * @param {(string|number)[]} [substitutions] - Values to replace $1, $2, etc.
 * @returns {string} Translated message, or the key itself as fallback
 */
export function getMessage(key, substitutions = []) {
  const entry = resolveMessageEntry(key);
  if (!entry) return key;

  let msg = entry.message;

  // Replace $1, $2, ... with substitution values
  if (substitutions.length > 0) {
    substitutions.forEach((sub, i) => {
      msg = msg.replace(`$${i + 1}`, String(sub));
    });
  }

  return msg;
}

/**
 * Apply translations to all elements with data-i18n attributes in the DOM.
 * Supports:
 *   data-i18n="key"             → sets textContent
 *   data-i18n-html="key"        → sets innerHTML (for trusted content with HTML tags)
 *   data-i18n-placeholder="key" → sets placeholder attribute
 *   data-i18n-title="key"       → sets title attribute
 */
export function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const msg = getMessage(key);
    if (msg && msg !== key) el.textContent = msg;
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    // Only allow keys that exist in the trusted message bundles to be used as HTML.
    const entry = resolveMessageEntry(key);
    if (!entry || !entry.message) {
      return;
    }
    const msg = entry.message;
    if (msg) {
      // Use DOMParser instead of innerHTML to avoid unsafe-assignment linter warning.
      // Content is from bundled _locales/*.json (trusted), not user input.
      const parser = new DOMParser();
      const doc = parser.parseFromString(msg, 'text/html');
      el.replaceChildren(...doc.body.childNodes);
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const msg = getMessage(key);
    if (msg && msg !== key) el.placeholder = msg;
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const msg = getMessage(key);
    if (msg && msg !== key) el.title = msg;
  });
}

/**
 * Get the currently active language code.
 * @returns {string}
 */
export function getLanguage() {
  return currentLang;
}

/**
 * Re-initialize with a (potentially new) language.
 * Call this after the user changes the language setting in options.
 * @returns {Promise<void>}
 */
export function reloadI18n() {
  initPromise = null;
  currentMessages = null;
  fallbackMessages = null;
  return initI18n();
}
