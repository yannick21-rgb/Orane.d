---
phase: 02-connexion-multi-appareil
plan: 02
wave: 2
autonomous: true
objective: "Migrer AuthContext pour utiliser Supabase Auth — login, register, logout, sessions persistantes"
files_modified:
  - src/viewmodel/AuthContext.js
  - src/view/screens/LoginScreen.js
  - src/view/screens/RegisterScreen.js
  - App.js
task_count: 4
gap_closure: false
depends_on:
  - 02-01
---

# Plan 02: Frontend — migration AuthContext vers Supabase Auth

## Objective

Remplacer le système d'auth locale (AsyncStorage users) par Supabase Auth. Le login/register utilisent désormais `supabase.auth.signInWithPassword()` et `supabase.auth.signUp()`. Les utilisateurs existants doivent être migrés lors de la première connexion.

## Tasks

### Task 1: Refactor AuthContext — login et register via Supabase

Modifier `AuthContext.js` pour utiliser Supabase Auth. Le `login()` appelle `supabase.auth.signInWithPassword()`, le `register()` appelle `supabase.auth.signUp()` puis crée un profil dans la table `profiles`.

**Files:** `src/viewmodel/AuthContext.js`

**Sub-tasks:**
- [ ] Ajouter `import { supabase } from '../utils/supabase'`
- [ ] Remplacer `login()` : utilise `supabase.auth.signInWithPassword({ email, password })`, récupère la session, charge le profil depuis `profiles` table
- [ ] Remplacer `register()` : utilise `supabase.auth.signUp({ email, password })`, puis `supabase.from('profiles').insert({ id: user.id, name, email })`
- [ ] Remplacer `logout()` : appelle `supabase.auth.signOut()`, nettoie le state local
- [ ] Ajouter une session listener : `supabase.auth.onAuthStateChange()` pour synchroniser l'état user avec le state React
- [ ] Conserver `loading` : affiché pendant la restauration de session au démarrage
- [ ] Garder `loginToUser()` et `switchToUser()` pour le mode PIN local (compatibilité)

### Task 2: Gérer la migration des utilisateurs locaux vers Supabase

Les utilisateurs existants sont stockés dans `@oraned_all_users` (AsyncStorage). À la première connexion via Supabase, migrer les données locales vers le cloud.

**Files:** `src/viewmodel/AuthContext.js`

**Sub-tasks:**
- [ ] Après un login Supabase réussi, vérifier si des données locales existent pour cet email (`@oraned_user_data_{email}`)
- [ ] Si oui, les uploader vers Supabase (transactions, debts, tontines, settings)
- [ ] Marquer la migration comme effectuée (clé `@migrated_to_supabase_{userId}`)
- [ ] En cas d'échec de migration, logguer l'erreur mais ne pas bloquer l'utilisateur

### Task 3: Mettre à jour LoginScreen et RegisterScreen

Les écrans UI ne changent quasiment pas (l'interface est déjà bonne). Juste ajuster la gestion d'erreurs pour les messages venant de Supabase.

**Files:** `src/view/screens/LoginScreen.js`, `src/view/screens/RegisterScreen.js`

**Sub-tasks:**
- [ ] LoginScreen : adapter les messages d'erreur Supabase (ex: "Invalid login credentials" → "Email ou mot de passe incorrect")
- [ ] RegisterScreen : adapter les messages d'erreur Supabase (ex: "User already registered" → "Cet email est déjà utilisé")
- [ ] Ajouter un email de vérification si Supabase l'exige (optionnel : désactiver la confirmation email dans les paramètres Supabase Auth)

### Task 4: Gérer le state global et le démarrage

S'assurer que l'app détecte correctement la session restaurée (token persistant dans AsyncStorage via le client Supabase). L'utilisateur ne doit pas avoir à se reconnecter à chaque lancement.

**Files:** `src/viewmodel/AuthContext.js`, `App.js`

**Sub-tasks:**
- [ ] Vérifier que `supabase.auth.onAuthStateChange` restaure bien la session au démarrage
- [ ] Tester que `loading === false` uniquement quand la session est résolue (ou absente)
- [ ] `App.js` ne change pas structurellement — `user` vient toujours de `useAuth()`

## Success Criteria

- [ ] Un utilisateur peut créer un compte (register) via Supabase Auth
- [ ] Un utilisateur peut se connecter (login) avec email + mot de passe
- [ ] La session persiste entre les lancements (pas de reconnexion requise)
- [ ] Le profil est stocké dans la table `profiles` Supabase
- [ ] Les utilisateurs locaux existants sont migrés vers le cloud à la première connexion
- [ ] La déconnexion (logout) fonctionne et nettoie la session locale
