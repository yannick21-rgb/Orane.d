import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageManager } from '../screens/LanguageManager'; 

const FinanceContext = createContext();

export function FinanceProvider({ children }) {
  const systemScheme = useColorScheme();
  
  // 🔒 États globaux
  const [transactions, setTransactions] = useState([]);
  const [theme, setTheme] = useState('Système');
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [devise, setDevise] = useState('€ (EUR)');
  const [locale, setLocale] = useState(LanguageManager.currentLanguage);
  
  // 🆕 Nouveaux états pour la personnalisation et l'onboarding
  const [userName, setUserName] = useState('');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // 🛡️ Verrou anti-écrasement au démarrage
  const [isLoaded, setIsLoaded] = useState(false);

  const isDark = theme === 'Sombre' || (theme === 'Système' && systemScheme === 'dark');

  // ── 📥 1. Chargement initial unifié depuis le stockage local ──────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        await LanguageManager.init();
        setLocale(LanguageManager.currentLanguage);

        // Récupération simultanée de TOUTES les données stockées (y compris le nom et le statut onboarding)
        const [storedTx, storedTheme, storedAccent, storedDevise, storedName, storedOnboarding] = await Promise.all([
          AsyncStorage.getItem('@transactions'),
          AsyncStorage.getItem('@user_theme'),
          AsyncStorage.getItem('@accent_color'),
          AsyncStorage.getItem('@devise'),
          AsyncStorage.getItem('@user_name'),
          AsyncStorage.getItem('@onboarding_done'),
        ]);

        if (storedTx)     setTransactions(JSON.parse(storedTx));
        if (storedTheme)  setTheme(storedTheme);
        if (storedAccent) setAccentColor(storedAccent);
        if (storedDevise) setDevise(storedDevise);
        if (storedName)   setUserName(storedName);
        if (storedOnboarding) setHasSeenOnboarding(JSON.parse(storedOnboarding));

      } catch (err) {
        console.error('[FinanceContext] Erreur de chargement :', err);
      } finally {
        // Chargement terminé, on ouvre le verrou !
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  // ── Action globale pour changer la langue et forcer le rendu de l'App ────
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

  // ── 💾 2. Sauvegardes automatiques sécurisées par 'isLoaded' ──

  useEffect(() => {
    if (!isLoaded) return; 
    AsyncStorage.setItem('@transactions', JSON.stringify(transactions)).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde transactions :', err)
    );
  }, [transactions, isLoaded]);

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

  // 🆕 Sauvegarde automatique du nom d'utilisateur
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem('@user_name', userName).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde pseudo :', err)
    );
  }, [userName, isLoaded]);

  // 🆕 Sauvegarde automatique du statut de l'onboarding
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem('@onboarding_done', JSON.stringify(hasSeenOnboarding)).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde statut onboarding :', err)
    );
  }, [hasSeenOnboarding, isLoaded]);

  // ── Actions CRUD ────────────────────────────────────────────────────────
  const addTransaction = (transaction) => {
    setTransactions((prev) => [transaction, ...prev]);
  };

  const deleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const resetAllTransactions = () => {
    setTransactions([]);
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        theme,
        setTheme,
        accentColor,
        setAccentColor,
        devise,       
        setDevise,    
        locale,                
        changeGlobalLanguage,  
        isDark,
        userName,
        setUserName,
        hasSeenOnboarding,
        setHasSeenOnboarding,
        addTransaction,
        deleteTransaction,
        resetAllTransactions,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => useContext(FinanceContext);