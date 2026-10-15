'use strict';
/**
 * scripts/test-harness.cjs — support des tests `node --test`.
 *
 * Les modules de `src/` sont écrits en ESM (`import`/`export`) et importent des
 * modules natifs React Native (AsyncStorage, SecureStore…). Node ne peut ni les
 * charger tels quels ni exécuter ces modules natifs. Ce harnais :
 *   1. transforme à la volée `src/**` ESM → CommonJS (via @babel/core) ;
 *   2. remplace les modules natifs par des doublures en mémoire ;
 *   3. laisse le VRAI `crypto.subtle` de Node pour tester le chiffrement.
 *
 * Usage : `require('../scripts/test-harness.cjs')` en tête de chaque fichier de
 * test (garantit l'installation du hook dans le processus de test courant).
 */
const Module = require('module');
const path = require('path');
const fs = require('fs');
const nodeCrypto = require('crypto');
const babel = require('@babel/core');

// ---------------------------------------------------------------------------
// Doublures en mémoire
// ---------------------------------------------------------------------------

const asyncStore = new Map();
const AsyncStorage = {
  async getItem(key) {
    return asyncStore.has(key) ? asyncStore.get(key) : null;
  },
  async setItem(key, value) {
    asyncStore.set(key, String(value));
  },
  async removeItem(key) {
    asyncStore.delete(key);
  },
  async multiGet(keys) {
    return keys.map((k) => [k, asyncStore.has(k) ? asyncStore.get(k) : null]);
  },
  async multiSet(pairs) {
    for (const [k, v] of pairs) asyncStore.set(k, String(v));
  },
  async multiRemove(keys) {
    for (const k of keys) asyncStore.delete(k);
  },
  async getAllKeys() {
    return [...asyncStore.keys()];
  },
  async clear() {
    asyncStore.clear();
  },
};

const secureStoreMap = new Map();
const SecureStore = {
  async setItemAsync(key, value) {
    secureStoreMap.set(key, String(value));
  },
  async getItemAsync(key) {
    return secureStoreMap.has(key) ? secureStoreMap.get(key) : null;
  },
  async deleteItemAsync(key) {
    secureStoreMap.delete(key);
  },
};

const expoCrypto = {
  getRandomBytes: (n) => new Uint8Array(nodeCrypto.randomBytes(n)),
  getRandomBytesAsync: async (n) => new Uint8Array(nodeCrypto.randomBytes(n)),
};

/**
 * Doublure Supabase minimale et pilotable : `__session` décide si l'on est en
 * ligne (un id => push/pull/remove touchent le serveur), `__tables` accumule ce
 * que le serveur reçoit, `__errors` force une erreur par table.
 */
const supabaseMock = {
  __session: null,
  __tables: {},
  __errors: {},
  __calls: [],
  reset() {
    this.__session = null;
    this.__tables = {};
    this.__errors = {};
    this.__calls = [];
  },
  auth: {
    getSession: async () => ({
      data: { session: supabaseMock.__session ? { user: { id: supabaseMock.__session } } : null },
    }),
  },
  from(table) {
    supabaseMock.__calls.push(table);
    if (!supabaseMock.__tables[table]) supabaseMock.__tables[table] = [];
    const state = { table, op: null, filters: {} };
    const api = {
      upsert(rows) {
        state.op = 'upsert';
        if (supabaseMock.__errors[table]) return Promise.resolve({ error: { message: 'forced' } });
        const existing = supabaseMock.__tables[table];
        for (const row of rows) {
          const idx = existing.findIndex((r) => String(r.id) === String(row.id));
          if (idx >= 0) existing[idx] = row;
          else existing.push(row);
        }
        return Promise.resolve({ error: null });
      },
      delete() {
        state.op = 'delete';
        return api;
      },
      select() {
        return api;
      },
      in(_col, ids) {
        state.filters.in = ids.map(String);
        return api;
      },
      eq(_col, val) {
        state.filters.eq = val;
        return api;
      },
      order() {
        return api;
      },
      range(from, to) {
        if (state.op === 'delete') {
          if (supabaseMock.__errors[table]) return Promise.resolve({ error: { message: 'forced' } });
          const ids = new Set(state.filters.in || []);
          supabaseMock.__tables[table] = supabaseMock.__tables[table].filter(
            (r) => !ids.has(String(r.id))
          );
          return Promise.resolve({ error: null });
        }
        if (supabaseMock.__errors[table]) return Promise.resolve({ error: { message: 'forced' } });
        let rows = supabaseMock.__tables[table].slice();
        if (state.filters.eq !== undefined) {
          rows = rows.filter((r) => r.user_id === state.filters.eq);
        }
        rows.sort((a, b) => String(a.id).localeCompare(String(b.id)));
        return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
      },
      then(resolve, reject) {
        // `await supabase.from(t).delete().in().eq()` sans `.range()` explicite.
        if (state.op === 'delete') {
          if (supabaseMock.__errors[table]) return Promise.resolve({ error: { message: 'forced' } }).then(resolve, reject);
          const ids = new Set(state.filters.in || []);
          supabaseMock.__tables[table] = supabaseMock.__tables[table].filter(
            (r) => !ids.has(String(r.id))
          );
          return Promise.resolve({ error: null }).then(resolve, reject);
        }
        return Promise.resolve({ data: [], error: null }).then(resolve, reject);
      },
    };
    return api;
  },
};

const MOCKS = {
  '@react-native-async-storage/async-storage': { __esModule: true, default: AsyncStorage },
  'expo-secure-store': { __esModule: true, ...SecureStore },
  'expo-crypto': { __esModule: true, ...expoCrypto },
  'react-native': {
    __esModule: true,
    Platform: { OS: 'web', select: (o) => o.web ?? o.default },
    Dimensions: { get: () => ({ width: 1024, height: 768 }) },
  },
  'expo-constants': {
    __esModule: true,
    default: { appOwnership: 'standalone', executionEnvironment: 'bare' },
  },
};

const RESOLVED_MOCKS = [{ suffix: path.join('utils', 'supabase.js'), value: { __esModule: true, supabase: supabaseMock } }];

// ---------------------------------------------------------------------------
// Interception du chargement
// ---------------------------------------------------------------------------

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (Object.prototype.hasOwnProperty.call(MOCKS, request)) {
    return MOCKS[request];
  }
  try {
    const resolved = Module._resolveFilename(request, parent, isMain);
    for (const m of RESOLVED_MOCKS) {
      if (resolved.endsWith(m.suffix)) return m.value;
    }
  } catch (_) {
    /* module natif introuvable : laisse l'erreur remonter normalement */
  }
  return originalLoad.apply(this, arguments);
};

// ---------------------------------------------------------------------------
// Transformation ESM → CJS pour src/
// ---------------------------------------------------------------------------

const originalJs = require.extensions['.js'];
require.extensions['.js'] = function patchedJs(module, filename) {
  if (filename.includes(`${path.sep}node_modules${path.sep}`)) {
    return originalJs(module, filename);
  }
  const src = fs.readFileSync(filename, 'utf8');
  const out = babel.transformSync(src, {
    filename,
    babelrc: false,
    configFile: false,
    sourceType: 'module',
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  module._compile(out.code, filename);
};

module.exports = {
  AsyncStorage,
  SecureStore,
  supabaseMock,
  asyncStore,
  secureStoreMap,
  resetAll() {
    asyncStore.clear();
    secureStoreMap.clear();
    supabaseMock.reset();
  },
};
