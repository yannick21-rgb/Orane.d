import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  createJournalEntry,
  validateJournalEntry,
  sortEntriesByDate,
  getEntriesInPeriod,
  JOURNAL_STATUS,
} from '../model/accounting/JournalEntry';
import {
  buildGeneralLedger,
  getAccountBalance,
  getLedgerSummary,
} from '../model/accounting/GeneralLedger';
import {
  buildTrialBalance,
  buildTrialBalanceByClass,
  isBalanced,
} from '../model/accounting/TrialBalance';
import {
  buildBalanceSheet,
  buildIncomeStatement,
  getFinancialSummary,
} from '../model/accounting/FinancialStatements';
import { safeAsyncReadJSON, safeAsyncWriteJSON } from '../utils/storage';

const AccountingContext = createContext({});

const ENTRIES_KEY = (uid) => `@oraned_accounting_entries_${uid}`;
const PERIOD_KEY = (uid) => `@oraned_accounting_period_${uid}`;

export function AccountingProvider({ children }) {
  const { userId } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(null);

  const loadEntries = useCallback(async () => {
    if (!userId) {
      setEntries([]);
      setLoaded(true);
      return;
    }
    try {
      const data = await safeAsyncReadJSON(ENTRIES_KEY(userId), []);
      setEntries(Array.isArray(data) ? data : []);
      const period = await safeAsyncReadJSON(PERIOD_KEY(userId), null);
      if (period) setCurrentPeriod(period);
    } catch (e) {
      console.error('[AccountingContext] Erreur chargement :', e);
      setEntries([]);
    } finally {
      setLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const persistEntries = useCallback(async (updated) => {
    setEntries(updated);
    if (userId) {
      await safeAsyncWriteJSON(ENTRIES_KEY(userId), updated);
    }
  }, [userId]);

  const addEntry = useCallback(async (entryData) => {
    const newEntry = createJournalEntry({
      ...entryData,
      userId,
    });
    const validation = validateJournalEntry(newEntry);
    if (!validation.valid) {
      throw new Error(validation.errors.join('\n'));
    }
    const updated = [newEntry, ...entries];
    await persistEntries(updated);
    return newEntry;
  }, [entries, userId, persistEntries]);

  const updateEntry = useCallback(async (id, changes) => {
    const updated = entries.map((e) =>
      e.id === id
        ? { ...e, ...changes, updatedAt: new Date().toISOString() }
        : e
    );
    await persistEntries(updated);
  }, [entries, persistEntries]);

  const deleteEntry = useCallback(async (id) => {
    const updated = entries.filter((e) => e.id !== id);
    await persistEntries(updated);
  }, [entries, persistEntries]);

  const postEntry = useCallback(async (id) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) throw new Error('Écriture introuvable');
    if (entry.status === JOURNAL_STATUS.POSTED) {
      throw new Error('Cette écriture est déjà validée');
    }
    const validation = validateJournalEntry(entry);
    if (!validation.valid) {
      throw new Error(validation.errors.join('\n'));
    }
    await updateEntry(id, { status: JOURNAL_STATUS.POSTED });
  }, [entries, updateEntry]);

  const unpostEntry = useCallback(async (id) => {
    await updateEntry(id, { status: JOURNAL_STATUS.DRAFT });
  }, [updateEntry]);

  const getEntries = useCallback((filters = {}) => {
    let result = [...entries];
    if (filters.status) {
      result = result.filter((e) => e.status === filters.status);
    }
    if (filters.startDate && filters.endDate) {
      result = getEntriesInPeriod(result, filters.startDate, filters.endDate);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.reference.toLowerCase().includes(q)
      );
    }
    return sortEntriesByDate(result);
  }, [entries]);

  const getLedger = useCallback((accountCode) => {
    return buildGeneralLedger(entries, accountCode);
  }, [entries]);

  const getLedgerSummaryData = useCallback(() => {
    return getLedgerSummary(entries);
  }, [entries]);

  const getTrialBalance = useCallback(() => {
    return buildTrialBalance(entries);
  }, [entries]);

  const getTrialBalanceByClass = useCallback(() => {
    return buildTrialBalanceByClass(entries);
  }, [entries]);

  const getBalanceSheet = useCallback(() => {
    return buildBalanceSheet(entries);
  }, [entries]);

  const getIncomeStatement = useCallback(() => {
    return buildIncomeStatement(entries);
  }, [entries]);

  const getSummary = useCallback(() => {
    return getFinancialSummary(entries);
  }, [entries]);

  const getAccountBalances = useCallback((accountCodes) => {
    const result = {};
    for (const code of accountCodes) {
      result[code] = getAccountBalance(entries, code);
    }
    return result;
  }, [entries]);

  const setFiscalPeriod = useCallback(async (period) => {
    setCurrentPeriod(period);
    if (userId) {
      await safeAsyncWriteJSON(PERIOD_KEY(userId), period);
    }
  }, [userId]);

  const draftCount = entries.filter((e) => e.status === JOURNAL_STATUS.DRAFT).length;
  const postedCount = entries.filter((e) => e.status === JOURNAL_STATUS.POSTED).length;

  return (
    <AccountingContext.Provider
      value={{
        entries,
        loaded,
        draftCount,
        postedCount,
        currentPeriod,
        addEntry,
        updateEntry,
        deleteEntry,
        postEntry,
        unpostEntry,
        getEntries,
        getLedger,
        getLedgerSummaryData,
        getTrialBalance,
        getTrialBalanceByClass,
        getBalanceSheet,
        getIncomeStatement,
        getSummary,
        getAccountBalances,
        setFiscalPeriod,
        refresh: loadEntries,
      }}
    >
      {children}
    </AccountingContext.Provider>
  );
}

export const useAccounting = () => useContext(AccountingContext);
