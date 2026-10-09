import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_KEY = (uid) => `@pending_sync_${uid}`;

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
    const queue = raw ? JSON.parse(raw) : [];
    queue.push(item);
    await AsyncStorage.setItem(PENDING_KEY(userId), JSON.stringify(queue));
  } catch (e) {
    console.warn('[sync] enqueue error:', e.message);
  }
}

export const sync = {
  async init(userId) {
    if (_userId === userId) {
      // Init déjà lancé (ou terminé) pour cet utilisateur : si une passe est en
      // vol, on l'attend au lieu de rendre la main tout de suite.
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
    const mapped = records.map((r) => ({ ...r, user_id: sbUserId, updated_at: now }));

    try {
      const { error } = await supabase.from(table).upsert(mapped, {
        ignoreDuplicates: false,
        onConflict: 'id',
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
      return all;
    } catch (e) {
      console.warn(`[sync] pull ${table} error:`, e.message);
      return [];
    }
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
          const { error } = await supabase.from(item.table).upsert(item.records, {
            ignoreDuplicates: false,
            onConflict: 'id',
          });
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
      const localTime = new Date(
        existing.updated_at || existing.updatedAt || 0
      ).getTime();
      const cloudTime = new Date(
        r.updated_at || r.updatedAt || 0
      ).getTime();
      if (cloudTime > localTime) {
        map.set(id, r);
      }
    }
  }

  return Array.from(map.values());
}
