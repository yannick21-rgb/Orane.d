# Documentation Complète — Orane.d (FinanceTracker)

**Version :** 3.7.0  
**Plateforme :** iOS / Android / Web (Expo)  
**Langue de l'interface :** 61 langues supportées  
**Public cible :** Bénin / Afrique de l'Ouest (Mobile Money + Cash)

---

## 1. Présentation

**Orane.d** est une application mobile de gestion budgétaire et de finances personnelles développée avec React Native (Expo SDK 56). Elle cible particulièrement les utilisateurs d'Afrique de l'Ouest (Bénin) qui gèrent à la fois du Mobile Money (MoMo) et des espèces (Cash). L'application permet de suivre ses revenus, dépenses, transferts MoMo vers espèces (avec frais réseau), dettes/prêts, et tontines.

---

## 2. Architecture

### 2.1 Pattern MVC

```
src/
  model/       → Données métier, constantes, helpers
  viewmodel/   → Contextes React (état + logique métier)
  view/
    screens/   → Écrans complets
    components/→ Composants modaux réutilisables
  service/     → Services externes (export CSV)
  utils/       → Fonctions utilitaires (stockage, sécurité, formatage, i18n)
```

### 2.2 Flux de données

```
App.js
  ├─ SafeAreaProvider
    └─ AuthProvider        (Authentification multi-comptes)
      └─ FinanceProvider   (Transactions, thème, devise, budget, code PIN)
        └─ DebtProvider    (Dettes / prêts)
          └─ TontineProvider (Tontines / épargne tournante)
            └─ RootNavigator
               ├─ OnboardingScreen (1er lancement)
               ├─ AuthScreen (Login/Register)
               └─ MainTabs (4 onglets : Accueil, Ajout, Stats, Réglages)
```

Les données persistent dans `AsyncStorage` avec des clés préfixées `@oraned_`. Les mots de passe et codes PIN sont hachés (SHA-256 itératif). Les hash PIN sont stockés dans `expo-secure-store`.

### 2.3 Navigation

La navigation principale utilise `react-native-pager-view` pour un swipe horizontal entre les 4 onglets. Une barre d'onglets personnalisée avec icônes animées (`lucide-react-native`) sert de tabulation. Les écrans de dettes et tontines s'ouvrent en superposition plein écran depuis les Réglages.

---

## 3. Modèles de Données

### 3.1 Transaction (`TransactionModel.js`)

Attributs : `id`, `type`, `amount`, `category`, `wallet`, `date`, `title`, `note`, `momoNetwork`, `momoFee`, `frais`, `amountReceived`, `incomeFrequency`

- **Types :** `expense` (dépense), `income` (revenu), `transfert` (transfert MoMo→Cash)
- **Portefeuilles :** `momo` (Mobile Money), `cash` (espèces)
- **Réseaux MoMo :** MTN (frais 2%), MOOV (2%), CELTIIS (2.5%)
- **Catégories dépenses (11) :** Alimentation, Logement, Transport, Abonnements & Tech, Sport, Loisirs, Habillement, Santé, Épargne, Remboursement, Frais & Retraits
- **Catégories revenus (6) :** Salaire/Coaching, Freelance/Dev, Projets Web, Cadeau, Emprunt, Ventes
- **Fonction :** `computeTransferFee(amount, networkKey)` calcule les frais de retrait

### 3.2 Dette (`DebtModel.js`)

Attributs : `id`, `userId`, `type`, `personName`, `amount`, `amountReimbursed`, `dateCreated`, `dueDate`, `status`, `note`, `reminderEnabled`

- **Types :** `credit_accorde` (on me doit), `credit_recu` (je dois)
- **Statuts :** `en_cours`, `remboursee`, `partielle`
- **Fonctions :** `createDebt()`, `computeDebtStatus()`

### 3.3 Tontine (`TontineModel.js`)

Attributs d'un groupe : `id`, `userId`, `groupName`, `amountPerTour`, `frequency`, `totalParticipants`, `myPosition`, `startDate`, `rounds[]`

Un `round` : `roundNumber`, `dueDate`, `status`, `amount`, `isMyTurnToReceive`

- **Fréquences :** `hebdomadaire` (7 jours), `mensuelle` (30 jours)
- **Statuts d'un tour :** `a_payer`, `paye`, `recu`
- **Fonctions :** `generateRounds()`, `computeTontineSummary()`

### 3.4 Thème (`ThemeModel.js`)

- **Modes :** `Sombre`, `Clair`, `Système`
- **Couleurs d'accentuation (20) :** bleu, violet, vert, rouge, orange, etc.
- **Fonction :** `resolveIsDark(theme, systemScheme)`

### 3.5 Utilisateur (`UserModel.js`)

- `createUser(name, email, password)` - mot de passe haché
- `createAuthUser(name, email)` - session courante

### 3.6 Constantes (`AppConstants.js`)

- Clés de stockage : `@oraned_all_users`, `@AuthUser`, `@user_theme`, `@oraned_transactions_{userId}`, etc.
- Périodes budgétaires : `day`, `week`, `month`
- Rappel par défaut : 20h00
- `APP_NAME = 'Orane.d'`, `APP_VERSION = '3.7.0'`

---

## 4. ViewModels (Contextes)

### 4.1 AuthContext

Fournit `useAuth()` :
- `user`, `userId`, `loading`, `allUsers`, `accountsIndex`, `encryptionReady`
- `login(email, password)` - connexion avec hash/détection legacy
- `register(name, email, password)` - inscription avec validation et hash
- `loginToUser(id, pin)` - connexion multi-compte avec PIN + rate limiting
- `switchToUser(email)` - basculement rapide entre comptes
- `logout()`, `updateProfile(name)`

### 4.2 FinanceContext

Fournit `useFinance()` :
- `transactions[]`, `momoBalance`, `cashBalance`, `totalDepenses`
- `theme`, `setTheme`, `accentColor`, `setAccentColor`, `isDark`
- `devise`, `setDevise`, `locale`, `changeGlobalLanguage()`
- `budgetLimit`, `setBudgetLimit`, `budgetPeriod`, `setBudgetPeriod`
- `addTransaction()`, `updateTransaction()`, `deleteTransaction()`, `deleteMultipleTransactions()`
- `isDiscreteMode`, `hasPinCode`, `saveNewPin()`, `unlockDiscreteMode()`
- `changePinCode()`, `resetPinCodeWithPassword()`
- `exportTransactionsAsCSV()`, `updateDailyReminderTime()`, `scheduleMonthlyReview()`
- `checkBudgetPeriodAlert()` - alerte à 80% et 100% du budget

### 4.3 DebtContext

Fournit `useDebts()` :
- `debts[]`, `loaded`, `totalToReceive`, `totalToRepay`
- `addDebt()`, `updateDebt()`, `deleteDebt()`
- `markReimbursed(id, amount, skipTransaction)` - avec option de création de transaction
- `scheduleDueDateNotification()`

### 4.4 TontineContext

Fournit `useTontines()` :
- `groups[]`, `loaded`, `overallSummary`
- `addGroup()`, `updateGroup()`, `deleteGroup()`
- `markRoundPaid()`, `markRoundReceived()` - avec option de création de transaction
- `scheduleRoundNotifications()`, `computeTontineSummary()`

---

## 5. Écrans

### 5.1 OnboardingScreen

3 slides de bienvenue présentant l'application : double portefeuille, sécurité, mode discret.
- FlatList horizontal avec pagination
- `@oraned_onboarding_seen` persiste l'état
- Demande de permission notifications à la fin

### 5.2 LoginScreen

Formulaire de connexion email + mot de passe. Bouton visibilité mot de passe.
- Navigation vers RegisterScreen via `onSwitchToRegister`

### 5.3 RegisterScreen

Inscription : nom, email, mot de passe, confirmation.
- Validation : mot de passe ≥ 6 car., 1 lettre, 1 chiffre
- Création du compte et connexion automatique

### 5.4 ProfileSelectorScreen (non intégré au flux principal)

Sélecteur de profils avec PIN ou authentification biométrique (`expo-local-authentication`).
- Clavier PIN 0-9, 5 chiffres
- Rate limiting intégré

### 5.5 HomeScreen — Accueil (Dashboard)

- Solde MoMo et solde Cash
- Total revenus et dépenses
- Badges résumé : dettes à recevoir, à rembourser, tontine
- Liste des transactions avec recherche, sélection multiple, suppression
- Mode discret (montants cachés) avec déverrouillage par PIN
- Création de PIN si non défini

### 5.6 AddTransactionScreen — Ajout de transaction

- Type : Dépense / Revenu / Transfert MoMo→Cash
- Sélecteur de portefeuille (MoMo / Espèces)
- Pour les transferts : sélection réseau (MTN/MOOV/CELTIIS), calcul automatique des frais
- Catégories adaptées au type
- Modal de succès avec auto-retour
- Édition de transaction existante

### 5.7 StatsScreen — Statistiques

- Période : jour, 7 jours, semaine, mois, personnalisé
- Synthèse revenus/dépenses/solde net
- Suivi prêts et dettes (emprunté - remboursé)
- PieChart frais de retrait mobiles par réseau (`react-native-chart-kit`)
- DailyAreaChart SVG personnalisé (activité 7 jours)
- BarChart top 5 catégories de dépenses
- Distribution budgétaire en barres de progression

### 5.8 SettingsScreen — Réglages

- Profil : nom (édition en place), email (lecture seule)
- Gestion multi-comptes : liste des comptes, basculement, badge "actif"
- Personnalisation visuelle : thème (Sombre/Clair/Système), 20 couleurs d'accent
- Localisation : 61 langues, 11 devises, 84 pays
- Budget & Rappels : période (jour/semaine/mois), montant max, rappel quotidien (DateTimePicker)
- Sécurité & Code PIN : statut, modification, réinitialisation via mot de passe
- Accès aux écrans Dettes et Tontines en superposition
- Export CSV des transactions (`expo-sharing` + `expo-file-system`)
- Déconnexion

### 5.9 DebtsScreen — Dettes & Prêts

- Deux onglets : "On me doit" / "Je dois"
- Création/édition via DebtFormModal (bottom-sheet)
- Marquage de remboursement avec option création transaction
- Statut visuel : en cours / partielle / remboursée
- Suppression avec confirmation

### 5.10 TontinesScreen — Tontines

- Liste des groupes avec barre de progression
- Résumé global : total cotisé / à recevoir
- Création via TontineFormModal (bottom-sheet)

### 5.11 TontineDetailScreen — Détail d'une tontine

- Carte d'information : montant/tour, total à recevoir, position
- Résumé cotisé/reçu/reste
- Liste des tours avec statut et actions (payer/recevoir)
- Création de transaction réelle à chaque action

---

## 6. Composants

### 6.1 PinAuthModal

Modal de saisie du code PIN à 5 chiffres avec pavé numérique.
- Mode création (nouveau PIN) ou vérification (mode discret)
- Affichage des tentatives restantes
- Bouton annuler

### 6.2 DebtFormModal

Bottom-sheet pour créer/éditer une dette.
- Toggle type (On me doit / Je dois)
- Champs : personne, montant, échéance (date picker), rappel (switch), note

### 6.3 TontineFormModal

Bottom-sheet pour créer/éditer une tontine.
- Champs : nom groupe, montant/tour, fréquence (hebdo/mensuel), participants, position, date début
- Aperçu du montant de la cagnotte

---

## 7. Services

### 7.1 Export CSV (`exportCSV.js`)

- Génère un fichier CSV dans le cache
- Colonnes : Date;Catégorie;Description;Montant;Type;Portefeuille;Frais MoMo;Réseau
- Partage via `expo-sharing`

---

## 8. Utilitaires

### 8.1 Stockage (`storage.js`)

- `safeAsyncRead(key, fallback)` / `safeAsyncWrite(key, value)` - avec vérification d'écriture
- `safeAsyncReadJSON()` / `safeAsyncWriteJSON()` - sérialisation JSON
- `validateSchema()` - validation de schéma pour chaque type de donnée
- `filterValidRecords()` - filtre les enregistrements corrompus
- `validateUser/Debt/Tontine/Transaction()`

### 8.2 Stockage sécurisé (`secureStorage.js`)

- AES-CBC via `expo-crypto` + `expo-secure-store` pour la clé maîtresse
- Fallback transparent vers AsyncStorage si AES indisponible
- `secureSet/Get/GetJSON/Remove()` avec préfixe `@enc_`
- `secureStorePinHash/GetPinHash/RemovePinHash()` via `expo-secure-store`

### 8.3 Sécurité (`security.js`)

- `hashPin(pin)` - sel 16 octets + 1000 itérations SHA-256
- `verifyPin(pin, storedHash)` - vérification à coût constant
- Rate limiting à 3 niveaux :
  - Tentatives 3-4 → verrouillage 30s
  - Tentatives 5-9 → verrouillage 5 min
  - Tentatives 10+ → verrouillage 1h + option "PIN oublié"
- `hashPassword(password)` / `verifyPassword()` - 100 itérations SHA-256

### 8.4 Crypto Polyfill (`cryptoPolyfill.js`)

Patch `global.crypto` pour React Native avec `expo-crypto` :
- `crypto.getRandomValues()` via `getRandomBytes()`
- `crypto.subtle.digest()` via `digestStringAsync()` (SHA-256)

### 8.5 Formatage (`format.js`)

- `toNumber(val)` - parsing safe depuis chaîne (support virgule, espaces)
- `toCurrency(val)` - formatage locale française

### 8.6 Dates de transaction (`transactionDates.js`)

Filtres temporels utilisant `date-fns` :
- `isTransactionInDay()`, `isTransactionInLastNDays()`, `isTransactionInCurrentWeek()`, `isTransactionInMonth()`

### 8.7 Totaux (`transactionTotals.js`)

- `computeIncomeExpenseTotals()` - somme des revenus et dépenses (exclut prêts/remboursements)

### 8.8 Internationalisation (`LanguageManager.js`)

- 61 langues, ~119 clés de traduction chacune
- Généré automatiquement (script de traduction)
- Persistance via AsyncStorage
- Hook `useTranslation()` exposant `t(key)` et `changeLanguage()`

---

## 9. Fonctionnalités Clés

### 9.1 Double Portefeuille (MoMo + Cash)

Les transactions sont affectées à un portefeuille. Les transferts MoMo→Cash :
1. Débitent le montant + frais du MoMo
2. Créditent le montant net en Cash
3. Créent une transaction de frais séparée

### 9.2 Frais de Retrait Mobile

Calcul automatique selon le réseau :
- MTN MoMo : 2%
- Moov Money : 2%
- Celtiis Cash : 2.5%

### 9.3 Mode Discret

Cache tous les montants avec "••••". Déverrouillage par code PIN 5 chiffres.
Protection anti-capture d'écran via `expo-screen-capture`.

### 9.4 Budget avec Alertes

Période configurable (jour/semaine/mois). Alertes à 80% (attention) et 100% (dépassement).

### 9.5 Multi-comptes

Plusieurs profils utilisateur avec basculement rapide depuis les réglages.
Authentification par PIN ou biométrie pour les comptes secondaires.

### 9.6 Notifications

- Rappel quotidien (heure configurable)
- Bilan mensuel (dernier jour du mois à 20h)
- Rappels d'échéance de dettes
- Rappels de tours de tontine (2 jours avant)

### 9.7 Sécurité

- Mots de passe hachés (SHA-256 + sel, 100 itérations)
- Codes PIN hachés (SHA-256 + sel, 1000 itérations)
- Rate limiting avec verrouillage progressif (30s → 5min → 1h)
- Réinitialisation PIN via mot de passe de session
- Stockage sécurisé via AES-CBC + SecureStore
- Validation des schémas au chargement (filtre des données corrompues)

### 9.8 Internationalisation

61 langues dont : français, anglais, espagnol, arabe, chinois, hindi, portugais, russe, japonais, allemand, italien, néerlandais, polonais, vietnamien, turc, swahili, etc.

---

## 10. Configuration

### 10.1 Dépendances principales

| Package | Version |
|---|---|
| react | 19.2.3 |
| react-native | 0.85.3 |
| expo | ~56.0.12 |
| react-native-pager-view | 8.0.1 |
| lucide-react-native | ^1.17.0 |
| react-native-chart-kit | ^6.12.3 |
| date-fns | ^4.4.0 |
| expo-crypto | ~56.0.4 |
| expo-secure-store | ~56.0.4 |
| expo-notifications | ~56.0.18 |
| expo-local-authentication | ~56.0.4 |

### 10.2 Scripts

```bash
npm start          # expo start
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web        # expo start --web
```

### 10.3 Build (EAS)

```bash
eas build --profile development    # Client de développement
eas build --profile preview        # APK Android
eas build --profile production     # Production
```

### 10.4 Plateforme

- **iOS :** support tablette, notifications background
- **Android :** package `com.jhpy.Orane`, icône adaptative, permissions notifications/exact alarm/boot
- **Web :** favicon

---

## 11. Structure des Fichiers

```
/
├── App.js                           # Point d'entrée, providers, navigation
├── app.json                         # Configuration Expo
├── eas.json                         # Build profiles (development/preview/production)
├── index.js                         # registerRootComponent(App)
├── package.json
├── AGENTS.md
├── CLAUDE.md
├── scripts/
│   └── generate-translations.js     # Générateur de traductions (61 langues)
└── src/
    ├── model/
    │   ├── index.js
    │   ├── AppConstants.js
    │   ├── DebtModel.js
    │   ├── ThemeModel.js
    │   ├── TontineModel.js
    │   ├── TransactionModel.js
    │   └── UserModel.js
    ├── service/
    │   ├── index.js
    │   └── exportCSV.js
    ├── utils/
    │   ├── index.js
    │   ├── cryptoPolyfill.js
    │   ├── format.js
    │   ├── LanguageManager.js
    │   ├── secureStorage.js
    │   ├── security.js
    │   ├── storage.js
    │   ├── transactionDates.js
    │   └── transactionTotals.js
    ├── view/
    │   ├── components/
    │   │   ├── index.js
    │   │   ├── DebtFormModal.js
    │   │   ├── PinAuthModal.js
    │   │   └── TontineFormModal.js
    │   └── screens/
    │       ├── index.js
    │       ├── AddTransactionScreen.js
    │       ├── DebtsScreen.js
    │       ├── HomeScreen.js
    │       ├── LoginScreen.js
    │       ├── OnboardingScreen.js
    │       ├── ProfileSelectorScreen.js
    │       ├── RegisterScreen.js
    │       ├── SettingsScreen.js
    │       ├── StatsScreen.js
    │       ├── TontineDetailScreen.js
    │       └── TontinesScreen.js
    └── viewmodel/
        ├── index.js
        ├── AuthContext.js
        ├── DebtContext.js
        ├── FinanceContext.js
        └── TontineContext.js
```

---

## 12. Séquence de Démarrage

1. `index.js` → `registerRootComponent(App)`
2. `App.js` importe `cryptoPolyfill` (patch `global.crypto`)
3. Montage des providers : `SafeAreaProvider > AuthProvider > FinanceProvider > DebtProvider > TontineProvider`
4. `RootNavigator` :
   - Si `@oraned_onboarding_seen` ≠ `true` → `OnboardingScreen`
   - Si `user` = null → `AuthScreen()` (Login/Register)
   - Sinon → `MainTabs` (4 onglets, PagerView)
5. `FinanceProvider` initialise la langue, le thème, la devise, les rappels
6. Dès que `userId` est disponible, charge les transactions, le budget, le hash PIN
7. `HomeScreen` vérifie le mode discret et propose la création de PIN si nécessaire

---

## 13. Licence

MIT — © 2026 Jhpy
