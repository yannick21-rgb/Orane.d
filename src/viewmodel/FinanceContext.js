import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useColorScheme, Alert, Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { LanguageManager } from '../utils/LanguageManager';
import { exportTransactionsToCSV as exportCSV } from '../service/exportCSV';
import { verifyPassword, hashPin, verifyPin, storePinHash, getStoredPinHash, removePinHash, checkPinRateLimit, recordFailedPinAttempt, resetPinRateLimit, getRemainingAttemptsText } from '../utils/security';
import { safeAsyncRead, safeAsyncReadJSON, safeAsyncWriteJSON, safeAsyncWrite, safeAsyncRemove, validateTransaction, filterValidRecords } from '../utils/storage';
import { secureSet, secureGet, secureGetJSON, secureRemove, initSecureStorage } from '../utils/secureStorage';
import { sync, mergeRecords } from '../utils/sync';
import Constants from 'expo-constants';

let Notifications = null;

function isExpoGo() {
  try {
    return Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
  } catch (_) {
    return false;
  }
}

async function loadNotifications() {
  if (isExpoGo()) return false;
  if (Notifications !== null) return Notifications !== false;
  try {
    Notifications = await import('expo-notifications');
    return true;
  } catch (e) {
    if (e && e.message && e.message.includes('removed from Expo Go')) return false;
    Notifications = false;
    return false;
  }
}

const normalizeType = (type) => {
  if (type === 'expense') return 'depense';
  if (type === 'income') return 'revenu';
  return type;
};

const FinanceContext = createContext();

export function FinanceProvider({ children }) {
  const { userId } = useAuth();
  const systemScheme = useColorScheme() || 'light';

  const [transactions, setTransactions] = useState([]);
  const [theme, setTheme] = useState('Système');
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [devise, setDevise] = useState('€ (EUR)');
  const [locale, setLocale] = useState(LanguageManager.currentLanguage);
  const [budgetLimit, setBudgetLimit] = useState(0);
  const [budgetPeriod, setBudgetPeriod] = useState('month');
  const [budgetStartDate, setBudgetStartDate] = useState(null);
  const [reminderHour, setReminderHour] = useState(20);
  const [reminderMinute, setReminderMinute] = useState(0);

  const [isDiscreteMode, setIsDiscreteMode] = useState(true);
  const [hasPinCode, setHasPinCode] = useState(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const lastSavedUserId = useRef(null);

  const isDark = theme === 'Sombre' || (theme === 'Système' && systemScheme === 'dark');

  const walletBalances = useMemo(() => {
    let totalMomo = 0;
    let totalCash = 0;
    let totalBanque = 0;
    let totalDepenses = 0;
    (transactions || []).forEach((tx) => {
      if (!tx) return;
      const type = normalizeType(tx.type);
      const wallet = tx.wallet || 'momo';
      if (type === 'transfert') {
        const amount = Number(tx.amountReceived ?? Number(tx.amount) - (tx.momoFee || 0)) || 0;
        const frais = Number(tx.frais ?? tx.momoFee) || 0;
        totalMomo -= (amount + frais);
        totalCash += amount;
        totalDepenses += frais;
      } else if (type === 'revenu') {
        const amt = Number(tx.amount) || 0;
        if (wallet === 'momo') totalMomo += amt;
        else if (wallet === 'banque') totalBanque += amt;
        else totalCash += amt;
      } else if (type === 'depense') {
        const amt = Number(tx.amount) || 0;
        if (wallet === 'momo') totalMomo -= amt;
        else if (wallet === 'banque') totalBanque -= amt;
        else totalCash -= amt;
        totalDepenses += amt;
      }
    });
    return { momoBalance: totalMomo, cashBalance: totalCash, banqueBalance: totalBanque, totalDepenses };
  }, [transactions]);

  useEffect(() => {
    const init = async () => {
      try {
        await LanguageManager.init();
        setLocale(LanguageManager.currentLanguage);

        if (await loadNotifications()) {
          try {
            await Notifications.getAllScheduledNotificationsAsync();
          } catch (_) {
            Notifications = false;
          }
        }

        const [storedTheme, storedAccent, storedDevise, storedPeriod, storedHour, storedMinute, storedStartDate] = await Promise.all([
          safeAsyncRead('@user_theme', null),
          safeAsyncRead('@accent_color', null),
          safeAsyncRead('@devise', null),
          safeAsyncRead('@oraned_budget_period', null),
          safeAsyncRead('@oraned_reminder_hour', null),
          safeAsyncRead('@oraned_reminder_minute', null),
          safeAsyncRead('@oraned_budget_start_date', null),
        ]);

        if (storedTheme) setTheme(storedTheme);
        if (storedAccent) setAccentColor(storedAccent);
        if (storedDevise) setDevise(storedDevise);
        if (storedPeriod) setBudgetPeriod(storedPeriod);
        if (storedStartDate) setBudgetStartDate(storedStartDate);
        if (storedHour) setReminderHour(Number(storedHour));
        if (storedMinute) setReminderMinute(Number(storedMinute));
      } catch (err) {
        console.error('[FinanceContext] Erreur de chargement :', err);
      } finally {
        setIsLoaded(true);
      }
    };
    init();
  }, []);

  const scheduleMonthlyReview = useCallback(async () => {
    if (isExpoGo()) return;
    if (!(await loadNotifications())) return;
    try {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      lastDay.setHours(20, 0, 0, 0);
      if (lastDay <= now) {
        lastDay.setMonth(lastDay.getMonth() + 1);
        lastDay.setDate(0);
        lastDay.setHours(20, 0, 0, 0);
      }
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Bilan mensuel Orane.d', body: 'Découvre ton bilan financier du mois !' },
        trigger: { date: lastDay, channelId: 'monthly-review' },
      });
    } catch (_) {
      Notifications = false;
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      sync.reset();
      setTransactions([]);
      setBudgetLimit(0);
      setBudgetStartDate(null);
      setHasPinCode(false);
      setIsDiscreteMode(true);
      setIsUserDataLoaded(false);
      lastSavedUserId.current = null;
      return;
    }

    setIsUserDataLoaded(false);

    const loadUserData = async () => {
      try {
        const txKey = `@oraned_transactions_${userId}`;
        const storedTx = await safeAsyncReadJSON(txKey, null);

        let localTx;

        if (storedTx && Array.isArray(storedTx)) {
          localTx = filterValidRecords(storedTx, validateTransaction);
        } else {
          const oldTx = await safeAsyncReadJSON('@transactions', null);
          if (oldTx && Array.isArray(oldTx)) {
            localTx = filterValidRecords(oldTx, validateTransaction);
            await safeAsyncWriteJSON(txKey, localTx);
          } else {
            localTx = [];
          }
        }

        await sync.init(userId);
        const cloudTx = await sync.pull('transactions');
        if (cloudTx.length > 0) {
          localTx = mergeRecords(localTx, cloudTx);
        }

        setTransactions(localTx);

        const storedBudget = await safeAsyncReadJSON(`@oraned_budget_limit_${userId}`, null);
        if (storedBudget !== null) {
          setBudgetLimit(Number(storedBudget));
        } else {
          const oldBudget = await safeAsyncRead('@budget_limit', null);
          if (oldBudget !== null) {
            setBudgetLimit(Number(oldBudget));
            await safeAsyncWriteJSON(`@oraned_budget_limit_${userId}`, Number(oldBudget));
          } else {
            setBudgetLimit(0);
          }
        }

        const storedStartDate = await safeAsyncRead('@oraned_budget_start_date', null);
        if (storedStartDate) setBudgetStartDate(storedStartDate);

        const storedHash = await getStoredPinHash(userId);
        if (storedHash) {
          setHasPinCode(true);
        } else {
          const legacyPin = await safeAsyncReadJSON(`@oraned_pin_${userId}`, null);
          if (legacyPin) {
            const hashed = await hashPin(legacyPin);
            await storePinHash(userId, hashed);
            await safeAsyncRemove(`@oraned_pin_${userId}`);
            setHasPinCode(true);
          } else {
            setHasPinCode(false);
          }
        }

        lastSavedUserId.current = userId;
      } catch (err) {
        console.error('[FinanceContext] Erreur chargement données utilisateur :', err);
        setTransactions([]);
        setBudgetLimit(0);
      } finally {
        setIsUserDataLoaded(true);
        scheduleMonthlyReview();
      }
    };

    loadUserData();
  }, [userId, scheduleMonthlyReview]);

  const changeGlobalLanguage = async (langValue) => {
    try {
      if (typeof LanguageManager.changeLanguage === 'function') {
        await LanguageManager.changeLanguage(langValue);
      } else if (typeof LanguageManager.setLanguage === 'function') {
        await LanguageManager.setLanguage(langValue);
      } else {
        LanguageManager.currentLanguage = langValue;
        await safeAsyncWrite('@app_language', langValue);
      }
      setLocale(langValue);
    } catch (error) {
      console.error('[FinanceContext] Erreur changement langue global :', error);
    }
  };

  // ✅ Supprimée au profit de checkBudgetPeriodAlert (voir addTransaction)

  const saveNewPin = async (newPin) => {
    if (!userId) return;
    const hashed = await hashPin(newPin);
    await storePinHash(userId, hashed);
    setHasPinCode(true);
  };

  const unlockDiscreteMode = async (enteredPin) => {
    if (!userId) return false;
    const { locked, waitMs } = await checkPinRateLimit(userId);
    if (locked) {
      const sec = Math.ceil(waitMs / 1000);
      let msg = 'Trop de tentatives. ';
      if (sec >= 3600) msg += `Réessayez dans ${Math.floor(sec / 3600)}h.`;
      else if (sec >= 60) msg += `Réessayez dans ${Math.floor(sec / 60)}min ${sec % 60}s.`;
      else msg += `Réessayez dans ${sec}s.`;
      if (waitMs >= 3600000) msg += ' Utilisez "PIN oublié" dans Paramètres.';
      throw new Error(msg);
    }
    const storedHash = await getStoredPinHash(userId);
    if (!storedHash) {
      setIsDiscreteMode(false);
      return true;
    }
    const valid = await verifyPin(enteredPin, storedHash);
    if (valid) {
      await resetPinRateLimit(userId);
      setIsDiscreteMode(false);
      return true;
    }
    const result = await recordFailedPinAttempt(userId);
    let msg = 'Code PIN incorrect.';
    if (result.attempts >= 10) {
      msg += ' Compte verrouillé 1h. Utilisez "PIN oublié" dans Paramètres.';
    } else if (result.attempts >= 5) {
      msg += ` Bloqué 5min. Encore ${10 - result.attempts} tentative(s) avant verrouillage 1h.`;
    } else if (result.attempts >= 3) {
      msg += ` Bloqué 30s. Encore ${5 - result.attempts} tentative(s) avant blocage 5min.`;
    } else {
      msg += ` Encore ${result.remainingAttempts} tentative(s).`;
    }
    throw new Error(msg);
  };

  const toggleDiscreteMode = () => {
    setIsDiscreteMode((prev) => !prev);
  };

  const changePinCode = async (oldPin, newPin) => {
    if (!userId) return false;
    const storedHash = await getStoredPinHash(userId);
    if (storedHash) {
      const valid = await verifyPin(oldPin, storedHash);
      if (!valid) return false;
    }
    const newHashed = await hashPin(newPin);
    await storePinHash(userId, newHashed);
    return true;
  };

  const resetPinCodeWithPassword = async (password, newPin) => {
    if (!userId) return false;
    const users = await safeAsyncReadJSON('@oraned_all_users', []);
    const found = users.find((u) => u.email === userId);
    if (!found) return false;
    const isHashed = typeof found.password === 'string' && found.password.includes(':');
    let isValid;
    if (!isHashed) {
      isValid = found.password === password;
    } else {
      isValid = await verifyPassword(password, found.password);
    }
    if (!isValid) return false;
    const hashed = await hashPin(newPin);
    await storePinHash(userId, hashed);
    await resetPinRateLimit(userId);
    setHasPinCode(true);
    return true;
  };

  const resetPinCodeDirect = async (newPin) => {
    if (!userId) return false;
    const hashed = await hashPin(newPin);
    await storePinHash(userId, hashed);
    await resetPinRateLimit(userId);
    setHasPinCode(true);
    return true;
  };

  const exportTransactionsAsCSV = async () => {
    const symbol = devise?.split(' ')[0] || '€';
    await exportCSV(transactions, symbol);
  };

  const getPeriodExpenses = useCallback(() => {
    const now = new Date();
    return (transactions || []).filter((t) => {
      if (!t) return false;
      const type = normalizeType(t.type);
      if (type !== 'depense' && type !== 'transfert') return false;
      const d = new Date(t.date);
      if (budgetPeriod === 'day') return d.toDateString() === now.toDateString();
      if (budgetPeriod === 'week') {
        if (budgetStartDate) {
          const start = new Date(budgetStartDate);
          const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
          const periodStart = new Date(start);
          periodStart.setDate(start.getDate() + Math.floor(diffDays / 7) * 7);
          periodStart.setHours(0, 0, 0, 0);
          const periodEnd = new Date(periodStart);
          periodEnd.setDate(periodStart.getDate() + 7);
          return d >= periodStart && d < periodEnd;
        }
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        return d >= startOfWeek && d < endOfWeek;
      }
      if (budgetStartDate) {
        const startDay = new Date(budgetStartDate).getDate();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), startDay);
        if (now < periodStart) periodStart.setMonth(periodStart.getMonth() - 1);
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        return d >= periodStart && d < periodEnd;
      }
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, t) => {
      if (normalizeType(t.type) === 'transfert') {
        const frais = Number(t.frais ?? t.momoFee) || 0;
        return sum + frais;
      }
      return sum + (Number(t.amount) || 0);
    }, 0);
  }, [transactions, budgetPeriod, budgetStartDate]);

  const checkBudgetPeriodAlert = useCallback((totalOverride) => {
    if (budgetLimit <= 0) return;
    const total = totalOverride !== undefined ? totalOverride : getPeriodExpenses();
    const percentage = (total / budgetLimit) * 100;
    const symbol = devise?.split(' ')[0] || '€';
    const periodLabel = { day: "aujourd'hui", week: 'cette semaine', month: 'ce mois' }[budgetPeriod] || 'ce mois';
    if (percentage >= 100) {
      Alert.alert('Budget dépassé !', `Tu as dépensé ${total}${symbol} sur ${budgetLimit}${symbol} ${periodLabel}.`);
    } else if (percentage >= 80) {
      Alert.alert('Attention budget', `Tu as consommé ${Math.round(percentage)}% de ton budget ${periodLabel} (${total}${symbol}/${budgetLimit}${symbol}).`);
    }
  }, [budgetLimit, budgetPeriod, getPeriodExpenses, devise]);

  const updateDailyReminderTime = async (hour, minute) => {
    if (isExpoGo()) return;
    if (!(await loadNotifications())) return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setReminderHour(hour);
      setReminderMinute(minute);
      const now = new Date();
      const scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
      if (scheduled <= now) scheduled.setDate(scheduled.getDate() + 1);
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Orane.d', body: 'Pense à enregistrer tes dépenses du jour !' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
    } catch (_) {
      Notifications = false;
    }
  };

  useEffect(() => {
    if (!isLoaded || !userId) return;
    if (lastSavedUserId.current !== userId) return;
    safeAsyncWriteJSON(`@oraned_transactions_${userId}`, transactions).then(() => {
      sync.push('transactions', transactions);
    }).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde transactions :', err)
    );
  }, [transactions, isLoaded, userId]);

  useEffect(() => {
    if (!isLoaded) return;
    safeAsyncWrite('@user_theme', theme).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde thème :', err)
    );
  }, [theme, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    safeAsyncWrite('@accent_color', accentColor).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde couleur :', err)
    );
  }, [accentColor, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    safeAsyncWrite('@devise', devise).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde devise :', err)
    );
  }, [devise, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    if (lastSavedUserId.current !== userId) return;
    safeAsyncWriteJSON(`@oraned_budget_limit_${userId}`, budgetLimit).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde budget :', err)
    );
  }, [budgetLimit, isLoaded, userId]);

  useEffect(() => {
    if (!isLoaded) return;
    safeAsyncWrite('@oraned_budget_period', budgetPeriod).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde période budget :', err)
    );
  }, [budgetPeriod, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    safeAsyncWrite('@oraned_budget_start_date', budgetStartDate).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde date début budget :', err)
    );
  }, [budgetStartDate, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    safeAsyncWrite('@oraned_reminder_hour', String(reminderHour)).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde heure rappel :', err)
    );
  }, [reminderHour, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    safeAsyncWrite('@oraned_reminder_minute', String(reminderMinute)).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde minute rappel :', err)
    );
  }, [reminderMinute, isLoaded]);

  const addTransaction = (transaction) => {
    const getEffectiveExpense = (t) => {
      if (normalizeType(t.type) === 'depense') return Number(t.amount) || 0;
      if (normalizeType(t.type) === 'transfert') return Number(t.frais ?? t.momoFee) || 0;
      return 0;
    };
    const newTxExpense = getEffectiveExpense(transaction);
    const prevTotal = getPeriodExpenses();
    const record = { ...transaction, updated_at: new Date().toISOString() };
    setTransactions((prev) => [record, ...(prev || [])]);
    if (budgetLimit > 0 && newTxExpense > 0) {
      checkBudgetPeriodAlert(prevTotal + newTxExpense);
    }
  };

  const updateTransaction = (id, updates) => {
    setTransactions((prev) =>
      (prev || []).map((t) =>
        t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
      )
    );
  };

  const deleteTransaction = (id) => {
    setTransactions((prev) => (prev || []).filter((t) => t.id !== id));
  };

  const deleteMultipleTransactions = (ids) => {
    setTransactions((prev) => (prev || []).filter((t) => !ids.includes(t.id)));
  };

  const resetAllTransactions = () => {
    setTransactions([]);
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions, momoBalance: walletBalances.momoBalance, cashBalance: walletBalances.cashBalance, banqueBalance: walletBalances.banqueBalance,
        totalDepenses: walletBalances.totalDepenses, theme, setTheme, accentColor, setAccentColor,
        devise, setDevise, locale, changeGlobalLanguage, isDark, budgetLimit, setBudgetLimit,
        addTransaction, updateTransaction, deleteTransaction, deleteMultipleTransactions, resetAllTransactions,
        isLoaded, isUserDataLoaded, editingTransaction, setEditingTransaction, isDiscreteMode, hasPinCode, saveNewPin, unlockDiscreteMode,
        toggleDiscreteMode, changePinCode, resetPinCodeWithPassword, resetPinCodeDirect, exportTransactionsAsCSV,
        budgetPeriod, setBudgetPeriod, budgetStartDate, setBudgetStartDate, reminderHour, reminderMinute, checkBudgetPeriodAlert, getPeriodExpenses,
        updateDailyReminderTime, scheduleMonthlyReview,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => useContext(FinanceContext);