import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { tontinesKey, generateRounds, ROUND_STATUS, computeTontineSummary } from '../model/TontineModel';
import { toNumber } from '../utils/format';
import { validateTontine, filterValidRecords, safeAsyncReadJSON, safeAsyncWriteJSON } from '../utils/storage';

const TontineContext = createContext({});

export function TontineProvider({ children }) {
  const { userId } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!userId) { setGroups([]); setLoaded(true); return; }
    try {
      const raw = await safeAsyncReadJSON(tontinesKey(userId), []);
      setGroups(filterValidRecords(raw, validateTontine));
    } catch (e) {
      console.error('[TontineContext] Erreur chargement :', e);
      setGroups([]);
    } finally {
      setLoaded(true);
    }
  }, [userId]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const saveGroups = useCallback(async (updated) => {
    if (!userId) return;
    setGroups(updated);
    await safeAsyncWriteJSON(tontinesKey(userId), updated);
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
    };
    const updated = [...groups, newGroup];
    await saveGroups(updated);
    return newGroup;
  }, [groups, userId, saveGroups]);

  const updateGroup = useCallback(async (id, changes) => {
    const updated = groups.map((g) => (g.id === id ? { ...g, ...changes } : g));
    await saveGroups(updated);
  }, [groups, saveGroups]);

  const deleteGroup = useCallback(async (id) => {
    const updated = groups.filter((g) => g.id !== id);
    await saveGroups(updated);
  }, [groups, saveGroups]);

  const markRoundPaid = useCallback(async (groupId, roundNumber) => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      const rounds = g.rounds.map((r) =>
        r.roundNumber === roundNumber ? { ...r, status: ROUND_STATUS.PAYE } : r
      );
      return { ...g, rounds };
    });
    await saveGroups(updated);
  }, [groups, saveGroups]);

  const markRoundReceived = useCallback(async (groupId, roundNumber) => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      const rounds = g.rounds.map((r) =>
        r.roundNumber === roundNumber ? { ...r, status: ROUND_STATUS.RECU } : r
      );
      return { ...g, rounds };
    });
    await saveGroups(updated);
  }, [groups, saveGroups]);

  const scheduleRoundNotifications = useCallback(async (group) => {
    try {
      const Notifications = require('expo-notifications');
      const upcoming = group.rounds.filter((r) => r.status === ROUND_STATUS.A_PAYER).slice(0, 5);
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
          trigger: { date: remindDate },
        });
      }
    } catch (e) {
      console.error('[TontineContext] Erreur notification :', e);
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