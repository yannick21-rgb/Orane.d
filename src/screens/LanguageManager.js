// LanguageManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Le dictionnaire de toutes tes traductions
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
  }
};

// 2. Un objet centralisé qui stocke la langue active et les fonctions associés
export const LanguageManager = {
  currentLanguage: 'fr', // Par défaut
  listeners: [],         // Liste des écrans qui écoutent le changement

  // Charger la langue sauvegardée au démarrage de l'app
  async init() {
    try {
      const saved = await AsyncStorage.getItem('@langue');
      if (saved) {
        this.currentLanguage = saved;
      }
    } catch (e) {
      console.error(e);
    }
  },

  // Changer la langue et avertir tous les écrans connectés
  async changeLanguage(newLang) {
    this.currentLanguage = newLang;
    try {
      await AsyncStorage.setItem('@langue', newLang);
    } catch (e) {
      console.error(e);
    }
    // On prévient tous les écrans de se mettre à jour
    this.listeners.forEach(callback => callback(newLang));
  },

  // La fonction de traduction magique
  t(key) {
    return translations[this.currentLanguage]?.[key] || translations['fr'][key] || key;
  }
};