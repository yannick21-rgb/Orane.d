import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useFinance } from './FinanceContext';
import { debtsKey, computeDebtStatus, DEBT_STATUS } from '../model/DebtModel';
import { toNumber } from '../utils/format';
import { validateDebt, filterValidRecords } from '../utils/storage';
import { secureReadJSON, secureWriteJSON } from '../utils/secureStorage';
import { sync, mergeRecords } from '../utils/sync';
import { generateId } from '../utils/id';
import Constants from 'expo-constants';

const DebtContext = createContext({});

export function DebtProvider({ children }) {
  const { userId } = useAuth();
  const { devise } = useFinance();
  const deviseSymbol = devise?.split(' ')[0] || 'F';
  const [debts, setDebts] = useState([]);
  // Miroir mutable de `debts` : les mutations en cascade (même tick) lisent
  // cette référence plutôt qu'une closure périmée.
  const debtsRef = useRef([]);
  useEffect(() => { debtsRef.current = debts; }, [debts]);
  const [loaded, setLoaded] = useState(false);
  // Jeton de chargement : si `userId` change pendant un `sync.pull` en vol,
  // la promesse de l'ancien compte abandonne au lieu d'écrire l'état du nouveau.
  const loadSeq = useRef(0);

  const loadDebts = useCallback(async () => {
    const seq = ++loadSeq.current;
    const alive = () => seq === loadSeq.current;
    if (!userId) { setDebts([]); setLoaded(true); return; }
    try {
      const raw = await secureReadJSON(debtsKey(userId), []);
      let local = filterValidRecords(raw, validateDebt);

      await sync.init(userId);
      // Écarte une copie locale d'un enregistrement dont la suppression est
      // encore en attente (sauvegarde locale interrompue).
      local = await sync.filterDeleted('debts', local);
      const cloud = await sync.pull('debts');
      if (!alive()) return;
      if (cloud.length > 0) {
        // Le serveur ne valide pas les lignes : on filtre avant fusion
        // (une dette sans champs requis ferait échouer `filterValidRecords` plus bas).
        local = mergeRecords(local, filterValidRecords(cloud, validateDebt));
      }

      setDebts(local);
    } catch (e) {
      if (!alive()) return;
      console.error('[DebtContext] Erreur chargement :', e);
      setDebts([]);
    } finally {
      if (alive()) setLoaded(true);
    }
  }, [userId]);

  useEffect(() => { loadDebts(); }, [loadDebts]);

  const saveDebts = useCallback(async (updated) => {
    if (!userId) return;
    // Miroir de l'état : les mutations (add/update/markReimbursed) lisent ce
    // ref et non la closure `debts` — deux appels dans le même tick (double-tap
    // « Rembourser ») construiraient sinon les deux tableaux depuis la même
    // copie et le second écraserait le premier.
    debtsRef.current = updated;
    setDebts(updated);
    await secureWriteJSON(debtsKey(userId), updated);
    sync.push('debts', updated).catch(() => {});
  }, [userId]);

  const addDebt = useCallback(async (debtData) => {
    const newDebt = {
      ...debtData,
      id: generateId(),
      userId,
      dateCreated: new Date().toISOString(),
      amountReimbursed: 0,
      status: DEBT_STATUS.EN_COURS,
      updated_at: new Date().toISOString(),
    };
    const updated = [...debtsRef.current, newDebt];
    await saveDebts(updated);
    return newDebt;
  }, [userId, saveDebts]);

  const updateDebt = useCallback(async (id, changes) => {
    const updated = debtsRef.current.map((d) => {
      if (d.id !== id) return d;
      const modified = { ...d, ...changes, updated_at: new Date().toISOString() };
      modified.status = computeDebtStatus(modified);
      return modified;
    });
    await saveDebts(updated);
  }, [saveDebts]);

  const deleteDebt = useCallback(async (id) => {
    const updated = debtsRef.current.filter((d) => d.id !== id);
    // `await` obligatoire : sans lui, `saveDebts` (push) s'exécute avant la
    // suppression et la ligne cloud réapparaît au prochain pull.
    await sync.remove('debts', [id]);
    await saveDebts(updated);
  }, [saveDebts]);

  const markReimbursed = useCallback(async (id, amount, skipTransaction) => {
    const debt = debtsRef.current.find((d) => d.id === id);
    if (!debt) return null;
    const newReimbursed = toNumber(debt.amountReimbursed) + toNumber(amount);
    const newStatus = computeDebtStatus({ ...debt, amountReimbursed: newReimbursed });
    const updated = debtsRef.current.map((d) =>
      d.id === id ? { ...d, amountReimbursed: newReimbursed, status: newStatus, updated_at: new Date().toISOString() } : d
    );
    await saveDebts(updated);
    return { ...debt, amountReimbursed: newReimbursed, status: newStatus };
  }, [saveDebts]);

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
            ? `${debt.personName} vous doit ${toNumber(debt.amount) - toNumber(debt.amountReimbursed)} ${deviseSymbol}`
            : `Vous devez ${toNumber(debt.amount) - toNumber(debt.amountReimbursed)} ${deviseSymbol} à ${debt.personName}`,
        },
        // `type` obligatoire : sans lui `parseTrigger` échoue et la
        // notification n'est jamais planifiée (erreur avalée par le catch).
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: due },
      });
    } catch (e) {
      if (e && e.message && e.message.includes('removed from Expo Go')) return;
    }
  }, [deviseSymbol]);

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