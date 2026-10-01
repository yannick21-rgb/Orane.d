---
phase: 02-connexion-multi-appareil
plan: 03
wave: 2
autonomous: true
objective: "Synchroniser les données métier (transactions, dettes, tontines, comptabilité, settings) entre le cloud Supabase et le cache local"
files_modified:
  - src/viewmodel/FinanceContext.js
  - src/viewmodel/DebtContext.js
  - src/viewmodel/TontineContext.js
  - src/viewmodel/AccountingContext.js
  - src/utils/sync.js
task_count: 4
gap_closure: false
depends_on:
  - 02-01
  - 02-02
---

# Plan 03: Synchronisation — sync offline-first des données métier

## Objective

Implémenter une synchronisation bidirectionnelle entre Supabase et le stockage local. Stratégie **offline-first** : l'utilisateur peut lire/écrire des données même hors-ligne ; dès que la connexion revient, les changements sont synchronisés avec le cloud.

## Tasks

### Task 1: Créer le module de synchronisation src/utils/sync.js

Un module central qui orchestre la sync pour tous les types de données. Il gère :
- L'état de connexion (online/offline)
- Le dernier timestamp de sync
- Les changements en attente (pending changes)
- La résolution de conflits (last-write-wins)

**Files:** `src/utils/sync.js`

**Sub-tasks:**
- [ ] Créer `src/utils/sync.js` avec :
  - `SyncEngine` class ou objet avec méthodes :
  - `init(userId)` — initialiser le suivi de sync
  - `push(table, records)` — uploader des enregistrements vers Supabase
  - `pull(table, since)` — télécharger les changements depuis Supabase
  - `syncAll()` — synchroniser toutes les tables
  - `getSyncStatus()` — retourner l'état (online, lastSync, pendingCount)
- [ ] Utiliser `updated_at` comme marqueur temporel pour la sync incrémentale
- [ ] Stocker le `last_sync_timestamp` dans AsyncStorage (`@sync_timestamp_{userId}`)
- [ ] En mode offline : écrire localement + ajouter à la file pending
- [ ] En mode online : écrire localement + pusher vers Supabase

### Task 2: Stratégie offline-first dans les contexts

Modifier `FinanceContext`, `DebtContext`, `TontineContext`, `AccountingContext` pour :
1. Écrire localement en premier (AsyncStorage, comme actuellement)
2. Puis tenter de pusher vers Supabase via le SyncEngine
3. Écouter les changements distants (optionnel : via Supabase Realtime)

**Files:** `src/viewmodel/FinanceContext.js`, `src/viewmodel/DebtContext.js`, `src/viewmodel/TontineContext.js`, `src/viewmodel/AccountingContext.js`

**Sub-tasks:**
- [ ] Dans chaque function de création/modification/suppression : appeler `SyncEngine.push(table, records)` après l'écriture locale
- [ ] Ne pas bloquer l'UI sur la sync — utiliser un fire-and-forget avec catch silencieux
- [ ] Au chargement initial : appeler `SyncEngine.pull(table)` pour récupérer les données cloud, les merger avec le cache local
- [ ] Stratégie de merge : les données locales les plus récentes (basées sur `updated_at`) gagnent
- [ ] Ajouter un indicateur d'état de connexion (online/offline) dans un contexte partagé ou via `NetInfo`

### Task 3: Indicateur de connexion dans l'UI

Ajouter un indicateur visuel subtil dans l'app pour montrer l'état de connexion et la dernière synchronisation. Utiliser `@react-native-community/netinfo` ou l'API WebSocket de Supabase.

**Files:** `src/view/screens/HomeScreen.js` (ou composant partagé)

**Sub-tasks:**
- [ ] Optionnel : installer `expo-network` pour détecter la connectivité
- [ ] Ajouter un petit badge "Synchro..." / "À jour" / "Hors-ligne" dans un coin de l'écran d'accueil
- [ ] L'indicateur doit être discret (point coloré ou petit texte)
- [ ] Utiliser le `syncStatus` du SyncEngine

### Task 4: Gestion des conflits et des échecs

Implémenter un mécanisme robuste pour gérer les échecs de sync et les conflits.

**Files:** `src/utils/sync.js`

**Sub-tasks:**
- [ ] File de pending : stocker les changements non synchronisés dans `@sync_pending_{userId}` (AsyncStorage)
- [ ] Au démarrage ou au retour en ligne : rejouer les pending, puis faire un pull
- [ ] Last-write-wins : comparer `updated_at` local vs cloud, le plus récent gagne
- [ ] Si un conflit est détecté, garder les deux versions et logger
- [ ] En cas d'échec réseau : garder les pending, réessayer au prochain pull
- [ ] Ne pas perdre de données : toujours écrire localement en premier

## Success Criteria

- [ ] Les transactions sont synchronisées entre deux appareils connectés au même compte
- [ ] Les dettes sont synchronisées
- [ ] Les tontines sont synchronisées
- [ ] Les écritures comptables sont synchronisées
- [ ] Les paramètres (thème, devise, budget) sont synchronisés
- [ ] L'application fonctionne hors-ligne (lecture/écriture locale)
- [ ] Les données sont automatiquement synchronisées au retour en ligne
- [ ] Aucune donnée perdue en cas de conflit ou d'échec réseau
