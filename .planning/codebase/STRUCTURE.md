# Codebase Structure

**Analysis Date:** 2026-07-03

## Directory Layout

```
FinanceTracker/
├── index.js                    # Expo entry point — registerRootComponent(App)
├── App.js                      # Root component — providers, navigation, auth gates
├── app.json                    # Expo config (name "Orane.d", v3.7.0, plugins)
├── eas.json                    # EAS Build profiles (dev/preview/production)
├── package.json                # Dependencies (Expo SDK 56, React Native 0.85.3)
├── package-lock.json           # Lockfile (npm)
├── AGENTS.md                   # Agent instructions
├── CLAUDE.md                   # Claude config (references AGENTS.md)
├── README.md                   # Project readme
├── LICENSE                     # License file
│
├── assets/                     # Static images (icon, splash, favicon, etc.)
│
├── scripts/
│   └── generate-translations.js    # Auto-generates LanguageManager translations
│
├── sauvegardes/                # Backup/discussion documents
│   ├── SAUVEGARDE_DISCUSSION.md
│   └── SAUVEGARDE_FICHIERS.md
│
├── src/                        # All application source code
│   ├── model/                  # ————— MODEL LAYER —————
│   │   ├── index.js            # Re-exports from all models
│   │   ├── AppConstants.js     # Storage keys, budget/reminder defaults, app info
│   │   ├── TransactionModel.js # Transaction types, categories, fees, wallets, networks
│   │   ├── UserModel.js        # User creation helpers, storage keys
│   │   ├── DebtModel.js        # Debt types, statuses, creation helpers
│   │   ├── TontineModel.js     # Tontine round generation, summary computation
│   │   ├── ThemeModel.js       # Theme modes, accent colors, dark-mode resolution
│   │   └── accounting/         # Double-entry bookkeeping subsystem
│   │       ├── index.js        # Re-exports
│   │       ├── ChartOfAccounts.js   # SYSCOHADA chart (187 accounts, classes 1–8)
│   │       ├── JournalEntry.js      # Journal entry creation, validation, status
│   │       ├── GeneralLedger.js     # Ledger building, account balance computation
│   │       ├── TrialBalance.js      # Trial balance construction, balance check
│   │       └── FinancialStatements.js # Balance sheet, income statement, summary
│   │
│   ├── viewmodel/              # ————— VIEWMODEL LAYER (React Contexts) —————
│   │   ├── index.js            # Re-exports all providers and hooks
│   │   ├── AuthContext.js      # Auth state, login/register/logout, multi-account
│   │   ├── FinanceContext.js   # Transactions CRUD, theme, currency, PIN, budget, discrete mode
│   │   ├── DebtContext.js      # Debt/credit tracking, reimbursement, notifications
│   │   ├── TontineContext.js   # Tontine groups, round tracking, summaries
│   │   └── AccountingContext.js # Journal entries, ledger, trial balance, financial reports
│   │
│   ├── view/                   # ————— VIEW LAYER —————
│   │   ├── screens/            # Screen-level components
│   │   │   ├── index.js        # Re-exports default screens
│   │   │   ├── HomeScreen.js   # Dashboard: balances, transaction list, search, bulk delete
│   │   │   ├── AddTransactionScreen.js  # Transaction create/edit form
│   │   │   ├── StatsScreen.js  # Charts, period filtering, category analysis
│   │   │   ├── SettingsScreen.js # Profile, theme, lang, currency, budget, PIN, subscreens
│   │   │   ├── LoginScreen.js  # Email/password login
│   │   │   ├── RegisterScreen.js # Registration form
│   │   │   ├── OnboardingScreen.js # First-launch walkthrough (3 slides)
│   │   │   ├── ProfileSelectorScreen.js # Multi-account biometric/PIN login picker
│   │   │   ├── DebtsScreen.js  # Debt list by type, add/edit/delete, mark reimbursed
│   │   │   ├── TontinesScreen.js  # Tontine group list, add/delete
│   │   │   ├── TontineDetailScreen.js  # Tontine round-by-round detail view
│   │   │   └── Accounting/     # Double-entry accounting screens
│   │   │       ├── index.js           # Re-exports
│   │   │       ├── AccountingDashboardScreen.js  # Overview, navigation to reports
│   │   │       ├── JournalListScreen.js          # Journal entries list
│   │   │       ├── JournalEntryScreen.js         # Journal entry creation/edit
│   │   │       ├── GeneralLedgerScreen.js        # Ledger view by account
│   │   │       ├── TrialBalanceScreen.js         # Trial balance report
│   │   │       └── ChartOfAccountsScreen.js      # Chart of accounts browser
│   │   │
│   │   └── components/         # Reusable UI components
│   │       ├── index.js        # Re-exports
│   │       ├── CrossPlatformPager.js       # Swipe pager for web (Animated + PanResponder)
│   │       ├── CrossPlatformPager.native.js # Swipe pager for native (react-native-pager-view)
│   │       ├── CrossPlatformDatePicker.js  # Platform-aware date/time picker
│   │       ├── PinAuthModal.js             # PIN entry keypad modal (5-digit)
│   │       ├── DebtFormModal.js            # Debt creation/edit form modal
│   │       └── TontineFormModal.js          # Tontine creation/edit form modal
│   │
│   ├── service/                # ————— SERVICE LAYER —————
│   │   ├── index.js            # Re-exports
│   │   └── exportCSV.js        # CSV file export using expo-file-system + expo-sharing
│   │
│   └── utils/                  # ————— UTILITY LAYER —————
│       ├── index.js            # Re-exports utilities
│       ├── storage.js          # AsyncStorage wrappers (safe read/write, schema validation)
│       ├── secureStorage.js    # AES-CBC encryption + expo-secure-store key management
│       ├── security.js         # Password/PIN hashing (SHA-256 iterative), rate limiting
│       ├── cryptoPolyfill.js   # Polyfills global.crypto for React Native using expo-crypto
│       ├── format.js           # Number/currency formatting helpers (toNumber, toCurrency)
│       ├── transactionDates.js  # Date-based transaction filtering (date-fns)
│       ├── transactionTotals.js # Income/expense total computation
│       └── LanguageManager.js  # Translation strings (61 languages), language switching
│
├── dist/                       # Expo web build output (generated, gitignored)
├── node_modules/               # Dependencies (gitignored)
├── .expo/                      # Expo local state (gitignored)
│
├── .gitignore                  # Git ignore rules
├── .opencode/                  # OpenCode/GSD configuration and skills
└── .planning/                  # Project planning directory
    └── codebase/               # Codebase analysis documents
        ├── STACK.md            # Technology stack analysis
        ├── ARCHITECTURE.md     # Architecture analysis
        └── STRUCTURE.md        # (this file)
```

## Directory Purposes

**`src/model/`:**
- Purpose: Pure data definitions, domain constants, business logic functions with no React dependencies
- Contains: Model modules as `.js` files — `TransactionModel.js`, `UserModel.js`, `DebtModel.js`, `TontineModel.js`, `ThemeModel.js`, `AppConstants.js`
- Key files:
  - `TransactionModel.js`: Defines transaction types (`expense`/`income`/`transfert`), wallet types (`momo`/`cash`), mobile money networks, expense/income categories, transfer fee computation
  - `AppConstants.js`: All AsyncStorage key strings as named exports (no magic strings), budget/reminder defaults, `APP_NAME`, `APP_VERSION`
- Subdirectory: `accounting/` — full SYSCOHADA double-entry bookkeeping subsystem

**`src/model/accounting/`:**
- Purpose: Double-entry accounting model layer — chart of accounts, journal entries, general ledger, trial balance, financial statements
- Contains: 5 modules following accounting lifecycle
- Key files:
  - `ChartOfAccounts.js`: 187 SYSCOHADA accounts in classes 1–8 (assets, liabilities, equity, income, expenses)
  - `JournalEntry.js`: Journal entry creation, validation (debits = credits), status (DRAFT/POSTED)
  - `GeneralLedger.js`: Builds ledger from entries, computes account balances
  - `TrialBalance.js`: Constructs trial balance, checks equilibrium
  - `FinancialStatements.js`: Income statement and balance sheet generation

**`src/viewmodel/`:**
- Purpose: React Context providers that manage state, orchestrate business logic, and persist data
- Contains: 5 Context provider modules with custom hooks
- Key files:
  - `FinanceContext.js`: Largest provider (468 lines) — manages 20+ state variables, 10+ useEffect persistence hooks, wallet balance computation
  - `AuthContext.js`: Authentication state, user CRUD, multi-account switching (193 lines)
  - `AccountingContext.js`: Exposes journal CRUD, ledger/trial/statement queries (209 lines)
- Pattern: Each provider exports `[Name]Provider` (component) and `use[Name]` (custom hook)

**`src/view/screens/`:**
- Purpose: Full-screen page components, each representing a distinct app view
- Contains: 11 screen files + `Accounting/` subdirectory (5 screens)
- Key files:
  - `HomeScreen.js`: Largest screen (565 lines) — complex UI with balance display, transaction list, search, multi-select management
  - `SettingsScreen.js`: Largest file (1101 lines) — profile editing, theme, language, currency, budget, PIN management, exports, and embedded sub-screens (Debts, Tontines, Accounting)
- Subdirectory: `Accounting/` — screens for the double-entry accounting feature

**`src/view/components/`:**
- Purpose: Reusable presentational components used across multiple screens
- Contains: 6 component files
- Key files:
  - `CrossPlatformPager.js` + `CrossPlatformPager.native.js`: Platform-specific page swipe (web uses Animated+PanResponder, native uses `react-native-pager-view`)
  - `PinAuthModal.js`: 5-digit PIN entry keypad with error/rate-limit display
  - `DebtFormModal.js` / `TontineFormModal.js`: Modal forms with date pickers

**`src/utils/`:**
- Purpose: Cross-cutting utility modules — storage, security, formatting, localization
- Contains: 8 utility modules
- Key files:
  - `storage.js`: Safe AsyncStorage wrappers with write-verify pattern, schema validation framework, data integrity filtering
  - `secureStorage.js`: AES-CBC encryption with expo-secure-store master key, graceful fallback
  - `security.js`: SHA-256 iterative hashing (password 100 rounds, PIN 1000 rounds), rate limiting with escalating lockout
  - `LanguageManager.js`: 8054-line auto-generated file with translation objects for 61 languages

**`src/service/`:**
- Purpose: External service integrations (file export, sharing)
- Contains: `exportCSV.js` — writes CSV to cache directory and opens system share sheet

## Key File Locations

**Entry Points:**
- `index.js`: Expo root component registration
- `App.js`: Provider tree, navigation, auth/onboarding gating

**Configuration:**
- `app.json`: Expo SDK config, app name/version, platform settings, plugins
- `eas.json`: EAS Build profiles (development, preview, production)
- `package.json`: All dependencies and npm scripts

**Core Logic:**
- Data models: `src/model/*.js` (6 files) + `src/model/accounting/*.js` (5 files)
- State management: `src/viewmodel/*.js` (5 providers)
- Storage: `src/utils/storage.js`, `src/utils/secureStorage.js`
- Security: `src/utils/security.js`

**UI:**
- Screens: `src/view/screens/` (11 screens + 5 accounting screens)
- Components: `src/view/components/` (6 components)

**Testing:**
- **Not present** — no test files or test configuration detected anywhere in the codebase

**Internationalization:**
- `src/utils/LanguageManager.js`: 61-language translation data (auto-generated)

## Naming Conventions

**Files:**
- PascalCase for React components and screen files: `HomeScreen.js`, `AddTransactionScreen.js`, `PinAuthModal.js`, `CrossPlatformDatePicker.js`
- PascalCase for model modules: `TransactionModel.js`, `DebtModel.js`, `UserModel.js`
- camelCase for utility/service modules: `storage.js`, `format.js`, `exportCSV.js`, `transactionDates.js`
- PascalCase for context modules: `AuthContext.js`, `FinanceContext.js`
- Platform-specific: `.native.js` suffix for native overrides (e.g., `CrossPlatformPager.native.js`)

**Directories:**
- All lowercase: `model/`, `viewmodel/`, `view/`, `screens/`, `components/`, `utils/`, `service/`, `accounting/`, `scripts/`

**Functions:**
- camelCase: `addTransaction`, `computeTransferFee`, `filterValidRecords`, `safeAsyncReadJSON`
- PascalCase for component functions and context providers: `HomeScreen`, `AuthProvider`, `FinanceProvider`
- Custom hooks prefixed with `use`: `useAuth`, `useFinance`, `useDebts`, `useTontines`, `useAccounting`, `useTranslation`

**Variables:**
- camelCase for JS identifiers: `isDark`, `accentColor`, `walletBalances`, `currentLanguage`
- UPPER_SNAKE_CASE for constants: `TRANSACTION_TYPES`, `WALLET_TYPES`, `DEBT_STATUS`, `JOURNAL_STATUS`, `STORAGE_KEYS`
- PascalCase for React components stored in variables: `IconComp`, `ScreenComp`

**Types/Exports:**
- Named exports for utility functions and model constants
- Default exports for screen components and context providers
- Barrel exports via `index.js` files at each directory level

## Where to Add New Code

**New Feature (e.g., new module like "Investments"):**
1. Define data shapes/constants in a new `src/model/InvestmentModel.js`
2. Create a new Context provider in `src/viewmodel/InvestmentContext.js`
3. Add screens in `src/view/screens/` or a subdirectory
4. Add any reusable components in `src/view/components/`
5. Wire the provider into the nesting chain in `App.js`
6. Export from parent `index.js` barrel files

**New Screen (e.g., new tab page):**
1. Create file at `src/view/screens/NewFeatureScreen.js`
2. Add to the `screens` array in `App.js` `MainTabs` component
3. Optionally add an icon to the tab bar
4. Export from `src/view/screens/index.js`

**New Utility Function:**
1. Add to existing file in `src/utils/` if related, or create new file
2. Export named functions
3. Add re-export in `src/utils/index.js` if commonly used

**New Component (reusable):**
1. Create file in `src/view/components/ComponentName.js`
2. Export as default
3. Add re-export in `src/view/components/index.js`

**New Accounting Feature (e.g., new financial report):**
1. Add pure computation function in `src/model/accounting/`
2. Add query method in `src/viewmodel/AccountingContext.js`
3. Add screen in `src/view/screens/Accounting/`

## Special Directories

**`dist/`:**
- Purpose: Expo web build output (HTML, JS bundle, assets)
- Generated: Yes (via `expo export:web`)
- Committed: No (gitignored)

**`node_modules/`:**
- Purpose: npm package dependencies
- Generated: Yes (via `npm install`)
- Committed: No (gitignored)

**`.expo/`:**
- Purpose: Expo local development state
- Generated: Yes
- Committed: No (gitignored)

**`sauvegardes/`:**
- Purpose: Backup discussion and file listing documents (French, project context)
- Generated: No
- Committed: Yes

**`assets/`:**
- Purpose: Static images — app icon, splash screen, favicon, adaptive icons
- Generated: No
- Committed: Yes

**`.opencode/`:**
- Purpose: OpenCode/GSD workflow configuration, skills, planning
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-07-03*
