import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { tontinesKey, generateRounds, ROUND_STATUS, computeTontineSummary } from '../model/TontineModel';
import { toNumber } from '../utils/format';
import { validateTontine, filterValidRecords, safeAsyncReadJSON, safeAsyncWriteJSON } from '../utils/storage';
import { sync, mergeRecords } from '../utils/sync';
import Constants from 'expo-constants';

const TontineContext = createContext({});

export function TontineProvider({ children }) {
  const { userId } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loaded, setLoaded] = useState(false);
  // Jeton de chargement : voir DebtContext — évite qu'un ancien compte écrive
  // l'état du compte connecté quand `sync.pull` résout trop tard.
  const loadSeq = useRef(0);

  const loadGroups = useCallback(async () => {
    const seq = ++loadSeq.current;
    const alive = () => seq === loadSeq.current;
    if (!userId) { setGroups([]); setLoaded(true); return; }
    try {
      const raw = await safeAsyncReadJSON(tontinesKey(userId), []);
      let local = filterValidRecords(raw, validateTontine);

      await sync.init(userId);
      const cloud = await sync.pull('tontines');
      if (!alive()) return;
      if (cloud.length > 0) {
        // Le serveur ne valide pas les enregistrements : on filtre avant fusion,
        // sinon un groupe sans `rounds` plante `computeTontineSummary` au rendu.
        local = mergeRecords(local, filterValidRecords(cloud, validateTontine));
      }

      setGroups(local);
    } catch (e) {
      if (!alive()) return;
      console.error('[TontineContext] Erreur chargement :', e);
      setGroups([]);
    } finally {
      if (alive()) setLoaded(true);
    }
  }, [userId]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const saveGroups = useCallback(async (updated) => {
    if (!userId) return;
    setGroups(updated);
    await safeAsyncWriteJSON(tontinesKey(userId), updated);
    sync.push('tontines', updated).catch(() => {});
  }, [userId]);

  const addGroup = useCallback(async (data) => {
    const rounds = generateRounds(data);
    const newGroup = {
      id: Date.now().toString(),
      userId,
      groupName: data.groupName.trim(),
      amountPerTour: toNumber(data.amountPerTour),
      frequency: data.frequency,
      totalParticipants: parseInt(data.totalParticipants, 10) || 1,
      myPosition: parseInt(data.myPosition, 10) || 1,
      startDate: data.startDate instanceof Date ? data.startDate.toISOString() : data.startDate,
      rounds,
      updated_at: new Date().toISOString(),
    };
    const updated = [...groups, newGroup];
    await saveGroups(updated);
    return newGroup;
  }, [groups, userId, saveGroups]);

  const updateGroup = useCallback(async (id, changes) => {
    const updated = groups.map((g) => {
      if (g.id !== id) return g;
      const merged = {
        ...g,
        ...changes,
        // `addGroup` stocke la date en ISO ; on normalise aussi à l'édition.
        startDate: changes.startDate instanceof Date
          ? changes.startDate.toISOString()
          : (changes.startDate ?? g.startDate),
        updated_at: new Date().toISOString(),
      };
      // Un changement structurel doit régénérer les tours : sinon les
      // échéances et montants restent ceux de l'ancienne configuration.
      const structural =
        merged.amountPerTour !== g.amountPerTour ||
        merged.frequency !== g.frequency ||
        merged.totalParticipants !== g.totalParticipants ||
        merged.myPosition !== g.myPosition ||
        String(merged.startDate) !== String(g.startDate);
      if (structural) {
        const previousStatus = new Map(
          (Array.isArray(g.rounds) ? g.rounds : []).map((r) => [r.roundNumber, r.status])
        );
        merged.rounds = generateRounds(merged).map((r) => ({
          ...r,
          status: previousStatus.get(r.roundNumber) || r.status,
        }));
      }
      return merged;
    });
    await saveGroups(updated);
  }, [groups, saveGroups]);

  const deleteGroup = useCallback(async (id) => {
    const updated = groups.filter((g) => g.id !== id);
    // `saveGroups` ne fait qu'un upsert : la ligne cloud reviendrait sinon.
    sync.remove('tontines', [id]);
    await saveGroups(updated);
  }, [groups, saveGroups]);

  const markRoundPaid = useCallback(async (groupId, roundNumber) => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      const rounds = (Array.isArray(g.rounds) ? g.rounds : []).map((r) =>
        r.roundNumber === roundNumber ? { ...r, status: ROUND_STATUS.PAYE } : r
      );
      return { ...g, rounds, updated_at: new Date().toISOString() };
    });
    await saveGroups(updated);
  }, [groups, saveGroups]);

  const markRoundReceived = useCallback(async (groupId, roundNumber) => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      const rounds = (Array.isArray(g.rounds) ? g.rounds : []).map((r) =>
        r.roundNumber === roundNumber ? { ...r, status: ROUND_STATUS.RECU } : r
      );
      return { ...g, rounds, updated_at: new Date().toISOString() };
    });
    await saveGroups(updated);
  }, [groups, saveGroups]);

  const scheduleRoundNotifications = useCallback(async (group) => {
    try {
      try { if (Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient') return; } catch (_) {}
      const Notifications = require('expo-notifications');
      const upcoming = (Array.isArray(group.rounds) ? group.rounds : [])
        .filter((r) => r.status === ROUND_STATUS.A_PAYER).slice(0, 5);
      for (const round of upcoming) {
        const dueDate = new Date(round.dueDate);
        if (dueDate <= new Date()) continue;
        const remindDate = new Date(dueDate);
        remindDate.setDate(remindDate.getDate() - 2);
        if (remindDate <= new Date()) continue;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Orane.d — Tontine : ${group.groupName}`,
            body: round.isMyTurnToReceive
              ? `C'est votre tour de recevoir ! (Tour ${round.roundNumber})`
              : `Échéance de cotisation tour ${round.roundNumber} — ${group.amountPerTour} F`,
          },
          // `type` obligatoire : sinon `parseTrigger` échoue silencieusement.
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: remindDate },
        });
      }
    } catch (e) {
      if (e && e.message && e.message.includes('removed from Expo Go')) return;
    }
  }, []);

  const overallSummary = groups.reduce(
    (acc, g) => {
      const s = computeTontineSummary(g);
      return {
        totalPaid: acc.totalPaid + s.totalPaid,
        totalToReceive: acc.totalToReceive + (s.hasReceived ? 0 : s.totalToReceiveAtMyTurn),
      };
    },
    { totalPaid: 0, totalToReceive: 0 }
  );

  return (
    <TontineContext.Provider
      value={{
        groups, loaded, addGroup, updateGroup, deleteGroup,
        markRoundPaid, markRoundReceived, scheduleRoundNotifications,
        refreshGroups: loadGroups, overallSummary, computeTontineSummary,
      }}
    >
      {children}
    </TontineContext.Provider>
  );
}

export const useTontines = () => useContext(TontineContext);