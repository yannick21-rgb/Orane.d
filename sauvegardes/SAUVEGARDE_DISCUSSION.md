# Sauvegarde de la discussion — FinanceTracker

**Session :** 09/06/2026  
**Assistant :** opencode (deepseek-v4-flash-free)

---

## Résumé des modifications effectuées

Cette session a couvert l'analyse complète du code, la correction de bugs, l'adaptation pour affichage téléphone, et des améliorations UX.

---

## 1. Internationalisation complète (i18n)

### Objectif
Rendre toutes les interfaces réactives à la langue sélectionnée avec traduction automatique en 66 langues.

### Modifications
- **`LanguageManager.js`** — Génération automatique de traductions pour 66 langues via Google Translate API (119 clés × 66 langues)
- **`HomeScreen.js`** — Hook `useTranslation()` pour tous les textes, `CATEGORY_KEY_MAP` pour catégories traduites
- **`StatsScreen.js`** — Remplacement de la fonction manuelle `L()` par `t()`
- **`AddTransactionScreen.js`** — Split catégories/réseaux en `key` (stockage) + `tKey` (affichage via `t()`)
- **`SettingsScreen.js`** — `useTranslation()` remplace `LanguageManager.listeners` + `currentLang` local

### Script de génération
- `scripts/generate-translations.js` : traduit les 119 clés françaises dans 66 langues via `translate.googleapis.com`

---

## 2. Devise depuis le contexte

- Tous les écrans utilisent désormais `devise` et `deviseSymbol` depuis `useFinance()` au lieu de valeurs codées en dur
- `SettingsScreen` utilise `setDevise` du contexte (plus de state local)

---

## 3. Version

- `app.json` : `3.4.6` → `3.5.0`

---

## 4. Écran d'accueil (HomeScreen)

- Suppression de `sorted.slice(0, 5)` : toutes les transactions affichées
- Suppression du `onLongPress` pour supprimer
- Suppression du bouton "Voir tout"
- Ajout du hint "Appuie sur la poubelle pour supprimer"

---

## 5. Thème Système

### Bug
`"userInterfaceStyle": "dark"` dans `app.json` forçait `useColorScheme()` à toujours renvoyer `'dark'`.
Le thème "Système" restait donc bloqué en mode sombre.

### Correction
- `app.json` : `"userInterfaceStyle": "dark"` → `"automatic"`
- `FinanceContext.js` : `useColorScheme() || 'light'` (fallback null → light)

---

## 6. Section "À propos" (SettingsScreen)

- Ajout d'un bouton "À propos" avec icône `Info`
- `handleAbout()` : alerte native avec version, copyright, description, confidentialité

---

## 7. Analyse complète et correction de bugs

### Bug #1 — Tab labels non traduits
- Les onglets `"Accueil"`, `"Ajout"`, `"Stats"`, `"Paramètres"` étaient en dur
- Correction : ajout de `tabBarLabel: t('home'|'add'|'stats'|'settings')` dans `App.js`

### Bug #2 — Aucun écran de chargement
- `App.js` rendait immédiatement sans attendre le chargement AsyncStorage
- Correction : `LoadingScreen` avec `ActivityIndicator`, rendu conditionnel via `isLoaded`

### Bug #3 — Clavier iOS recouvre les champs (AddTransactionScreen)
- `AddTransactionScreen` n'avait pas de `KeyboardAvoidingView`
- Correction : ajout avec `behavior="padding"` sur iOS, `keyboardVerticalOffset={90}`

### Bug #4 — Graphiques non réactifs à l'orientation
- `StatsScreen` utilisait `Dimensions.get('window').width` en module (statique)
- Correction : `useWindowDimensions()` hook dans le composant

### Bug #5 — `SafeAreaView` déprécié
- `SafeAreaView` de `react-native` est déprécié
- Correction : import depuis `react-native-safe-area-context` dans HomeScreen, StatsScreen, AddTransactionScreen

### Bug #6 — Cache Metro obsolète
- Après modifications, Metro servait des fichiers en cache
- Correction : `npx expo start --clear`

---

## 8. Adaptation affichage téléphone

| Aspect | Avant | Après |
|---|---|---|
| Hauteur tabBar | 65px | 60px (plus compact) |
| Padding tabBar | paddingBottom: 12, paddingTop: 8 | paddingBottom: 8, paddingTop: 6 |
| Clavier iOS (ajout) | ScrollView seul | KeyboardAvoidingView + ScrollView |
| Chargement initial | Rendu immédiat | LoadingScreen avec spinner |
| Graphiques orientation | `Dimensions` statique | `useWindowDimensions` réactif |
| SafeArea | mixte (RN + safe-area-context) | uniforme (safe-area-context) |

---

## Structure finale du projet

```
FinanceTracker/
├── App.js                  # Point d'entrée, tab navigation, loading
├── app.json                # Config Expo v3.5.0
├── AGENTS.md               # Instructions pour l'IA
├── package.json            # Dépendances
├── src/
│   ├── context/
│   │   └── FinanceContext.js   # Contexte global (thème, devise, transactions)
│   ├── screens/
│   │   ├── HomeScreen.js           # Solde, liste transactions, suppression
│   │   ├── StatsScreen.js          # Graphiques, périodes, dettes
│   │   ├── AddTransactionScreen.js # Ajout dépense/revenu, frais MoMo
│   │   ├── SettingsScreen.js       # Profil, thème, langue, devise, pays
│   │   └── LanguageManager.js      # 66 langues, useTranslation hook
│   └── utils/
│       └── transactionDates.js     # Filtres date (date-fns)
├── scripts/
│   └── generate-translations.js    # Générateur de traductions
└── sauvegardes/
    ├── SAUVEGARDE_FICHIERS.md      # Cette sauvegarde
    └── SAUVEGARDE_DISCUSSION.md    # Présent document
```

---

## Commandes utiles

```bash
# Lancer l'application (vider le cache)
npx expo start --clear

# Voir les modifications
git diff --stat

# Commit
git add -A && git commit -m "v3.5.0 : i18n 66 langues, bugs, adaptation téléphone"
```
