import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { debtsKey, computeDebtStatus, DEBT_STATUS } from '../model/DebtModel';
import { toNumber } from '../utils/format';
import { validateDebt, filterValidRecords, safeAsyncReadJSON, safeAsyncWriteJSON } from '../utils/storage';
import { sync, mergeRecords } from '../utils/sync';
import Constants from 'expo-constants';

const DebtContext = createContext({});

export function DebtProvider({ children }) {
  const { userId } = useAuth();
  const [debts, setDebts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const loadDebts = useCallback(async () => {
    if (!userId) { setDebts([]); setLoaded(true); return; }
    try {
      const raw = await safeAsyncReadJSON(debtsKey(userId), []);
      let local = filterValidRecords(raw, validateDebt);

      await sync.init(userId);
      const cloud = await sync.pull('debts');
      if (cloud.length > 0) {
        local = mergeRecords(local, cloud);
      }

      setDebts(local);
    } catch (e) {
      console.error('[DebtContext] Erreur chargement :', e);
      setDebts([]);
    } finally {
      setLoaded(true);
    }
  }, [userId]);

  useEffect(() => { loadDebts(); }, [loadDebts]);

  const saveDebts = useCallback(async (updated) => {
    if (!userId) return;
    setDebts(updated);
    await safeAsyncWriteJSON(debtsKey(userId), updated);
    sync.push('debts', updated);
  }, [userId]);

  const addDebt = useCallback(async (debtData) => {
    const newDebt = {
      ...debtData,
      id: Date.now().toString(),
      userId,
      dateCreated: new Date().toISOString(),
      amountReimbursed: 0,
      status: DEBT_STATUS.EN_COURS,
      updated_at: new Date().toISOString(),
    };
    const updated = [...debts, newDebt];
    await saveDebts(updated);
    return newDebt;
  }, [debts, userId, saveDebts]);

  const updateDebt = useCallback(async (id, changes) => {
    const updated = debts.map((d) => {
      if (d.id !== id) return d;
      const modified = { ...d, ...changes, updated_at: new Date().toISOString() };
      modified.status = computeDebtStatus(modified);
      return modified;
    });
    await saveDebts(updated);
  }, [debts, saveDebts]);

  const deleteDebt = useCallback(async (id) => {
    const updated = debts.filter((d) => d.id !== id);
    await saveDebts(updated);
  }, [debts, saveDebts]);

  const markReimbursed = useCallback(async (id, amount, skipTransaction) => {
    const debt = debts.find((d) => d.id === id);
    if (!debt) return null;
    const newReimbursed = toNumber(debt.amountReimbursed) + toNumber(amount);
    const newStatus = computeDebtStatus({ ...debt, amountReimbursed: newReimbursed });
    const updated = debts.map((d) =>
      d.id === id ? { ...d, amountReimbursed: newReimbursed, status: newStatus, updated_at: new Date().toISOString() } : d
    );
    await saveDebts(updated);
    return { ...debt, amountReimbursed: newReimbursed, status: newStatus };
  }, [debts, saveDebts]);

  const scheduleDueDateNotification = useCallback(async (debt) => {
    if (!debt.dueDate || !debt.reminderEnabled) return;
    try {
      try { if (Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient') return; } catch (_) {}
      const Notifications = require('expo-notifications');
      const due = new Date(debt.dueDate);
      if (due <= new Date()) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Orane.d — Échéance',
          body: debt.type === 'credit_accorde'
            ? `${debt.personName} vous doit ${debt.amount - debt.amountReimbursed} F`
            : `Vous devez ${debt.amount - debt.amountReimbursed} F à ${debt.personName}`,
        },
        trigger: { date: due },
      });
    } catch (e) {
      if (e && e.message && e.message.includes('removed from Expo Go')) return;
    }
  }, []);

  const totalToReceive = debts
    .filter((d) => d.type === 'credit_accorde' && d.status !== DEBT_STATUS.REMBOURSEE)
    .reduce((s, d) => s + (toNumber(d.amount) - toNumber(d.amountReimbursed)), 0);

  const totalToRepay = debts
    .filter((d) => d.type === 'credit_recu' && d.status !== DEBT_STATUS.REMBOURSEE)
    .reduce((s, d) => s + (toNumber(d.amount) - toNumber(d.amountReimbursed)), 0);

  return (
    <DebtContext.Provider
      value={{
        debts, loaded, addDebt, updateDebt, deleteDebt, markReimbursed,
        scheduleDueDateNotification, totalToReceive, totalToRepay, refreshDebts: loadDebts,
      }}
    >
      {children}
    </DebtContext.Provider>
  );
}

export const useDebts = () => useContext(DebtContext);