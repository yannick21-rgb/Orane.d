import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useColorScheme, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
let Notifications;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  Notifications = null;
}
import { LanguageManager } from '../utils/LanguageManager';
import { useAuth } from './AuthContext';
import { exportTransactionsToCSV as exportCSV } from '../service/exportCSV';

const normalizeType = (type) => {
  if (type === 'expense') return 'depense';
  if (type === 'income') return 'revenu';
  return type;
};
const isRealExpense = (type) => normalizeType(type) === 'depense';

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
  const [reminderHour, setReminderHour] = useState(20);
  const [reminderMinute, setReminderMinute] = useState(0);

  const [isDiscreteMode, setIsDiscreteMode] = useState(true);
  const [userPinCode, setUserPinCode] = useState('');
  const [hasPinCode, setHasPinCode] = useState(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const lastSavedUserId = useRef(null);

  const isDark = theme === 'Sombre' || (theme === 'Système' && systemScheme === 'dark');

  const walletBalances = useMemo(() => {
    let totalMomo = 0;
    let totalCash = 0;
    let totalDepenses = 0;
    transactions.forEach((tx) => {
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
        else totalCash += amt;
      } else if (type === 'depense') {
        const amt = Number(tx.amount) || 0;
        if (wallet === 'momo') totalMomo -= amt;
        else totalCash -= amt;
        totalDepenses += amt;
      }
    });
    return { momoBalance: totalMomo, cashBalance: totalCash, totalDepenses };
  }, [transactions]);

  useEffect(() => {
    setIsLoaded(true);

    const init = async () => {
      try {
        await LanguageManager.init();
        setLocale(LanguageManager.currentLanguage);

        const [storedTheme, storedAccent, storedDevise, storedPeriod, storedHour, storedMinute] = await Promise.all([
          AsyncStorage.getItem('@user_theme'),
          AsyncStorage.getItem('@accent_color'),
          AsyncStorage.getItem('@devise'),
          AsyncStorage.getItem('@oraned_budget_period'),
          AsyncStorage.getItem('@oraned_reminder_hour'),
          AsyncStorage.getItem('@oraned_reminder_minute'),
        ]);

        if (storedTheme)  setTheme(storedTheme);
        if (storedAccent) setAccentColor(storedAccent);
        if (storedDevise) setDevise(storedDevise);
        if (storedPeriod) setBudgetPeriod(storedPeriod);
        if (storedHour)   setReminderHour(Number(storedHour));
        if (storedMinute) setReminderMinute(Number(storedMinute));
      } catch (err) {
        console.error('[FinanceContext] Erreur de chargement :', err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!userId) {
      setTransactions([]);
      setBudgetLimit(0);
      lastSavedUserId.current = null;
      return;
    }

    const loadUserData = async () => {
      try {
        const [storedTx, storedBudget, oldTx, oldBudget] = await Promise.all([
          AsyncStorage.getItem(`@oraned_transactions_${userId}`),
          AsyncStorage.getItem(`@oraned_budget_limit_${userId}`),
          AsyncStorage.getItem('@transactions'),
          AsyncStorage.getItem('@budget_limit'),
        ]);

        if (storedTx) {
          setTransactions(JSON.parse(storedTx));
        } else if (oldTx) {
          setTransactions(JSON.parse(oldTx));
          await AsyncStorage.setItem(`@oraned_transactions_${userId}`, oldTx);
        } else {
          setTransactions([]);
        }

        if (storedBudget) {
          setBudgetLimit(Number(storedBudget));
        } else if (oldBudget) {
          setBudgetLimit(Number(oldBudget));
          await AsyncStorage.setItem(`@oraned_budget_limit_${userId}`, oldBudget);
        } else {
          setBudgetLimit(0);
        }

          const storedPin = await AsyncStorage.getItem(`@oraned_pin_${userId}`);
          if (storedPin) {
            setUserPinCode(storedPin);
            setHasPinCode(true);
          } else {
            setHasPinCode(false);
          }

          lastSavedUserId.current = userId;
        } catch (err) {
          setTransactions([]);
          setBudgetLimit(0);
          setUserPinCode('');
          console.error('[FinanceContext] Erreur chargement données utilisateur :', err);
        }
      };

      loadUserData();
    }, [userId]);

  const changeGlobalLanguage = async (langValue) => {
    try {
      if (typeof LanguageManager.changeLanguage === 'function') {
        await LanguageManager.changeLanguage(langValue);
      } else if (typeof LanguageManager.setLanguage === 'function') {
        await LanguageManager.setLanguage(langValue);
      } else {
        LanguageManager.currentLanguage = langValue;
        await AsyncStorage.setItem('@app_language', langValue);
      }
      setLocale(langValue);
    } catch (error) {
      console.error('[FinanceContext] Erreur changement langue global :', error);
    }
  };

  const checkBudgetAlert = useCallback((newTotal, limit) => {
    if (limit <= 0) return;
    const percentage = (newTotal / limit) * 100;
    const deviseSymbol = devise?.split(' ')[0] || '€';

    if (percentage >= 100) {
      Alert.alert(
        'Budget dépassé !',
        `Tu as dépensé ${newTotal}${deviseSymbol} sur ${limit}${deviseSymbol}.`
      );
    } else if (percentage >= 80) {
      Alert.alert(
        'Attention budget',
        `Tu as consommé ${Math.round(percentage)}% de ton budget (${newTotal}${deviseSymbol}/${limit}${deviseSymbol}).`
      );
    }
  }, [devise]);

  const saveNewPin = async (newPin) => {
    if (!userId) return;
    await AsyncStorage.setItem(`@oraned_pin_${userId}`, newPin);
    setUserPinCode(newPin);
    setHasPinCode(true);
  };

  const unlockDiscreteMode = (enteredPin) => {
    if (enteredPin === userPinCode) {
      setIsDiscreteMode(false);
      return true;
    }
    return false;
  };

  const toggleDiscreteMode = () => {
    setIsDiscreteMode((prev) => !prev);
  };

  const changePinCode = async (oldPin, newPin) => {
    if (!userId) return false;
    if (oldPin !== userPinCode) return false;
    await AsyncStorage.setItem(`@oraned_pin_${userId}`, newPin);
    setUserPinCode(newPin);
    return true;
  };

  const resetPinCodeWithPassword = async (password, newPin) => {
    if (!userId) return false;
    const raw = await AsyncStorage.getItem('@oraned_all_users');
    const users = raw ? JSON.parse(raw) : [];
    const found = users.find((u) => u.email === userId);
    if (!found || found.password !== password) return false;
    await AsyncStorage.setItem(`@oraned_pin_${userId}`, newPin);
    setUserPinCode(newPin);
    setHasPinCode(true);
    return true;
  };

  const exportTransactionsAsCSV = async () => {
    const symbol = devise?.split(' ')[0] || '€';
    await exportCSV(transactions, symbol);
  };

  const getPeriodExpenses = useCallback(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const type = normalizeType(t.type);
      if (type !== 'depense' && type !== 'transfert') return false;
      const d = new Date(t.date);
      if (budgetPeriod === 'day') {
        return d.toDateString() === now.toDateString();
      }
      if (budgetPeriod === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        return d >= startOfWeek && d < endOfWeek;
      }
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, t) => {
      if (normalizeType(t.type) === 'transfert') {
        const frais = Number(t.frais ?? t.momoFee) || 0;
        return sum + frais;
      }
      return sum + Number(t.amount);
    }, 0);
  }, [transactions, budgetPeriod]);

  const checkBudgetPeriodAlert = useCallback(() => {
    if (budgetLimit <= 0) return;
    const total = getPeriodExpenses();
    const percentage = (total / budgetLimit) * 100;
    const symbol = devise?.split(' ')[0] || '€';
    const periodLabel = { day: 'aujourd\'hui', week: 'cette semaine', month: 'ce mois' }[budgetPeriod] || 'ce mois';

    if (percentage >= 100) {
      Alert.alert(
        'Budget dépassé !',
        `Tu as dépensé ${total}${symbol} sur ${budgetLimit}${symbol} ${periodLabel}.`
      );
    } else if (percentage >= 80) {
      Alert.alert(
        'Attention budget',
        `Tu as consommé ${Math.round(percentage)}% de ton budget ${periodLabel} (${total}${symbol}/${budgetLimit}${symbol}).`
      );
    }
  }, [budgetLimit, budgetPeriod, getPeriodExpenses, devise]);

  const updateDailyReminderTime = async (hour, minute) => {
    if (!Notifications) return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setReminderHour(hour);
      setReminderMinute(minute);

      const now = new Date();
      const scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
      if (scheduled <= now) scheduled.setDate(scheduled.getDate() + 1);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Orane.d',
          body: 'Pense à enregistrer tes dépenses du jour !',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
    } catch (err) {
      console.error('[FinanceContext] Erreur planification rappel :', err);
    }
  };

  const scheduleMonthlyReview = async () => {
    if (!Notifications) return;
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
        content: {
          title: 'Bilan mensuel Orane.d',
          body: 'Découvre ton bilan financier du mois !',
        },
        trigger: { date: lastDay, channelId: 'monthly-review' },
      });
    } catch (err) {
      console.error('[FinanceContext] Erreur planification bilan :', err);
    }
  };

  useEffect(() => {
    if (!isLoaded || !userId) return;
    if (lastSavedUserId.current !== userId) return;
    AsyncStorage.setItem(`@oraned_transactions_${userId}`, JSON.stringify(transactions)).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde transactions :', err)
    );
  }, [transactions, isLoaded, userId]);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem('@user_theme', theme).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde thème :', err)
    );
  }, [theme, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem('@accent_color', accentColor).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde couleur :', err)
    );
  }, [accentColor, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem('@devise', devise).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde devise :', err)
    );
  }, [devise, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    if (lastSavedUserId.current !== userId) return;
    AsyncStorage.setItem(`@oraned_budget_limit_${userId}`, String(budgetLimit)).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde budget :', err)
    );
  }, [budgetLimit, isLoaded, userId]);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem('@oraned_budget_period', budgetPeriod).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde période budget :', err)
    );
  }, [budgetPeriod, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem('@oraned_reminder_hour', String(reminderHour)).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde heure rappel :', err)
    );
  }, [reminderHour, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem('@oraned_reminder_minute', String(reminderMinute)).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde minute rappel :', err)
    );
  }, [reminderMinute, isLoaded]);

  const addTransaction = (transaction) => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const getEffectiveExpense = (t) => {
      if (isRealExpense(t.type)) return Number(t.amount) || 0;
      if (normalizeType(t.type) === 'transfert') return Number(t.frais ?? t.momoFee) || 0;
      return 0;
    };
    const isExpenseOrTransfer = (t) => isRealExpense(t.type) || normalizeType(t.type) === 'transfert';

    const prevMonthlyExpenses = transactions
      .filter((t) => {
        const d = new Date(t.date);
        return isExpenseOrTransfer(t) && d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, t) => sum + getEffectiveExpense(t), 0);

    const newTxExpense = getEffectiveExpense(transaction);

    setTransactions((prev) => {
      const updated = [transaction, ...prev];

      if (budgetLimit > 0 && newTxExpense > 0) {
        const monthlyExpenses = updated
          .filter((t) => {
            const d = new Date(t.date);
            return isExpenseOrTransfer(t) && d.getMonth() === month && d.getFullYear() === year;
          })
          .reduce((sum, t) => sum + getEffectiveExpense(t), 0);

        if (prevMonthlyExpenses <= budgetLimit && monthlyExpenses > budgetLimit) {
          const deviseSymbol = devise?.split(' ')[0] || '€';
          Alert.alert(
            'Budget dépassé !',
            `Attention, tes dépenses du mois ont dépassé le seuil de ${budgetLimit}${deviseSymbol} fixé par Jhpy.`
          );
        }
      }

      return updated;
    });

    if (budgetLimit > 0 && newTxExpense > 0) {
      const newMonthlyTotal = prevMonthlyExpenses + newTxExpense;
      checkBudgetAlert(newMonthlyTotal, budgetLimit);
    }
  };

  const deleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const deleteMultipleTransactions = (ids) => {
    setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
  };

  const resetAllTransactions = () => {
    setTransactions([]);
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        momoBalance: walletBalances.momoBalance,
        cashBalance: walletBalances.cashBalance,
        totalDepenses: walletBalances.totalDepenses,
        theme,
        setTheme,
        accentColor,
        setAccentColor,
        devise,
        setDevise,
        locale,
        changeGlobalLanguage,
        isDark,
        budgetLimit,
        setBudgetLimit,
        addTransaction,
        deleteTransaction,
        deleteMultipleTransactions,
        resetAllTransactions,
        checkBudgetAlert,
        isDiscreteMode,
        hasPinCode,
        saveNewPin,
        unlockDiscreteMode,
        toggleDiscreteMode,
        changePinCode,
        resetPinCodeWithPassword,
        exportTransactionsAsCSV,
        budgetPeriod,
        setBudgetPeriod,
        reminderHour,
        reminderMinute,
        checkBudgetPeriodAlert,
        updateDailyReminderTime,
        scheduleMonthlyReview,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => useContext(FinanceContext);
