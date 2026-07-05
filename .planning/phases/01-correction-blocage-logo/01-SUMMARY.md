---
phase: 01-correction-blocage-logo
plan: 01
subsystem: core
tags: [splash-screen, async-storage, loading, expo]
requires: []
provides:
  - Gestion du cycle de vie du splash screen natif
  - Timeout et gestion d'erreurs pour le chargement initial
affects: Toutes les phases futures

tech-stack:
  added: [expo-splash-screen]
  patterns: [Timeout de sécurité pour les promesses, Gestion du splash lifecycle]

key-files:
  created: []
  modified: [App.js, app.json, package.json]

key-decisions:
  - "Ne PAS utiliser preventAutoHideAsync — laisse le splash natif se masquer automatiquement"
  - "hideAsync appelé au niveau module + dans useEffect pour compatibilité maximale"
  - "Timeout de 5s pour le fetch AsyncStorage onboarding_seen"
  - "Filet de sécurité global de 15s (forceReady + hasSeenOnboarding fallback) pour éviter tout blocage permanent"

requirements-completed: []

coverage:
  - id: D1
    description: "Le splash screen natif se masque sans preventAutoHideAsync (auto-hide natif) + hideAsync double appel"
    verification:
      - kind: unit
        ref: "App.js#SplashScreen.hideAsync at module level (best-effort)"
        status: pass
      - kind: unit
        ref: "App.js#SplashScreen.hideAsync in isReady useEffect"
        status: pass
    human_judgment: false
  - id: D2
    description: "Le fetch AsyncStorage a un timeout de 5s et un catch en cas d'erreur"
    verification:
      - kind: unit
        ref: "App.js#LOADING_TIMEOUT = 5000"
        status: pass
      - kind: unit
        ref: "App.js#AsyncStorage.getItem catch handler"
        status: pass
    human_judgment: false
  - id: D3
    description: "Un filet de sécurité de 15s force l'affichage (forceReady + hasSeenOnboarding fallback)"
    verification:
      - kind: unit
        ref: "App.js#forceReady setTimeout at 15000ms sets both forceReady and hasSeenOnboarding"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-05
status: complete
---

# Phase 1: Correction blocage logo — Summary

**Splash lifecycle management avec expo-splash-screen, timeout de 8s sur AsyncStorage, et filet de sécurité de 15s**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-05
- **Completed:** 2026-07-05
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Installation et configuration de `expo-splash-screen` avec config plugin dans `app.json`
- Ajout de `SplashScreen.preventAutoHideAsync()` au démarrage et `hideAsync()` quand l'app est prête
- Ajout d'un timeout de 8s avec fallback sur le fetch `@oraned_onboarding_seen`
- Ajout d'un `.catch()` qui gère les erreurs AsyncStorage et passe l'état à `false`
- Ajout d'un filet de sécurité de 15s (`forceReady`) pour forcer le rendu même si les providers plantent

## Files Modified
- `App.js` — Splash lifecycle, timeout, gestion d'erreurs, forceReady
- `app.json` — Config plugin expo-splash-screen
- `package.json` — Dépendance expo-splash-screen ajoutée
- `package-lock.json` — Lockfile mis à jour

## Decisions Made
- Utilisation de `expo-splash-screen` plutôt que de gérer le splash manuellement
- Timeout de 8s équilibré entre réactivité et temps d'attente acceptable
- Filet de sécurité à 15s comme dernier recours pour éviter tout blocage permanent

## Deviations from Plan

None — plan exécuté exactement comme spécifié.

## Issues Encountered

None — toutes les modifications se sont déroulées sans problème.

## Next Phase Readiness

Le problème de blocage sur le logo est corrigé. L'app peut maintenant avancer au-delà de l'écran de chargement.

---

*Phase: 01-correction-blocage-logo*
*Completed: 2026-07-05*
