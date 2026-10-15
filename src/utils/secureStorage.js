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

// Marque une valeur chiffrée. Sans ce préfixe, la valeur stockée est du texte
// en clair : les données écrites AVANT l'activation du chiffrement (ou par un
// build sans module natif) restent lisibles au lieu d'être prises pour du
// chiffré et rejetées.
const ENC_MARKER = 'enc:v1:';

let masterKey = null;
let keySalt = null;

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

/**
 * `crypto.subtle` réellement utilisable ? Sur mobile il vient de
 * react-native-quick-crypto (posé par cryptoPolyfill.js) ; sur le web du
 * navigateur. Sans lui, on refuse d'écrire du « chiffré » (voir secureSet).
 */
function hasSubtle() {
  return (
    typeof crypto !== 'undefined' &&
    crypto &&
    crypto.subtle &&
    typeof crypto.subtle.encrypt === 'function' &&
    typeof crypto.subtle.decrypt === 'function'
  );
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

/** Initialisation paresseuse : la clé maîtresse est globale, pas besoin de userId. */
async function ensureMasterKey() {
  if (masterKey) return masterKey;
  masterKey = await getOrCreateMasterKey();
  return masterKey;
}

function getKeyMaterial(hexKey) {
  try {
    const raw = fromHex(hexKey);
    return crypto.subtle.importKey('raw', raw, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
  } catch (e) {
    console.warn('[secureStorage] importKey AES échoué :', e.message);
    return null;
  }
}

/**
 * Chiffre et renvoie `enc:v1:<hex>`, ou `null` si le chiffrement n'est pas
 * possible (pas de crypto, clé absente, échec). On ne renvoie JAMAIS le texte
 * en clair ici : l'appelant décide alors d'un stockage en clair SANS marqueur.
 */
async function aesEncrypt(plaintext, keyHex) {
  if (!hasSubtle()) return null;
  try {
    const iv = new Uint8Array(16);
    crypto.getRandomValues(iv);
    const key = await getKeyMaterial(keyHex);
    if (!key) return null;
    const encoded = new TextEncoder().encode(plaintext);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, encoded);
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    return ENC_MARKER + toHex(combined);
  } catch (e) {
    console.warn('[secureStorage] Chiffrement AES échoué :', e.message);
    return null;
  }
}

/**
 * Déchiffre une valeur. Une valeur SANS marqueur est rendue telle quelle (texte
 * en clair hérité). Renvoie `null` si une valeur chiffrée ne peut pas être
 * déchiffrée (module natif manquant, clé perdue, données corrompues).
 */
async function aesDecrypt(stored, keyHex) {
  if (typeof stored !== 'string' || !stored.startsWith(ENC_MARKER)) return stored;
  if (!hasSubtle()) {
    console.error('[secureStorage] Valeur chiffrée illisible : crypto.subtle indisponible (rebuild natif requis).');
    return null;
  }
  try {
    const combined = fromHex(stored.slice(ENC_MARKER.length));
    const iv = combined.slice(0, 16);
    const data = combined.slice(16);
    const key = await getKeyMaterial(keyHex);
    if (!key) return null;
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('[secureStorage] Déchiffrement AES échoué (clé perdue ou données corrompues) :', e.message);
    return null;
  }
}

function secureKey(userId, prefix) {
  if (!userId || typeof userId !== 'string') return prefix;
  const candidate = sanitizeKey(`${prefix}_${userId}`);
  return candidate.length > 0 ? candidate : prefix;
}

export async function initSecureStorage(userId) {
  try {
    const keyHex = await ensureMasterKey();
    if (!keyHex) return false;
    if (SecureStore && userId && keySalt === null) {
      const saltKey = secureKey(userId, KEY_SALT_STORE);
      if (isValidKey(saltKey)) {
        keySalt = (await SecureStore.getItemAsync(saltKey)) || '';
      }
    }
    return true;
  } catch (e) {
    console.error('[secureStorage] init échoué :', e.message);
    return false;
  }
}

export async function secureSet(key, value) {
  const strValue = typeof value === 'string' ? value : JSON.stringify(value);
  const keyHex = await ensureMasterKey();
  if (keyHex) {
    const encrypted = await aesEncrypt(strValue, keyHex);
    if (encrypted !== null) return safeAsyncWrite(`@enc_${key}`, encrypted);
  }
  // Chiffrement indisponible : stockage en clair (comportement historique),
  // sans marqueur, pour rester lisible.
  return safeAsyncWrite(`@enc_${key}`, strValue);
}

export async function secureGet(key) {
  const stored = await safeAsyncRead(`@enc_${key}`, null);
  if (stored === null) return null;
  if (!stored.startsWith(ENC_MARKER)) return stored;
  const keyHex = await ensureMasterKey();
  if (!keyHex) return null;
  return aesDecrypt(stored, keyHex);
}

export async function secureGetJSON(key, fallback = null) {
  const str = await secureGet(key);
  return safeJSONParse(str, fallback);
}

/**
 * Lecture d'une donnée sensible.
 *
 * Ordre : stockage chiffré (`@enc_<key>`) d'abord, puis ancienne clé en clair
 * (`<key>`) écrite avant le chiffrement. Une donnée trouvée en clair est
 * migrée immédiatement (réécrite chiffrée, copie claire supprimée).
 */
export async function secureReadJSON(key, fallback = null) {
  const stored = await safeAsyncRead(`@enc_${key}`, null);
  if (stored !== null) {
    const str = stored.startsWith(ENC_MARKER) ? await secureGet(key) : stored;
    const parsed = safeJSONParse(str, undefined);
    if (parsed !== undefined) return parsed;
    return fallback;
  }

  const legacy = await safeAsyncRead(key, null);
  if (legacy === null) return fallback;
  const parsedLegacy = safeJSONParse(legacy, undefined);
  if (parsedLegacy === undefined) return fallback;
  try {
    await secureWriteJSON(key, parsedLegacy);
  } catch (e) {
    console.warn(`[secureStorage] Migration en clair → chiffré échouée pour ${key} :`, e.message);
  }
  return parsedLegacy;
}

/**
 * Écriture d'une donnée sensible : chiffrée si possible, sinon en clair (pour
 * ne jamais perdre la donnée). Après une écriture chiffrée, la copie en clair
 * héritée est supprimée.
 */
export async function secureWriteJSON(key, value) {
  const json = JSON.stringify(value);
  const keyHex = await ensureMasterKey();
  if (keyHex) {
    const encrypted = await aesEncrypt(json, keyHex);
    if (encrypted !== null) {
      await safeAsyncWrite(`@enc_${key}`, encrypted);
      await safeAsyncRemove(key);
      return true;
    }
  }
  return safeAsyncWrite(key, json);
}

export async function secureRemove(key) {
  await safeAsyncRemove(`@enc_${key}`);
  return safeAsyncRemove(key);
}

export async function secureStorePinHash(userId, hash) {
  const key = secureKey(userId, 'orane_pin_hash');
  if (SecureStore && isValidKey(key)) {
    // Laisse remonter l'échec : `storePinHash` dispose d'un fallback
    // AsyncStorage dans son catch — il ne s'exécuterait jamais si on avalait
    // l'erreur ici, et l'app afficherait « PIN actif » alors que rien n'est
    // stocké (déverrouillage au prochain lancement SANS code).
    await SecureStore.setItemAsync(key, hash);
    return true;
  }
  throw new Error('SecureStore indisponible');
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

/**
 * Verrouille le stockage chiffré SANS détruire les identifiants.
 *
 * `logout` doit retirer de la mémoire la clé maîtresse (sinon le processus
 * garde la capacité de déchiffrer les données du compte qu'on vient de
 * quitter). On NE supprime PAS le hash du PIN ni la clé maîtresse du
 * SecureStore : le PIN protège le changement de compte et la clé maîtresse
 * doit survivre pour que les données chiffrées restent lisibles au prochain
 * login.
 */
export function lockSecureStorage() {
  masterKey = null;
  keySalt = null;
}

export async function isSecureStorageReady() {
  return masterKey !== null;
}
