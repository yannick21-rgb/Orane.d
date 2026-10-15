import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_KEY = (uid) => `@pending_sync_${uid}`;

// Clé primaire composite des tables de données : les ids locaux sont des
// chaînes propres à l'appareil (Date.now()), l'unicité doit donc se faire
// par utilisateur et non globalement (sinon un id partagé bloquerait un autre
// compte).
const ON_CONFLICT = 'user_id,id';

// Colonnes acceptées par le serveur — DOIT rester aligné avec
// src/utils/supabase-schema.sql (et sa migration du 2026-10-08).
// Un seul champ inconnu ferait échouer l'upsert de TOUT le lot : on masque.
const COLUMNS = {
  transactions: [
    'id', 'type', 'amount', 'wallet', 'category', 'title', 'description', 'note',
    'date', 'momoNetwork', 'momoFee', 'frais', 'amountReceived', 'incomeFrequency',
  ],
  debts: [
    'id', 'userId', 'type', 'amount', 'personName', 'description', 'note', 'dueDate',
    'reminderEnabled', 'dateCreated', 'amountReimbursed', 'status',
  ],
  tontines: [
    'id', 'userId', 'groupName', 'amountPerTour', 'frequency', 'totalParticipants',
    'myPosition', 'startDate', 'rounds',
  ],
};

/**
 * Convertit un record local en ligne PostgREST : masque de colonnes, id
 * normalisé en chaîne, `user_id` et `updated_at` posés.
 * @returns {object|null} null si le record n'a pas d'id exploitable.
 */
export function toRow(table, record, sbUserId = null, now = new Date().toISOString()) {
  if (!record) return null;
  const rawId = record.id;
  if (rawId === undefined || rawId === null || rawId === '') return null;

  const cols = COLUMNS[table];
  const row = {};
  if (cols) {
    for (const c of cols) if (record[c] !== undefined) row[c] = record[c];
  } else {
    Object.assign(row, record);
  }

  row.id = String(rawId);
  if (sbUserId) row.user_id = sbUserId;
  // Conserve le `updated_at` d'origine : l'écraser à chaque push rendrait les
  // lignes non modifiées « plus récentes » que les vraies modifications d'un
  // autre appareil (conflit last-write-wins inversé).
  row.updated_at = record.updated_at || now;
  return row;
}

export function toRows(table, records, sbUserId = null, now = new Date().toISOString()) {
  return (records || []).map((r) => toRow(table, r, sbUserId, now)).filter(Boolean);
}

let _userId = null;
let _pendingCount = 0;
let _lastSync = null;
let _listeners = [];
// Promesse d'initialisation en cours : Finance/Debt/Tontine appellent `init`
// en parallèle, un second appel doit attendre le vidage de la file, pas rendre
// la main tout de suite.
let _initPromise = null;

function notify() {
  const status = { lastSync: _lastSync, pendingCount: _pendingCount };
  _listeners.forEach((fn) => fn(status));
}

function getSupabaseUserId() {
  return supabase.auth
    .getSession()
    .then(({ data: { session } }) => session?.user?.id || null)
    .catch(() => null);
}

async function enqueue(userId, item) {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY(userId));
    let queue = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(queue)) queue = [];

    // Coalescence : un push envoie TOUT le tableau, donc le dernier instantané
    // d'une table en remplace les précédents. Sans ça, chaque sauvegarde ajoute
    // une copie complète de toutes les données dans une seule clé AsyncStorage.
    if (item.op === 'delete') {
      const existing = queue.find((q) => q && q.op === 'delete' && q.table === item.table);
      if (existing) {
        existing.ids = [...new Set([...(existing.ids || []), ...(item.ids || [])])];
      } else {
        queue.push(item);
      }
    } else {
      const idx = queue.findIndex((q) => q && q.op !== 'delete' && q.table === item.table);
      if (idx >= 0) queue[idx] = item;
      else queue.push(item);
    }

    await AsyncStorage.setItem(PENDING_KEY(userId), JSON.stringify(queue));
  } catch (e) {
    console.warn('[sync] enqueue error:', e.message);
  }
}

// Tombstones : ids supprimés localement dont la suppression serveur n'est pas
// (encore) confirmée. Ils empêchent `pull` de réintroduire la ligne tant que la
// suppression n'a pas abouti — sans quoi une suppression hors ligne « ressuscite »
// à la fusion suivante. Persistés par utilisateur + table.
const tombstoneKey = (uid, table) => `@oraned_tombstones_${uid}_${table}`;

async function readTombstones(uid, table) {
  if (!uid) return [];
  try {
    const raw = await AsyncStorage.getItem(tombstoneKey(uid, table));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

async function writeTombstones(uid, table, ids) {
  if (!uid) return;
  try {
    await AsyncStorage.setItem(tombstoneKey(uid, table), JSON.stringify([...new Set(ids)]));
  } catch (e) {
    console.warn('[sync] writeTombstones error:', e.message);
  }
}

async function addTombstones(uid, table, ids) {
  const cur = await readTombstones(uid, table);
  await writeTombstones(uid, table, [...cur, ...(ids || [])]);
}

async function removeTombstones(uid, table, ids) {
  const cur = await readTombstones(uid, table);
  const drop = new Set((ids || []).map(String));
  await writeTombstones(uid, table, cur.filter((id) => !drop.has(String(id))));
}

export const sync = {
  async init(userId) {
    if (_userId === userId) {
      // Init déjà lancé (ou terminé) pour cet utilisateur : si une passe est en
      // vol, on l'attend avant de laisser l'appelant `pull`.
      if (_initPromise) await _initPromise.catch(() => {});
      return;
    }
    _userId = userId;
    _pendingCount = 0;
    if (!userId) {
      notify();
      return;
    }
    const p = (async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_KEY(userId));
        const parsed = raw ? JSON.parse(raw) : [];
        _pendingCount = Array.isArray(parsed) ? parsed.length : 0;
      } catch (e) {
        _pendingCount = 0;
      }
      // Rien n'appelait `flushPending` : les échecs (hors ligne) restaient
      // empilés pour toujours. On vide la file AVANT le premier pull, sinon une
      // suppression en attente serait annulée par la fusion cloud.
      await sync.flushPending();
      notify();
    })();
    _initPromise = p;
    try {
      await p;
    } finally {
      if (_initPromise === p) _initPromise = null;
    }
  },

  async push(table, records) {
    if (!_userId || !records || records.length === 0) return;

    const sbUserId = await getSupabaseUserId();
    if (!sbUserId) {
      await enqueue(_userId, { table, records });
      _pendingCount++;
      notify();
      return;
    }

    const now = new Date().toISOString();
    const mapped = toRows(table, records, sbUserId, now);
    if (mapped.length === 0) return;

    try {
      const { error } = await supabase.from(table).upsert(mapped, {
        ignoreDuplicates: false,
        onConflict: ON_CONFLICT,
      });
      if (error) throw error;
      _lastSync = now;
    } catch (e) {
      console.warn(`[sync] push ${table} error:`, e.message);
      await enqueue(_userId, { table, records: mapped });
      _pendingCount++;
    }
    notify();
  },

  async pull(table) {
    if (!_userId) return [];

    const sbUserId = await getSupabaseUserId();
    if (!sbUserId) return [];

    try {
      // Supabase plafonne une réponse (souvent 1000 lignes) : sans pagination,
      // les transactions les plus anciennes ne remonteraient jamais.
      const PAGE = 1000;
      const all = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', sbUserId)
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = data || [];
        all.push(...batch);
        if (batch.length < PAGE) break;
      }
      _lastSync = new Date().toISOString();
      notify();
      // Écarte les lignes dont la suppression locale n'est pas encore confirmée.
      const tombstones = new Set((await readTombstones(_userId, table)).map(String));
      return tombstones.size ? all.filter((r) => r && !tombstones.has(String(r.id))) : all;
    } catch (e) {
      console.warn(`[sync] pull ${table} error:`, e.message);
      return [];
    }
  },

  async remove(table, ids) {
    if (!_userId || !ids || ids.length === 0) return;

    // Tombstone AVANT l'appel : le pull ne doit pas réintroduire la ligne entre
    // l'appel et sa confirmation (ou tant qu'il reste en file, hors ligne).
    await addTombstones(_userId, table, ids);

    const sbUserId = await getSupabaseUserId();
    if (!sbUserId) {
      await enqueue(_userId, { op: 'delete', table, ids: [...ids] });
      _pendingCount++;
      notify();
      return;
    }

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', ids)
        .eq('user_id', sbUserId);
      if (error) throw error;
      _lastSync = new Date().toISOString();
      // Suppression confirmée : le tombstone n'est plus nécessaire.
      await removeTombstones(_userId, table, ids);
    } catch (e) {
      console.warn(`[sync] remove ${table} error:`, e.message);
      await enqueue(_userId, { op: 'delete', table, ids: [...ids] });
      _pendingCount++;
    }
    notify();
  },

  // Retire des enregistrements locaux ceux dont la suppression est en attente
  // (ex. sauvegarde locale interrompue) : appelé par les contextes avant fusion.
  async filterDeleted(table, records) {
    if (!_userId || !records || records.length === 0) return records;
    const tombstones = new Set((await readTombstones(_userId, table)).map(String));
    if (tombstones.size === 0) return records;
    return records.filter((r) => r && !tombstones.has(String(r.id)));
  },

  async flushPending() {
    if (!_userId) return;

    const sbUserId = await getSupabaseUserId();
    if (!sbUserId) return;

    try {
      const raw = await AsyncStorage.getItem(PENDING_KEY(_userId));
      if (!raw) {
        _pendingCount = 0;
        notify();
        return;
      }

      const pending = JSON.parse(raw);
      if (!Array.isArray(pending) || pending.length === 0) {
        _pendingCount = 0;
        await AsyncStorage.removeItem(PENDING_KEY(_userId));
        notify();
        return;
      }

      const remaining = [];
      for (const item of pending) {
        try {
          let error;
          if (item && item.op === 'delete') {
            ({ error } = await supabase
              .from(item.table)
              .delete()
              .in('id', item.ids || [])
              .eq('user_id', sbUserId));
            if (!error) await removeTombstones(_userId, item.table, item.ids || []);
          } else {
            // Ré-applique le masque de colonnes : la file peut contenir des
            // enregistrements écrits par une version antérieure de l'app.
            const rows = toRows(item.table, item.records, sbUserId);
            if (rows.length > 0) {
              ({ error } = await supabase.from(item.table).upsert(rows, {
                ignoreDuplicates: false,
                onConflict: ON_CONFLICT,
              }));
            }
          }
          if (error) remaining.push(item);
        } catch {
          remaining.push(item);
        }
      }

      await AsyncStorage.setItem(PENDING_KEY(_userId), JSON.stringify(remaining));
      _pendingCount = remaining.length;
      _lastSync = new Date().toISOString();
    } catch (e) {
      console.warn('[sync] flushPending error:', e.message);
    }
    notify();
  },

  getStatus() {
    return { lastSync: _lastSync, pendingCount: _pendingCount };
  },

  subscribe(fn) {
    _listeners.push(fn);
    return () => {
      _listeners = _listeners.filter((f) => f !== fn);
    };
  },

  reset() {
    _userId = null;
    _pendingCount = 0;
    _lastSync = null;
    notify();
  },
};

// Horodatage exploitable d'un enregistrement : 0 si absent ou invalide.
// `new Date('invalide').getTime()` vaut `NaN` : sans ce garde-fou, un
// enregistrement local corrompu bloquait silencieusement toute mise à jour
// cloud (`cloudTime > NaN` est toujours faux).
function recordTime(rec) {
  const raw = rec && (rec.updated_at || rec.updatedAt);
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function mergeRecords(local, cloud, getId = (r) => r.id) {
  if (!cloud || cloud.length === 0) return local;
  if (!local || local.length === 0) return cloud;

  const map = new Map();
  for (const r of local) {
    map.set(getId(r), r);
  }

  for (const r of cloud) {
    const id = getId(r);
    const existing = map.get(id);
    if (!existing) {
      map.set(id, r);
    } else {
      // Dernière écriture gagne, à horodatage valide : un enregistrement sans
      // date exploitable (0) n'écrase jamais un enregistrement daté, et à
      // égalité on conserve la version locale (édits non encore poussés).
      const localTime = recordTime(existing);
      const cloudTime = recordTime(r);
      if (cloudTime > 0 && cloudTime > localTime) {
        map.set(id, r);
      }
    }
  }

  return Array.from(map.values());
}
