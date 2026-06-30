import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeAsyncRead, safeAsyncWrite, safeAsyncRemove, safeJSONParse } from './storage';

let SecureStore = null;
try {
  SecureStore = require('expo-secure-store');
} catch (e) {
  console.warn('[secureStorage] expo-secure-store non disponible, chiffrement désactivé');
}

function sanitizeKey(raw) {
  return raw.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

const ENC_KEY_STORE = 'orane_master_key';
const KEY_SALT_STORE = 'orane_key_salt';
let masterKey = null;
let keySalt = null;
let aesAvailable = true;

function isValidKey(key) {
  return typeof key === 'string' && key.length > 0 && /^[a-zA-Z0-9_]+$/.test(key);
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex) {
  const len = hex.length / 2;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function generateMasterKey() {
  const keyData = new Uint8Array(32);
  crypto.getRandomValues(keyData);
  const hex = toHex(keyData);
  if (SecureStore && isValidKey(ENC_KEY_STORE)) {
    try {
      await SecureStore.setItemAsync(ENC_KEY_STORE, hex);
    } catch (e) {
      console.error('[secureStorage] Échec sauvegarde master key :', e.message);
    }
  }
  return hex;
}

async function getOrCreateMasterKey() {
  try {
    if (SecureStore && isValidKey(ENC_KEY_STORE)) {
      const existing = await SecureStore.getItemAsync(ENC_KEY_STORE);
      if (existing) return existing;
    }
    return await generateMasterKey();
  } catch (e) {
    console.error('[secureStorage] Erreur accès master key :', e.message);
    return null;
  }
}

function getKeyMaterial(hexKey) {
  try {
    const raw = fromHex(hexKey);
    return crypto.subtle.importKey('raw', raw, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
  } catch (e) {
    aesAvailable = false;
    console.warn('[secureStorage] AES non disponible :', e.message);
    return null;
  }
}

async function aesEncrypt(plaintext, keyHex) {
  if (!crypto.subtle || !crypto.subtle.encrypt) {
    aesAvailable = false;
    return plaintext;
  }
  try {
    const iv = new Uint8Array(16);
    crypto.getRandomValues(iv);
    const key = await getKeyMaterial(keyHex);
    if (!key) return plaintext;
    const encoded = new TextEncoder().encode(plaintext);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, encoded);
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    return toHex(combined);
  } catch (e) {
    aesAvailable = false;
    console.warn('[secureStorage] Chiffrement AES échoué, stockage en clair :', e.message);
    return plaintext;
  }
}

async function aesDecrypt(cipherHex, keyHex) {
  if (!crypto.subtle || !crypto.subtle.decrypt) {
    aesAvailable = false;
    return cipherHex;
  }
  try {
    const combined = fromHex(cipherHex);
    const iv = combined.slice(0, 16);
    const data = combined.slice(16);
    const key = await getKeyMaterial(keyHex);
    if (!key) return cipherHex;
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    aesAvailable = false;
    console.warn('[secureStorage] Déchiffrement AES échoué, retour données brutes :', e.message);
    return cipherHex;
  }
}

function secureKey(userId, prefix) {
  if (!userId || typeof userId !== 'string') return prefix;
  const candidate = sanitizeKey(`${prefix}_${userId}`);
  return candidate.length > 0 ? candidate : prefix;
}

export async function initSecureStorage(userId) {
  if (masterKey && keySalt) return true;
  try {
    const keyHex = await getOrCreateMasterKey();
    if (SecureStore && userId) {
      const saltKey = secureKey(userId, KEY_SALT_STORE);
      if (isValidKey(saltKey)) {
        keySalt = (await SecureStore.getItemAsync(saltKey)) || '';
      }
    }
    if (!keyHex) return false;
    masterKey = keyHex;
    return true;
  } catch (e) {
    console.error('[secureStorage] init échoué :', e.message);
    return false;
  }
}

export async function secureSet(key, value) {
  if (!masterKey) throw new Error('secureStorage non initialisé');
  const strValue = typeof value === 'string' ? value : JSON.stringify(value);
  const encrypted = await aesEncrypt(strValue, masterKey);
  return safeAsyncWrite(`@enc_${key}`, encrypted);
}

export async function secureGet(key) {
  if (!masterKey) return null;
  const encrypted = await safeAsyncRead(`@enc_${key}`, null);
  if (encrypted === null) return null;
  try {
    return await aesDecrypt(encrypted, masterKey);
  } catch (e) {
    console.error(`[secureStorage] Erreur déchiffrement ${key} :`, e.message);
    return null;
  }
}

export async function secureGetJSON(key, fallback = null) {
  const str = await secureGet(key);
  return safeJSONParse(str, fallback);
}

export async function secureRemove(key) {
  return safeAsyncRemove(`@enc_${key}`);
}

export async function secureStorePinHash(userId, hash) {
  const key = secureKey(userId, 'orane_pin_hash');
  if (SecureStore && isValidKey(key)) {
    try {
      await SecureStore.setItemAsync(key, hash);
    } catch (e) {
      console.error('[secureStorage] Échec setItemAsync PIN hash :', e.message);
    }
  }
}

export async function secureGetPinHash(userId) {
  const key = secureKey(userId, 'orane_pin_hash');
  try {
    if (SecureStore && isValidKey(key)) {
      return await SecureStore.getItemAsync(key);
    }
    return null;
  } catch {
    return null;
  }
}

export async function secureRemovePinHash(userId) {
  const key = secureKey(userId, 'orane_pin_hash');
  try {
    if (SecureStore && isValidKey(key)) {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (e) {
    console.error('[secureStorage] Erreur suppression PIN hash :', e.message);
  }
}

export async function resetSecureStorage(userId) {
  masterKey = null;
  keySalt = null;
  await secureRemovePinHash(userId);
  if (SecureStore && userId) {
    const saltKey = secureKey(userId, KEY_SALT_STORE);
    if (isValidKey(saltKey)) {
      try {
        await SecureStore.deleteItemAsync(saltKey);
      } catch (e) {
        console.error('[secureStorage] Erreur suppression salt :', e.message);
      }
    }
  }
}

export async function isSecureStorageReady() {
  return masterKey !== null;
}
