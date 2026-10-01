# Roadmap: Orane.d FinanceTracker

## Overview

Application de gestion financière personnelle avec suivi des transactions, comptabilité, dettes, et tontines. Corrections et améliorations continues.

## Phases

- [x] **Phase 1: Correction blocage logo** - Corriger le blocage de l'application sur l'écran de chargement
- [ ] **Phase 2: Connexion multi-appareil** - Ajouter un backend Supabase pour l'authentification et la synchronisation des données entre appareils

## Phase Details

### Phase 1: Correction blocage logo
**Goal**: L'application ne reste plus bloquée sur le logo/splash screen
**Depends on**: Nothing (first phase)
**Success Criteria** (what must be TRUE):
  1. L'écran de chargement ne reste pas affiché indéfiniment
  2. Le splash screen natif se masque automatiquement quand l'app est prête
  3. Un timeout de sécurité empêche le blocage en cas d'échec silencieux
**Plans**: 1 plan

Plans:
- [x] 01-01: Ajouter splash lifecycle, timeout chargement, et gestion d'erreurs AsyncStorage

### Phase 2: Connexion multi-appareil
**Goal**: L'utilisateur peut se connecter et synchroniser ses données sur n'importe quel appareil
**Depends on**: Phase 1
**Success Criteria** (what must be TRUE):
  1. L'utilisateur peut créer un compte avec email + mot de passe sur un appareil
  2. L'utilisateur peut se connecter sur un second appareil avec les mêmes identifiants
  3. Les données (transactions, dettes, tontines, comptabilité) sont synchronisées entre appareils
  4. L'application reste utilisable hors-ligne (cache local)
  5. La synchronisation est transparente pour l'utilisateur
**Mode**: backend (Supabase)
**Plans**: 3 plans

Plans:
- [~] 02-01: Backend Supabase — projet, schéma DB, auth, RLS, API *(code prêt, nécessite exécution SQL dans dashboard Supabase)*
- [x] 02-02: Frontend — migration AuthContext vers Supabase Auth
- [x] 02-03: Synchronisation — sync offline-first des données métier

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Correction blocage logo | 1/1 | Complete | 2026-07-05 |
| 2. Connexion multi-appareil | 2/3 | En cours (sync OK) | — |
