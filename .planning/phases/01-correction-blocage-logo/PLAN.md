---
phase: 01-correction-blocage-logo
plan: 01
wave: 1
autonomous: true
objective: "Corriger le blocage de l'App sur l'écran de chargement (splash screen/logo)"
files_modified:
  - App.js
  - app.json
  - package.json
task_count: 3
gap_closure: false
---

# Plan: Correction blocage logo

## Objective

L'application reste bloquée sur le logo/splash screen parce que :
1. `AsyncStorage.getItem('@oraned_onboarding_seen')` n'a pas de `.catch()` — si la promesse échoue, `hasSeenOnboarding` reste `null` indéfiniment
2. `expo-splash-screen` n'est pas installé — impossible de masquer le splash natif programmatiquement
3. Aucun timeout de sécurité — si un context provider ne se résout pas, l'app reste sur `<LoadingScreen />`

## Tasks

### Task 1: Installer expo-splash-screen et configurer le splash

Installer `expo-splash-screen` et ajouter le config plugin dans `app.json` pour que le splash natif soit correctement initialisé avec l'icône de l'app.

**Files:** `package.json`, `app.json`

**Sub-tasks:**
- [ ] Installer le package : `npx expo install expo-splash-screen`
- [ ] Ajouter le plugin dans `app.json` avec `backgroundColor`, `image`, `imageWidth`

### Task 2: Gestion du cycle de vie du splash screen dans App.js

Ajouter `SplashScreen.preventAutoHideAsync()` au niveau module et `SplashScreen.hideAsync()` quand l'état `isReady` devient true.

**Files:** `App.js`

**Sub-tasks:**
- [ ] Importer `expo-splash-screen`
- [ ] Appeler `SplashScreen.preventAutoHideAsync()` en haut du module
- [ ] Appeler `SplashScreen.hideAsync()` dans le `useEffect` qui surveille `isReady`

### Task 3: Timeout et gestion d'erreurs pour hasSeenOnboarding

Ajouter un timeout de 8s et un `.catch()` sur le fetch AsyncStorage. Ajouter un filet de sécurité de 15s (`forceReady`) pour forcer l'affichage en dernier recours.

**Files:** `App.js`

**Sub-tasks:**
- [ ] Définir `LOADING_TIMEOUT = 8000`
- [ ] Ajouter `setTimeout` avec fallback à `false` pour `hasSeenOnboarding`
- [ ] Ajouter `.catch()` qui clear le timer et met `hasSeenOnboarding = false`
- [ ] Ajouter `useEffect` avec `forceReady` à 15s
- [ ] Déclencher le rendu si `forceReady` est true

## Success Criteria

- [ ] L'app ne reste pas bloquée sur le splash/loading screen
- [ ] Le splash natif se masque quand l'app est prête
- [ ] Un timeout empêche le blocage indéfini même si AsyncStorage échoue
- [ ] L'OnboardingScreen s'affiche pour les nouveaux utilisateurs
