/**
 * Token Encryption Module
 * Encrypts/decrypts the GitHub PAT using AES-256-GCM with a
 * non-extractable CryptoKey stored in IndexedDB.
 *
 * Storage format: "enc:v1:<base64-iv>:<base64-ciphertext>"
 * Legacy plain-text tokens (no "enc:" prefix) are handled transparently.
 */

const OLD_DB_NAME = 'bookhub-keys';
const DB_NAME = 'gitsyncmarks-keys';
const DB_VERSION = 1;
const STORE_NAME = 'keys';
const KEY_ID = 'tokenKey';
const ENC_PREFIX = 'enc:v1:';

/**
 * Open an IndexedDB database by name (for migration).
 * @param {string} name - Database name
 * @param {number} version - Database version
 * @returns {Promise<IDBDatabase>}
 */
function openDBByName(name, version = 1) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Read CryptoKey from a database (without creating). Returns null if not found.
 * @param {string} dbName - Database name
 * @returns {Promise<CryptoKey|null>}
 */
async function getKeyFromDB(dbName) {
  try {
    const db = await openDBByName(dbName);
    const key = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_ID);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return key ?? null;
  } catch {
    return null;
  }
}

/**
 * Migrate encrypted token from bookhub-keys to gitsyncmarks-keys.
 * Decrypts with old key, re-encrypts with new key, deletes old DB.
 * @returns {Promise<string|null>} Plaintext token if migration succeeded, null otherwise
 */
async function migrateFromBookHubKeys() {
  try {
    const oldKey = await getKeyFromDB(OLD_DB_NAME);
    if (!oldKey) return null;

    const local = await chrome.storage.local.get('githubToken');
    const stored = local.githubToken;
    if (!stored || !stored.startsWith(ENC_PREFIX)) return null;

    const payload = stored.slice(ENC_PREFIX.length);
    const parts = payload.split(':');
    if (parts.length !== 2) return null;

    const iv = base64ToBuffer(parts[0]);
    const ciphertext = base64ToBuffer(parts[1]);
    let plaintext;
    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        oldKey,
        ciphertext
      );
      plaintext = new TextDecoder().decode(decrypted);
    } catch {
      return null;
    }

    const encrypted = await encryptToken(plaintext);
    await chrome.storage.local.set({ githubToken: encrypted });
    indexedDB.deleteDatabase(OLD_DB_NAME);
    console.log('[GitSyncMarks] Migrated token from bookhub-keys to gitsyncmarks-keys');
    return plaintext;
  } catch (err) {
    console.warn('[GitSyncMarks] DB migration failed:', err);
    return null;
  }
}

/**
 * Open the IndexedDB database for CryptoKey storage.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get the CryptoKey from IndexedDB, or generate and store a new one.
 * The key is AES-GCM 256-bit, non-extractable.
 * @returns {Promise<CryptoKey>}
 */
async function getOrCreateKey() {
  const db = await openDB();

  // Try to load existing key
  const existing = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(KEY_ID);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (existing) {
    db.close();
    return existing;
  }

  // Generate a new key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );

  // Store it
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(key, KEY_ID);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  db.close();
  return key;
}

/**
 * Convert an ArrayBuffer to a base64 string.
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

/**
 * Convert a base64 string to a Uint8Array.
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypt a plain-text token.
 * @param {string} plaintext - The token to encrypt
 * @returns {Promise<string>} Encrypted string in format "enc:v1:<iv>:<ciphertext>"
 */
export async function encryptToken(plaintext) {
  if (!plaintext) return '';

  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return `${ENC_PREFIX}${bufferToBase64(iv)}:${bufferToBase64(ciphertext)}`;
}

/**
 * Decrypt a stored token value.
 * If the value doesn't have the "enc:" prefix, it's treated as a
 * legacy plain-text token and returned as-is.
 * @param {string} stored - The stored (possibly encrypted) token
 * @returns {Promise<string>} The decrypted plain-text token
 */
export async function decryptToken(stored) {
  if (!stored) return '';

  // Legacy plain-text token (no encryption prefix)
  if (!stored.startsWith(ENC_PREFIX)) {
    return stored;
  }

  const payload = stored.slice(ENC_PREFIX.length);
  const parts = payload.split(':');
  if (parts.length !== 2) {
    console.warn('[GitSyncMarks] Invalid encrypted token format');
    return '';
  }

  const iv = base64ToBuffer(parts[0]);
  const ciphertext = base64ToBuffer(parts[1]);
  const key = await getOrCreateKey();

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    const migrated = await migrateFromBookHubKeys();
    if (migrated !== null) return migrated;
    console.error('[GitSyncMarks] Token decryption failed:', err);
    return '';
  }
}

/** Prefix for password-encrypted settings export. */
export const PASSWORD_ENC_PREFIX = 'gitsyncmarks-enc:v1';

/** PBKDF2 iterations for key derivation. */
const PBKDF2_ITERATIONS = 100000;

/** Salt length in bytes. */
const SALT_LEN = 16;

/**
 * Encrypt plaintext with a user password.
 * Uses PBKDF2 + AES-256-GCM. Output format (newline-separated):
 *   gitsyncmarks-enc:v1
 *   <base64-salt>
 *   <base64-iv>
 *   <base64-ciphertext>
 * @param {string} plaintext - Data to encrypt
 * @param {string} password - User password
 * @returns {Promise<string>} Encrypted string
 */
export async function encryptWithPassword(plaintext, password) {
  if (!password) throw new Error('Password is required');
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const keyBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const key = await crypto.subtle.importKey(
    'raw',
    keyBits,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return [
    PASSWORD_ENC_PREFIX,
    bufferToBase64(salt),
    bufferToBase64(iv),
    bufferToBase64(ciphertext),
  ].join('\n');
}

/**
 * Decrypt password-encrypted string.
 * @param {string} encrypted - Output from encryptWithPassword
 * @param {string} password - User password
 * @returns {Promise<string>} Decrypted plaintext
 * @throws {Error} If password is wrong or format invalid
 */
export async function decryptWithPassword(encrypted, password) {
  if (!password) throw new Error('Password is required');
  const lines = encrypted.trim().split('\n');
  if (lines.length < 4 || lines[0] !== PASSWORD_ENC_PREFIX) {
    throw new Error('Invalid encrypted format');
  }
  const salt = base64ToBuffer(lines[1]);
  const iv = base64ToBuffer(lines[2]);
  const ciphertext = base64ToBuffer(lines[3]);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const keyBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const key = await crypto.subtle.importKey(
    'raw',
    keyBits,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    throw new Error('Decryption failed. Wrong password?');
  }
}

/**
 * Migrate a plain-text token from chrome.storage.sync to
 * encrypted storage in chrome.storage.local.
 * Removes the token from sync storage after migration.
 * @returns {Promise<boolean>} true if a migration was performed
 */
export async function migrateTokenIfNeeded() {
  const syncData = await chrome.storage.sync.get('githubToken');
  const plainToken = syncData.githubToken;

  if (!plainToken) return false;

  // Encrypt and store in local
  const encrypted = await encryptToken(plainToken);
  await chrome.storage.local.set({ githubToken: encrypted });

  // Remove plain-text token from sync
  await chrome.storage.sync.remove('githubToken');

  console.log('[GitSyncMarks] Token migrated from sync (plain) to local (encrypted)');
  return true;
}
