// LanguageManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

export const translations = {
  fr: {
    settings: "Paramètres",
    visualCustom: "Personnalisation Visuelle",
    locPreferences: "Localisation & Préférences",
    theme: "Thème",
    language: "Langue",
    currency: "Devise",
    country: "Pays",
    saveSalary: "Enregistrer le salaire",
    renewBudget: "Renouveler le budget",
    lastSalary: "Dernier salaire : ",
    home: "Accueil",
    add: "Ajouter",
    // ── Ajouts pour l'onglet Stats ────────────────────────────────────────
    statsTitle: "Bilans & Analyses",
    jour: "Jour",
    "7j": "7 jours",
    semaine: "Semaine",
    mois: "Mois",
    perso: "Perso",
    tout: "Tout",
    otherPeriodPlaceholder: "Autre période...",
    startDateLabel: "Début",
    endDateLabel: "Fin",
    incomeLabel: "▲ Revenus",
    expenseLabel: "▼ Dépenses",
    netBalanceLabel: "Solde Net",
    operationLabel: "opération",
    operationsLabel: "opérations",
    emptyTransactions: "Aucune transaction pour cette période.",
    chartTitle: "DÉPENSES PAR CATÉGORIE",
    distributionTitle: "RÉPARTITION DU BUDGET",
    noDataLabel: "Aucune",
  },
  en: {
    settings: "Settings",
    visualCustom: "Visual Customization",
    locPreferences: "Localization & Preferences",
    theme: "Theme",
    language: "Language",
    currency: "Currency",
    country: "Country",
    saveSalary: "Save Salary",
    renewBudget: "Renew Budget",
    lastSalary: "Last salary: ",
    home: "Home",
    add: "Add",
    // ── Ajouts pour l'onglet Stats ────────────────────────────────────────
    statsTitle: "Reports & Analytics",
    jour: "Day",
    "7j": "7 Days",
    semaine: "Week",
    mois: "Month",
    perso: "Custom",
    tout: "All",
    otherPeriodPlaceholder: "Other period...",
    startDateLabel: "Start",
    endDateLabel: "End",
    incomeLabel: "▲ Income",
    expenseLabel: "▼ Expenses",
    netBalanceLabel: "Net Balance",
    operationLabel: "transaction",
    operationsLabel: "transactions",
    emptyTransactions: "No transactions for this period.",
    chartTitle: "EXPENSES BY CATEGORY",
    distributionTitle: "BUDGET DISTRIBUTION",
    noDataLabel: "None",
  },
  es: {
    settings: "Ajustes",
    visualCustom: "Personalización Visual",
    locPreferences: "Localización y Preferencias",
    theme: "Tema",
    language: "Idioma",
    currency: "Moneda",
    country: "País",
    saveSalary: "Registrar salario",
    renewBudget: "Renovar presupuesto",
    lastSalary: "Último salario: ",
    home: "Inicio",
    add: "Añadir",
    // ── Ajouts pour l'onglet Stats ────────────────────────────────────────
    statsTitle: "Balances y Análisis",
    jour: "Día",
    "7j": "7 días",
    semaine: "Semana",
    mois: "Mes",
    perso: "Personalizado",
    tout: "Todo",
    otherPeriodPlaceholder: "Otro período...",
    startDateLabel: "Inicio",
    endDateLabel: "Fin",
    incomeLabel: "▲ Ingresos",
    expenseLabel: "▼ Gastos",
    netBalanceLabel: "Saldo Neto",
    operationLabel: "operación",
    operationsLabel: "operaciones",
    emptyTransactions: "No hay transacciones para este período.",
    chartTitle: "GASTOS POR CATEGORÍA",
    distributionTitle: "DISTRIBUCIÓN DEL PRESUPUESTO",
    noDataLabel: "Ninguna",
  }
};

export const LanguageManager = {
  currentLanguage: 'fr',
  listeners: [],

  async init() {
    try {
      const saved = await AsyncStorage.getItem('@langue');
      if (saved) {
        this.currentLanguage = saved;
      }
    } catch (e) {
      console.error(e);
    }
    // On notifie les composants une fois l'initialisation terminée
    this.listeners.forEach(callback => callback(this.currentLanguage));
  },

  async changeLanguage(newLang) {
    this.currentLanguage = newLang;
    try {
      await AsyncStorage.setItem('@langue', newLang);
    } catch (e) {
      console.error(e);
    }
    this.listeners.forEach(callback => callback(newLang));
  },

  t(key) {
    return translations[this.currentLanguage]?.[key] || translations['fr'][key] || key;
  },

  // Fonctions de gestion des abonnements pour les Hooks React
  subscribe(callback) {
    this.listeners.push(callback);
  },
  unsubscribe(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }
};

// 🚀 LE HOOK MAGIQUE : À utiliser dans tes écrans pour forcer le rafraîchissement
export function useTranslation() {
  const [lang, setLang] = useState(LanguageManager.currentLanguage);

  useEffect(() => {
    const handleLanguageChange = (newLang) => setLang(newLang);
    
    LanguageManager.subscribe(handleLanguageChange);
    return () => LanguageManager.unsubscribe(handleLanguageChange);
  }, []);

  return {
    t: (key) => LanguageManager.t(key),
    currentLanguage: lang,
    changeLanguage: (newLang) => LanguageManager.changeLanguage(newLang)
  };
}