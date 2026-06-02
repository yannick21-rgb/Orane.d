import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageManager } from '../screens/LanguageManager'; // ✅ Import du gestionnaire de langue

const FinanceContext = createContext();

export function FinanceProvider({ children }) {
  const systemScheme = useColorScheme();
  const [transactions, setTransactions] = useState([]);
  const [theme, setTheme] = useState('Système');
  const [accentColor, setAccentColor] = useState('#3b82f6');
  
  // Nouvelle variable globale pour la Devise (par défaut €)
  const [devise, setDevise] = useState('€ (EUR)');

  // ── Nouvel état global pour la langue de l'application ─────────────────
  const [locale, setLocale] = useState(LanguageManager.currentLanguage);

  const isDark = theme === 'Sombre' || (theme === 'Système' && systemScheme === 'dark');

  // ── Chargement initial depuis AsyncStorage ──────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        // Initialisation de la langue au tout début du chargement de l'application
        await LanguageManager.init();
        setLocale(LanguageManager.currentLanguage);

        const [storedTx, storedTheme, storedAccent, storedDevise] = await Promise.all([
          AsyncStorage.getItem('@transactions'),
          AsyncStorage.getItem('@user_theme'),
          AsyncStorage.getItem('@accent_color'),
          AsyncStorage.getItem('@devise'), // On récupère la devise stockée par Settings
        ]);
        if (storedTx)     setTransactions(JSON.parse(storedTx));
        if (storedTheme)  setTheme(storedTheme);
        if (storedAccent) setAccentColor(storedAccent);
        if (storedDevise) setDevise(storedDevise);
      } catch (err) {
        console.error('[FinanceContext] Erreur de chargement :', err);
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
      // On met à jour l'état du contexte pour avertir toute l'application du changement
      setLocale(langValue);
    } catch (error) {
      console.error('[FinanceContext] Erreur changement langue global :', error);
    }
  };

  // ── Persistance automatique des transactions ────────────────────────────
  useEffect(() => {
    AsyncStorage.setItem('@transactions', JSON.stringify(transactions)).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde transactions :', err)
    );
  }, [transactions]);

  // ── Persistance automatique du thème ───────────────────────────────────
  useEffect(() => {
    AsyncStorage.setItem('@user_theme', theme).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde thème :', err)
    );
  }, [theme]);

  // ── Persistance automatique de la couleur d'accent ─────────────────────
  useEffect(() => {
    AsyncStorage.setItem('@accent_color', accentColor).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde couleur :', err)
    );
  }, [accentColor]);

  // ── Persistance automatique de la devise ───────────────────────────────
  useEffect(() => {
    AsyncStorage.setItem('@devise', devise).catch(
      (err) => console.error('[FinanceContext] Erreur sauvegarde devise :', err)
    );
  }, [devise]);

  // ── Actions CRUD ────────────────────────────────────────────────────────
  const addTransaction = (transaction) => {
    setTransactions((prev) => [transaction, ...prev]);
  };

  const deleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // Nouvelle action pour vider/réinitialiser le budget si l'utilisateur valide
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
        devise,       // Accessible partout (Accueil, Stats, etc.)
        setDevise,    // Modifiable depuis SettingsScreen
        locale,                // ✅ Partagé à toute l'application
        changeGlobalLanguage,  // ✅ Fonction de changement globale
        isDark,
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