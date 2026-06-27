# Sauvegarde des fichiers — FinanceTracker

**Date :** 09/06/2026  
**Commit :** `2d57d977608b7ce03c8510692b652f6b49577ac0`  
**État :** Working tree non commité (modifications en cours)

---

## Fichiers modifiés (vs HEAD)

| Fichier | État |
|---|---|
| `App.js` | Modifié |
| `app.json` | Modifié |
| `src/context/FinanceContext.js` | Modifié |
| `src/screens/HomeScreen.js` | Modifié |
| `src/screens/StatsScreen.js` | Modifié |
| `src/screens/AddTransactionScreen.js` | Modifié |
| `src/screens/SettingsScreen.js` | Modifié |
| `src/screens/LanguageManager.js` | Modifié |
| `src/screens/OnboardingScreen.js` | Supprimé |

---

## Contenu des fichiers

### 1. `app.json`

```json
{
  "expo": {
    "name": "FinanceTracker",
    "slug": "FinanceTracker",
    "version": "3.5.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    ...
  }
}
```

### 2. `App.js`

```js
import React from 'react';
import { StatusBar, ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FinanceProvider, useFinance } from './src/context/FinanceContext';
import { useTranslation } from './src/screens/LanguageManager';

import HomeScreen from './src/screens/HomeScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import { Home, PlusCircle, PieChart, Settings as SettingsIcon } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

function LoadingScreen() {
  const { isDark } = useFinance();
  return (
    <View style={[styles.loading, { backgroundColor: isDark ? '#0f1015' : '#f5f6fa' }]}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

function AppNavigator() {
  const { isDark, accentColor, isLoaded } = useFinance();
  const { t } = useTranslation();

  const themeColors = {
    bg: isDark ? '#0f1015' : '#f5f6fa',
    barBg: isDark ? '#16171f' : '#ffffff',
    inactive: isDark ? '#555660' : '#8c8e9b',
    border: isDark ? '#1e202c' : '#eef0f5',
  };

  if (!isLoaded) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={themeColors.bg} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: themeColors.barBg,
            borderTopWidth: isDark ? 0 : 1,
            borderTopColor: themeColors.border,
            height: 60,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor: accentColor || '#3b82f6',
          tabBarInactiveTintColor: themeColors.inactive,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }
        }}
      >
        <Tab.Screen name="Accueil" component={HomeScreen} options={{
          tabBarLabel: t('home'),
          tabBarIcon: ({ color }) => <Home color={color} size={22} />,
        }} />
        <Tab.Screen name="Ajout" component={AddTransactionScreen} options={{
          tabBarLabel: t('add'),
          tabBarIcon: ({ color }) => <PlusCircle color={color} size={22} />,
        }} />
        <Tab.Screen name="Stats" component={StatsScreen} options={{
          tabBarLabel: t('stats'),
          tabBarIcon: ({ color }) => <PieChart color={color} size={22} />,
        }} />
        <Tab.Screen name="Paramètres" component={SettingsScreen} options={{
          tabBarLabel: t('settings'),
          tabBarIcon: ({ color }) => <SettingsIcon color={color} size={22} />,
        }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <AppNavigator />
    </FinanceProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
```

### 3. `src/context/FinanceContext.js`

```js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageManager } from '../screens/LanguageManager';

const FinanceContext = createContext();

export function FinanceProvider({ children }) {
  const systemScheme = useColorScheme() || 'light';
  const [transactions, setTransactions] = useState([]);
  const [theme, setTheme] = useState('Système');
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [devise, setDevise] = useState('€ (EUR)');
  const [locale, setLocale] = useState(LanguageManager.currentLanguage);
  const [isLoaded, setIsLoaded] = useState(false);

  const isDark = theme === 'Sombre' || (theme === 'Système' && systemScheme === 'dark');

  useEffect(() => {
    const loadData = async () => {
      try {
        await LanguageManager.init();
        setLocale(LanguageManager.currentLanguage);
        const [storedTx, storedTheme, storedAccent, storedDevise] = await Promise.all([
          AsyncStorage.getItem('@transactions'),
          AsyncStorage.getItem('@user_theme'),
          AsyncStorage.getItem('@accent_color'),
          AsyncStorage.getItem('@devise'),
        ]);
        if (storedTx)     setTransactions(JSON.parse(storedTx));
        if (storedTheme)  setTheme(storedTheme);
        if (storedAccent) setAccentColor(storedAccent);
        if (storedDevise) setDevise(storedDevise);
      } catch (err) {
        console.error('[FinanceContext] Erreur de chargement :', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  const changeGlobalLanguage = async (langValue) => { ... };
  // Effects for AutoSave, CRUD actions...

  return (
    <FinanceContext.Provider value={{ transactions, theme, setTheme, accentColor, setAccentColor, devise, setDevise, locale, changeGlobalLanguage, isDark, addTransaction, deleteTransaction, resetAllTransactions }}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => useContext(FinanceContext);
```

### 4. `src/screens/HomeScreen.js`

Fichier complet : `src/screens/HomeScreen.js` (275 lignes)

Points clés :
- Importe `SafeAreaView` depuis `react-native-safe-area-context`
- Utilise `useTranslation()` pour tous les textes
- Affiche toutes les transactions (pas de limite)
- Suppression par icône poubelle (pas de long-press)
- `CATEGORY_KEY_MAP` pour affichage traduit des catégories
- `formatDate` localisée (fr/en/es)

### 5. `src/screens/StatsScreen.js`

Fichier complet : `src/screens/StatsScreen.js` (531 lignes)

Points clés :
- Importe `SafeAreaView` depuis `react-native-safe-area-context`
- Utilise `useWindowDimensions()` pour la largeur des graphiques (réactif à l'orientation)
- Périodes : Jour, 7 jours, Semaine, Mois, Personnalisé
- Graphiques : PieChart (frais MoMo), BarChart (top catégories), DailyAreaChart SVG custom
- Suivi des prêts/dettes
- Composant `DailyAreaChart` avec SVG custom

### 6. `src/screens/AddTransactionScreen.js`

Fichier complet : `src/screens/AddTransactionScreen.js` (405 lignes)

Points clés :
- Importe `SafeAreaView` depuis `react-native-safe-area-context`
- Wrapped dans `KeyboardAvoidingView` pour iOS
- Type toggle Dépense/Revenu
- Catégories et réseaux avec `tKey` pour traduction
- Calcul des frais MoMo (MTN, MOOV, CELTIIS)
- Fréquence des revenus
- Modal de succès

### 7. `src/screens/SettingsScreen.js`

Fichier complet : `src/screens/SettingsScreen.js` (578 lignes)

Points clés :
- `SafeAreaView` de `react-native-safe-area-context` + `KeyboardAvoidingView`
- Profil utilisateur modifiable
- Thème (Sombre/Clair/Système)
- Sélecteur de couleur principale (20 couleurs)
- Langue (66 langues), Devise, Pays (dropdowns)
- Bouton À propos
- Bouton Déconnexion

### 8. `src/screens/LanguageManager.js`

Fichier complet : `src/screens/LanguageManager.js` (8054 lignes)

- 66 langues × ~119 clés chacune
- `LanguageManager` singleton avec `init()`, `changeLanguage()`, `t()`, subscribe/unsubscribe
- Hook `useTranslation()` avec re-rendu automatique

---

## `package.json`

```json
{
  "name": "financetracker",
  "version": "1.0.0",
  "main": "expo/AppEntry.js",
  "dependencies": {
    "@react-native-async-storage/async-storage": "^2.2.0",
    "@react-native-community/datetimepicker": "^9.1.0",
    "@react-navigation/bottom-tabs": "^7.16.2",
    "@react-navigation/native": "^7.2.5",
    "date-fns": "^4.4.0",
    "expo": "~56.0.0",
    "expo-status-bar": "~56.0.4",
    "lucide-react-native": "^1.17.0",
    "react": "19.2.3",
    "react-native": "0.85.3",
    "react-native-chart-kit": "^6.12.3",
    "react-native-element-dropdown": "^2.12.4",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-screens": "4.25.2",
    "react-native-svg": "15.15.4",
    "react-native-web": "^0.21.2"
  },
  "private": true
}
```

---

## Restauration

Pour restaurer l'état exact de cette sauvegarde :

```bash
git checkout 2d57d977608b7ce03c8510692b652f6b49577ac0
# Puis appliquer les modifications non commitées manuellement
```

Tous les fichiers sources sont présents dans le répertoire de travail actuel.
