import AsyncStorage from '@react-native-async-storage/async-storage';

export function safeJSONParse(raw, fallback = null) {
  if (raw === null || raw === undefined || raw === '') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (e) {
    console.warn('[safeJSONParse] Erreur de parsing JSON :', e.message);
    return fallback;
  }
}

export function validateSchema(data, schema) {
  if (!data || typeof data !== 'object') return { valid: false, errors: ['Donnée non-obejt'] };
  const errors = [];
  for (const key of Object.keys(schema)) {
    const { type, required, validator } = schema[key];
    const val = data[key];
    const isMissing = val === undefined || val === null || val === '';
    if (required && isMissing) {
      errors.push(`Champ obligatoire manquant : ${key}`);
      continue;
    }
    if (!isMissing && type) {
      const expectedType = typeof val === type;
      if (type === 'array') {
        if (!Array.isArray(val)) errors.push(`Champ ${key} doit être un tableau`);
      } else if (!expectedType) {
        errors.push(`Champ ${key} doit être de type ${type}, reçu ${typeof val}`);
      }
    }
    if (!isMissing && validator && !validator(val)) {
      errors.push(`Champ ${key} invalide`);
    }
  }
  return { valid: errors.length === 0, errors };
}

const USER_SCHEMA = {
  name: { type: 'string', required: true },
  email: { type: 'string', required: true },
  password: { type: 'string', required: true },
};

const DEBT_SCHEMA = {
  id: { type: 'string', required: true },
  userId: { type: 'string', required: true },
  type: { type: 'string', required: true, validator: (v) => ['credit_accorde', 'credit_recu'].includes(v) },
  amount: { type: 'number', required: true, validator: (v) => v > 0 },
  personName: { type: 'string', required: true },
};

const TONTINE_SCHEMA = {
  id: { type: 'string', required: true },
  userId: { type: 'string', required: true },
  groupName: { type: 'string', required: true },
  amountPerTour: { type: 'number', required: true },
  rounds: { type: 'array', required: true },
};

const TRANSACTION_SCHEMA = {
  id: { type: 'string', required: true },
  type: { type: 'string', required: true },
  amount: { type: 'number', required: false },
};

export function validateUser(data) {
  const result = validateSchema(data, USER_SCHEMA);
  if (!result.valid) console.warn('[validateUser] Données utilisateur invalides :', result.errors);
  return result;
}

export function validateDebt(data) {
  const result = validateSchema(data, DEBT_SCHEMA);
  if (!result.valid) console.warn('[validateDebt] Donnée dette invalide :', result.errors);
  return result;
}

export function validateTontine(data) {
  const result = validateSchema(data, TONTINE_SCHEMA);
  if (!result.valid) console.warn('[validateTontine] Donnée tontine invalide :', result.errors);
  return result;
}

export function validateTransaction(data) {
  const result = validateSchema(data, TRANSACTION_SCHEMA);
  if (!result.valid) console.warn('[validateTransaction] Donnée transaction invalide :', result.errors);
  return result;
}

export function filterValidRecords(records, validator) {
  if (!Array.isArray(records)) return [];
  const valid = [];
  const invalid = [];
  for (const record of records) {
    if (!record) continue;
    const { valid: isValid } = validator(record);
    if (isValid) {
      valid.push(record);
    } else {
      invalid.push(record);
    }
  }
  if (invalid.length > 0) {
    console.warn(`[filterValidRecords] ${invalid.length} enregistrement(s) corrompu(s) filtrés`);
  }
  return valid;
}

export async function safeAsyncRead(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw !== null ? raw : fallback;
  } catch (e) {
    console.error(`[safeAsyncRead] Erreur lecture ${key} :`, e.message);
    return fallback;
  }
}

export async function safeAsyncReadJSON(key, fallback = null) {
  const raw = await safeAsyncRead(key, null);
  return safeJSONParse(raw, fallback);
}

export async function safeAsyncWrite(key, value) {
  const tmpKey = `${key}_tmp`;
  try {
    await AsyncStorage.setItem(tmpKey, value);
    const verify = await AsyncStorage.getItem(tmpKey);
    if (verify !== value) {
      throw new Error('La vérification de l\'écriture temporaire a échoué');
    }
    await AsyncStorage.setItem(key, value);
    await AsyncStorage.removeItem(tmpKey);
    return true;
  } catch (e) {
    console.error(`[safeAsyncWrite] Erreur écriture ${key} :`, e.message);
    try { await AsyncStorage.removeItem(tmpKey); } catch (_) {}
    throw e;
  }
}

export async function safeAsyncWriteJSON(key, value) {
  const json = JSON.stringify(value);
  return safeAsyncWrite(key, json);
}

export async function safeAsyncRemove(key) {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error(`[safeAsyncRemove] Erreur suppression ${key} :`, e.message);
    return false;
  }
}

export async function safeMultiRead(keys) {
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    return pairs.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  } catch (e) {
    console.error('[safeMultiRead] Erreur :', e.message);
    return {};
  }
}
