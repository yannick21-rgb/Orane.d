import { Platform } from 'react-native';
import { safeAsyncRead, safeAsyncWriteJSON, safeAsyncReadJSON, safeAsyncRemove } from './storage';
import { secureGetPinHash, secureStorePinHash, secureRemovePinHash } from './secureStorage';

let digestStringAsync, CryptoDigestAlgorithm;
if (Platform.OS !== 'web') {
  const expoCrypto = require('expo-crypto');
  digestStringAsync = expoCrypto.digestStringAsync;
  CryptoDigestAlgorithm = expoCrypto.CryptoDigestAlgorithm;
}

const PIN_SALT_KEY = (uid) => `@oraned_pin_salt_${uid}`;
const PIN_HASH_KEY = (uid) => `@oraned_pin_hash_legacy_${uid}`;

const RATE_LIMIT_KEY = (uid) => `@oraned_rate_limit_${uid}`;

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

async function sha256(data) {
  if (Platform.OS === 'web') {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, data);
}

// Nombre d'itérations STOCKÉ dans le hash : l'ancien format `salt:hash` en dur
// (1000 pour le PIN, 100 pour les mots de passe) ne permettait jamais de
// durcir le coût sans invalider les hashes existants. Nouveau format :
// `salt:itérations:hash`. L'ancien format (2 parties) reste vérifiable.
const LEGACY_PIN_ITERATIONS = 1000;
const LEGACY_PASSWORD_ITERATIONS = 100;
const PIN_ITERATIONS = 2000;
const PASSWORD_ITERATIONS = 5000;

async function iterativeHash(saltHex, password, iterations) {
  let data = saltHex + password;
  for (let i = 0; i < iterations; i++) {
    data = await sha256(data);
  }
  return data;
}

/** Format `salt:itérations:hash`. */
async function hashWithIterations(secret, iterations) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const saltHex = toHex(salt);
  const hash = await iterativeHash(saltHex, secret, iterations);
  return `${saltHex}:${iterations}:${hash}`;
}

/**
 * Vérifie un hash au format `salt:itérations:hash` (ou `salt:hash` legacy)
 * en comparaison CONSTANT-TIME : une comparaison `===` classique laisse
 * fuiter le hash byte-par-byte via le temps de réponse.
 */
async function verifyWithIterations(secret, stored, legacyIterations) {
  const parts = String(stored || '').split(':');
  if (parts.length !== 2 && parts.length !== 3) return false;
  const [saltHex, maybeIters, maybeHash] = parts;
  if (!saltHex || saltHex.length !== 32) return false;
  let iterations = legacyIterations;
  let expectedHash = maybeHash;
  if (parts.length === 3) {
    const parsed = parseInt(maybeIters, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1000000) return false;
    iterations = parsed;
  } else {
    expectedHash = maybeIters;
  }
  const computed = await iterativeHash(saltHex, secret, iterations);
  return timingSafeEqual(computed, expectedHash || '');
}

/** Comparaison de chaînes en temps constant (longueur égalisée). */
function timingSafeEqual(a, b) {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function hashPin(pin) {
  return hashWithIterations(pin, PIN_ITERATIONS);
}

export async function verifyPin(pin, storedHash) {
  try {
    return await verifyWithIterations(pin, storedHash, LEGACY_PIN_ITERATIONS);
  } catch {
    return false;
  }
}

export async function storePinHash(userId, hash) {
  try {
    await secureStorePinHash(userId, hash);
    return true;
  } catch (e) {
    console.warn('[security] secure-store indisponible, fallback AsyncStorage');
    const salt = hash.split(':')[0];
    await safeAsyncWriteJSON(PIN_SALT_KEY(userId), salt);
    await safeAsyncWriteJSON(PIN_HASH_KEY(userId), hash);
    return true;
  }
}

export async function getStoredPinHash(userId) {
  try {
    const fromSecure = await secureGetPinHash(userId);
    if (fromSecure) return fromSecure;
  } catch (_) {}
  const legacy = await safeAsyncReadJSON(PIN_HASH_KEY(userId), null);
  return legacy;
}

export async function removePinHash(userId) {
  try { await secureRemovePinHash(userId); } catch (_) {}
  await safeAsyncRemove(PIN_SALT_KEY(userId));
  await safeAsyncRemove(PIN_HASH_KEY(userId));
}

export async function checkPinRateLimit(userId) {
  const now = Date.now();
  const record = await safeAsyncReadJSON(RATE_LIMIT_KEY(userId), null);
  if (!record) {
    return { locked: false, remainingBeforeLock: 3, waitMs: 0, level: 0, totalAttempts: 0 };
  }
  if (record.locked) {
    const elapsed = now - record.lockoutUntil;
    if (elapsed < 0) {
      return {
        locked: true,
        remainingBeforeLock: 0,
        waitMs: -elapsed,
        level: record.level || 1,
        totalAttempts: record.attempts || 0,
      };
    }
    const resetRecord = { attempts: 0, locked: false, lockoutUntil: 0, level: 0 };
    await safeAsyncWriteJSON(RATE_LIMIT_KEY(userId), resetRecord);
    return { locked: false, remainingBeforeLock: 3, waitMs: 0, level: 0, totalAttempts: 0 };
  }
  const attempts = record.attempts || 0;
  let remainingBeforeLock;
  if (attempts < 3) remainingBeforeLock = 3 - attempts;
  else if (attempts < 5) remainingBeforeLock = 5 - attempts;
  else if (attempts < 10) remainingBeforeLock = 10 - attempts;
  else remainingBeforeLock = 0;
  return {
    locked: false,
    remainingBeforeLock: Math.max(0, remainingBeforeLock),
    waitMs: 0,
    level: 0,
    totalAttempts: attempts,
  };
}

export async function getRemainingAttemptsText(userId) {
  const info = await checkPinRateLimit(userId);
  if (info.locked) {
    const sec = Math.ceil(info.waitMs / 1000);
    const min = Math.floor(sec / 60);
    if (min >= 60) return `Verrouillé ${Math.floor(min / 60)}h`;
    if (min >= 1) return `Verrouillé ${min}min ${sec % 60}s`;
    return `Verrouillé ${sec}s`;
  }
  if (info.totalAttempts >= 10) return '0 tentative — PIN oublié disponible';
  if (info.totalAttempts >= 5) {
    const next = 10 - info.totalAttempts;
    return `${Math.max(0, next)} tentative${next > 1 ? 's' : ''} avant verrouillage 1h`;
  }
  if (info.totalAttempts >= 3) {
    const next = 5 - info.totalAttempts;
    return `${Math.max(0, next)} tentative${next > 1 ? 's' : ''} avant blocage 5min`;
  }
  return `${info.remainingBeforeLock} tentative${info.remainingBeforeLock > 1 ? 's' : ''} restante${info.remainingBeforeLock > 1 ? 's' : ''}`;
}

export async function recordFailedPinAttempt(userId) {
  const now = Date.now();
  const prev = await safeAsyncReadJSON(RATE_LIMIT_KEY(userId), null);
  const record = prev || { attempts: 0, locked: false, lockoutUntil: 0, level: 0 };
  record.attempts = (record.attempts || 0) + 1;
  const attempts = record.attempts;
  if (attempts >= 10) {
    record.locked = true;
    record.lockoutUntil = now + 3600000;
    record.level = 3;
  } else if (attempts >= 5) {
    record.locked = true;
    record.lockoutUntil = now + 300000;
    record.level = 2;
  } else if (attempts >= 3) {
    record.locked = true;
    record.lockoutUntil = now + 30000;
    record.level = 1;
  }
  await safeAsyncWriteJSON(RATE_LIMIT_KEY(userId), record);
  return { remainingAttempts: Math.max(0, 3 - record.attempts), attempts: record.attempts, locked: record.locked };
}

export async function resetPinRateLimit(userId) {
  await safeAsyncRemove(RATE_LIMIT_KEY(userId));
}

export async function hashPassword(password) {
  // 100 itérations (ancien format) se craquait en quelques millisecondes en
  // dictionnaire : on monte à 5000 et on grave le coût dans le hash.
  return hashWithIterations(password, PASSWORD_ITERATIONS);
}

export async function verifyPassword(password, stored) {
  try {
    return await verifyWithIterations(password, stored, LEGACY_PASSWORD_ITERATIONS);
  } catch {
    return false;
  }
}

export async function migratePinToSecureStoreIfNeeded(userId) {
  const legacyHash = await safeAsyncReadJSON(PIN_HASH_KEY(userId), null);
  if (!legacyHash) return;
  try {
    const existing = await secureGetPinHash(userId);
    if (existing) {
      await safeAsyncRemove(PIN_HASH_KEY(userId));
      await safeAsyncRemove(PIN_SALT_KEY(userId));
      return;
    }
  } catch (_) {}
  await storePinHash(userId, legacyHash);
  await safeAsyncRemove(PIN_HASH_KEY(userId));
  await safeAsyncRemove(PIN_SALT_KEY(userId));
}
