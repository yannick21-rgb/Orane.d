# Roadmap: Orane.d FinanceTracker

## Overview

Application de gestion financière personnelle avec suivi des transactions, comptabilité, dettes, et tontines. Corrections et améliorations continues.

## Phases

- [x] **Phase 1: Correction blocage logo** - Corriger le blocage de l'application sur l'écran de chargement

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

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Correction blocage logo | 1/1 | Complete | 2026-07-05 |
