<!-- refreshed: 2026-07-03 -->
# Architecture

**Analysis Date:** 2026-07-03

## System Overview

The app follows an **MVVM-like pattern** using React Context API as the ViewModel layer, with explicit separation into Model (`src/model/`), ViewModel (`src/viewmodel/`), and View (`src/view/`) layers. All data is stored locally on-device via AsyncStorage (with expo-secure-store for sensitive values). There is no backend server.

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         VIEW LAYER                                   │
│                   `src/view/screens/` `src/view/components/`         │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐  │
│  │  HomeScreen  │AddTransaction│  StatsScreen │  SettingsScreen  │  │
│  │              │   Screen     │              │                  │  │
│  ├──────────────┼──────────────┼──────────────┼──────────────────┤  │
│  │ DebtsScreen  │TontinesScreen│TontineDetail │  Accounting/     │  │
│  │              │             │   Screen     │  (5 screens)     │  │
│  └──────┬───────┴──────┬───────┴──────┬───────┴────────┬─────────┘  │
│         │              │              │                │            │
│         ▼              ▼              ▼                ▼            │
├─────────────────────────────────────────────────────────────────────┤
│                      VIEWMODEL LAYER (React Context)                  │
│                     `src/viewmodel/`                                  │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐  │
│  │ AuthContext  │FinanceContext│ DebtContext  │ TontineContext   │  │
│  │ (auth state, │ (transactions│ (debt/credit │ (tontine/        │  │
│  │  login/out,  │  theme, PIN, │  mgmt,       │  savings group   │  │
│  │  multi-user) │  budget,     │  reimbursemt)│  mgmt)           │  │
│  │              │  discrete    │              │                  │  │
│  │              │  mode)       │              │                  │  │
│  └──────┬───────┴──────┬───────┴──────┬───────┴────────┬─────────┘  │
│         │              │              │                │            │
│         └──────────────┼──────────────┼────────────────┘            │
│                        │              │                             │
│             AccountingContext          │                             │
│         (double-entry bookkeeping)     │                             │
└────────────────────────┬──────────────┬──────────────────────────────┘
                         │              │
                         ▼              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      MODEL LAYER                                      │
│           `src/model/` + `src/model/accounting/`                     │
│  Data definitions, constants, validation functions, business logic   │
│  (pure JS — no React dependencies)                                   │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   STORAGE / UTILITY LAYER                             │
│   `src/utils/storage.js`    `src/utils/security.js`                   │
│   `src/utils/secureStorage.js`   `src/utils/format.js`               │
│   `src/service/exportCSV.js`                                         │
│                                                                       │
│   AsyncStorage (persistence) ← → expo-secure-store (encrypted)        │
│                                                                       │
│   Writes: `safeAsyncWriteJSON(key, value)` → AsyncStorage.setItem()   │
│   Reads:  `safeAsyncReadJSON(key)` → AsyncStorage.getItem()           │
└───────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App (root) | Provider nesting, tab layout, auth routing, onboarding gate | `App.js` |
| `AuthProvider` | User registration, login/logout, multi-account switching, session persistence | `src/viewmodel/AuthContext.js` |
| `FinanceProvider` | Transactions CRUD, wallet balance computation, theme/currency/locale, PIN security, discrete mode, budget alerts, notifications | `src/viewmodel/FinanceContext.js` |
| `DebtProvider` | Debt/credit tracking, reimbursement, due-date notifications | `src/viewmodel/DebtContext.js` |
| `TontineProvider` | Tontine (rotating savings) group management, round tracking, notifications | `src/viewmodel/TontineContext.js` |
| `AccountingProvider` | Double-entry bookkeeping: journal entries, general ledger, trial balance, financial statements | `src/viewmodel/AccountingContext.js` |
| Models (pure) | Data shapes, constants, validation logic, business computations | `src/model/*.js` |
| Storage utils | Safe AsyncStorage reads/writes with JSON parsing, write-verify pattern, schema validation | `src/utils/storage.js` |
| Security utils | Password/PIN hashing (SHA-256, iterative), rate limiting, secure store migration | `src/utils/security.js` |
| Secure Storage | AES-CBC encryption wrapper around AsyncStorage with expo-secure-store for master key | `src/utils/secureStorage.js` |

## Pattern Overview

**Overall:** MVVM-lite with React Context

The architecture uses an **MVVM-inspired pattern** without a formal framework:
- **Model** (`src/model/`): Pure JavaScript modules defining data shapes, constants, and business logic (no React dependencies). Includes `TransactionModel.js`, `UserModel.js`, `DebtModel.js`, `TontineModel.js`, `ThemeModel.js`, `AppConstants.js`, and the full `accounting/` sub-module with double-entry bookkeeping.
- **ViewModel** (`src/viewmodel/`): React Context providers that bridge Model data to Views. Each provider manages state with `useState`/`useReducer`, persists data to AsyncStorage via side-effect `useEffect` hooks, and exposes CRUD operations and computed values.
- **View** (`src/view/`): React Native screen and component files that consume ViewModels via custom hooks (`useAuth`, `useFinance`, `useDebts`, `useTontines`, `useAccounting`).

**Key Characteristics:**
- **No routing library for main navigation** — uses a custom `CrossPlatformPager` component with swipeable pages (falls back to `react-native-pager-view` on native) instead of React Navigation's tab navigator. `@react-navigation/bottom-tabs` and `@react-navigation/material-top-tabs` are installed but not used.
- **All data is local** — no API calls, no backend. AsyncStorage is the single source of truth. `expo-secure-store` provides encrypted storage for master encryption key and PIN hashes.
- **Each Context handles its own persistence** — data is loaded on mount and saved on state change via `useEffect` hooks watching state variables.
- **Multi-user support** — data keys are scoped by `userId` (email) using patterns like ``@oraned_transactions_${userId}``. Auth state persists the active user in `@AuthUser`.

## Layers

**View Layer:**
- Purpose: Renders UI, handles user interaction, delegates to ViewModel
- Location: `src/view/screens/`, `src/view/components/`
- Contains: Screen components (Home, AddTransaction, Stats, Settings, Debts, Tontines, Login, Register, Onboarding, ProfileSelector, Accounting screens) and reusable components (PinAuthModal, DebtFormModal, TontineFormModal, CrossPlatformPager, CrossPlatformDatePicker)
- Depends on: ViewModel contexts (via custom hooks), Model constants, Utility functions
- Used by: `App.js` (entry point)

**ViewModel Layer:**
- Purpose: Manages application state, business logic orchestration, data persistence
- Location: `src/viewmodel/`
- Contains: 5 React Context providers — `AuthContext.js`, `FinanceContext.js`, `DebtContext.js`, `TontineContext.js`, `AccountingContext.js`
- Depends on: Model modules for data shapes and business logic, Storage utilities for persistence
- Used by: View layer screens and components

**Model Layer:**
- Purpose: Pure data definitions, constants, validation, domain logic (framework-agnostic)
- Location: `src/model/`, `src/model/accounting/`
- Contains: TransactionModel, UserModel, DebtModel, TontineModel, ThemeModel, AppConstants + Accounting subsystem (ChartOfAccounts, JournalEntry, GeneralLedger, TrialBalance, FinancialStatements)
- Depends on: Nothing (pure JS)
- Used by: ViewModel layer

**Storage/Utility Layer:**
- Purpose: Cross-cutting concerns — persistence, security/encryption, formatting, date utilities, CSV export
- Location: `src/utils/`, `src/service/`
- Contains: `storage.js`, `security.js`, `secureStorage.js`, `format.js`, `transactionDates.js`, `transactionTotals.js`, `LanguageManager.js`, `cryptoPolyfill.js`, `exportCSV.js`
- Depends on: External libraries (AsyncStorage, expo-secure-store, expo-crypto, expo-file-system, expo-sharing, date-fns)

## Data Flow

### Primary Request Path (Adding a Transaction)

1. User fills form in `AddTransactionScreen` (`src/view/screens/AddTransactionScreen.js`)
2. Screen calls `addTransaction(transactionData)` from `useFinance()` hook
3. `FinanceContext.addTransaction` (`src/viewmodel/FinanceContext.js:418`) updates state with `setTransactions(prev => [transaction, ...prev])`
4. A `useEffect` in same context (`src/viewmodel/FinanceContext.js:360`) persists to AsyncStorage via `safeAsyncWriteJSON(@oraned_transactions_${userId}, transactions)`
5. Home screen re-renders as `transactions` state changed; wallet balances recompute via `useMemo` (`src/viewmodel/FinanceContext.js:49`)

### Authentication Flow

1. User registers via `RegisterScreen` → calls `register()` from `useAuth()`
2. `AuthContext.register` (`src/viewmodel/AuthContext.js:136`): reads `@oraned_all_users`, appends new user with hashed password, writes back, sets active user in state and persists `@AuthUser`
3. On app restart, `AuthContext` useEffect (`src/viewmodel/AuthContext.js:88`) reads `@AuthUser` to restore session
4. `FinanceContext` watches `userId` from AuthContext; when it changes, loads user-scoped data (transactions, budget, PIN)

### State Persistence Flow

1. **Load:** Each Context provider loads data on mount via `useEffect` → calls to `safeAsyncReadJSON(key)` → stores in `useState`
2. **Save:** Each Context watches its state with `useEffect` with `[stateVariable]` dependency array → calls `safeAsyncWriteJSON(key, value)` whenever state changes
3. **Sync:** FinanceContext uses `lastSavedUserId` ref to avoid overwriting data from a previous user during transition

**State Management:**
- Local React state (`useState`) inside Context providers
- No useReducer — all state updates are direct `setState` calls
- No external state management library
- Computed values via `useMemo` (e.g., `walletBalances`, `totalToReceive`, `totalToRepay`, `overallSummary`)

## Key Abstractions

**Context Provider Pattern:**
- Purpose: Scoped state container with persistence
- Examples: `AuthProvider`, `FinanceProvider`, `DebtProvider`, `TontineProvider`, `AccountingProvider` (all in `src/viewmodel/`)
- Pattern: `<DataProvider>` wraps children, provides state + actions via `Context.Provider.value`, exposes custom hook (`useData`)

**safeAsyncStorage Wrappers:**
- Purpose: Safe read/write with JSON parsing, write-verify, error tolerance
- Location: `src/utils/storage.js`
- Signature: `safeAsyncReadJSON(key, fallback)` → returns parsed JSON or fallback; `safeAsyncWriteJSON(key, value)` → writes JSON with intermediate temp key verification

**Schema Validation for Data Integrity:**
- Purpose: Validate stored records against expected schemas, filter corrupt data
- Location: `src/utils/storage.js`
- Functions: `validateSchema(data, schema)`, `validateTransaction()`, `validateUser()`, `validateDebt()`, `validateTontine()`, `filterValidRecords()`

**CrossPlatformPager:**
- Purpose: Swipeable page view with platform-specific implementation (Animated PanResponder on web, `react-native-pager-view` on native)
- Location: `src/view/components/CrossPlatformPager.js` (web) and `CrossPlatformPager.native.js` (native)
- Pattern: `.js` + `.native.js` platform-specific file convention used by Metro bundler

**Double-Entry Accounting Subsystem:**
- Purpose: Formal bookkeeping with journal entries, general ledger, trial balance, financial statements
- Location: `src/model/accounting/` + `src/viewmodel/AccountingContext.js` + `src/view/screens/Accounting/`
- Follows SYSCOHADA chart of accounts (OHADA accounting system), classes 1–8

## Entry Points

**Application Entry:**
- Location: `index.js`
- Triggers: App launch (Expo `registerRootComponent(App)`)
- Responsibilities: Registers root component, loads `App.js`

**App Root Component:**
- Location: `App.js`
- Responsibilities: Provider nesting (SafeAreaProvider → AuthProvider → FinanceProvider → DebtProvider → TontineProvider → AccountingProvider → RootNavigator), onboarding gate, auth gate, custom tab pager layout

**Screen Entry Points (loaded by App.js):**
- `HomeScreen` — Main dashboard with balance summary, transaction list, search, multi-select delete
- `AddTransactionScreen` — Transaction creation/editing form
- `StatsScreen` — Charts and statistics with filtering
- `SettingsScreen` — Profile, theme, language, currency, budget, PIN, Debts/Tontines/Accounting sub-screens
- `LoginScreen` / `RegisterScreen` — Authentication
- `OnboardingScreen` — First-launch walkthrough

## Architectural Constraints

- **Threading:** Single-threaded (React Native JS thread). All AsyncStorage operations are async but non-blocking to the UI via the native bridge.
- **Global state:** No module-level singletons except `LanguageManager` which has a mutable `currentLanguage` property (`src/utils/LanguageManager.js`), and `masterKey`/`keySalt` in `secureStorage.js` which are module-scoped variables.
- **Data scoping:** All user data uses key templates like ``@oraned_transactions_${userId}``. When `userId` changes (logout or switch account), FinanceContext clears local state and reloads for the new user.
- **No backend:** Entire application is offline-first with zero server dependencies. All data lives in AsyncStorage + expo-secure-store.
- **Navigation:** No React Navigation navigator objects. Uses `CrossPlatformPager`'s `setPage()` for tab switching, and modal overlays (`View` with `StyleSheet.absoluteFill`) for sub-screens (Debts, Tontines, Accounting). The `navigation` prop passed to screens is a mock object `{ navigate, goBack }`.

## Anti-Patterns

### Cross-Context State Access via Context Consumers

**What happens:** `DebtFormModal` (`src/view/components/DebtFormModal.js`) and `TontineFormModal` (`src/view/components/TontineFormModal.js`) call `useFinance()` just to get `isDark` and `accentColor` for styling, creating a dependency on FinanceContext from unrelated modules.
**Why it's wrong:** Creates unnecessary coupling — any change to FinanceContext forces re-renders of all modals. The modals should receive theme props or use a dedicated theme context.
**Do this instead:** Either pass `isDark`/`accentColor` as props, or create a lightweight `ThemeContext` separated from financial state.

### Inline Style Calculations Everywhere

**What happens:** Every screen defines a `colors` object derived from `isDark` and sometimes `accentColor`, then uses these inline:
```js
const colors = {
  bg: isDark ? '#0f1015' : '#f5f6fa',
  text: isDark ? '#ffffff' : '#131419',
  // ... repeated in 10+ files
};
```
**Why it's wrong:** Massive duplication. If a color changes, every file must be updated. Also, each screen creates a new `colors` object on every render.
**Do this instead:** Create a shared `useThemeColors()` hook in a utility file that all screens import from.

### Screen-as-Modal for Sub-Navigation

**What happens:** `SettingsScreen` renders `DebtsScreen`, `TontinesScreen`, and `AccountingDashboardScreen` as absolute-fill overlays (modal pattern) rather than using navigation stacks:
```js
{showDebts && (
  <View style={StyleSheet.absoluteFill}>
    <DebtsScreen onClose={() => setShowDebts(false)} />
  </View>
)}
```
**Why it's wrong:** Prevents deep linking, breaks accessibility, and means all sub-screens are mounted simultaneously (hidden by `showDebts` boolean). No back button support.
**Do this instead:** Use React Navigation stack navigators or proper modal presentation APIs.

### Context as Single Source of State with No Middleware

**What happens:** Context providers handle both state management AND persistence via `useEffect`. For example, `FinanceContext` has 10+ `useEffect` hooks for saving individual state values to AsyncStorage (`src/viewmodel/FinanceContext.js:360-416`).
**Why it's wrong:** Creates tight coupling between state updates and persistence. On rapid state changes, multiple write effects fire. No debouncing or batching.
**Do this instead:** Centralize persistence in a storage layer with debouncing, or use a reducer middleware pattern.

### Optional Dependency Imports with try/catch

**What happens:** Multiple files use try/catch blocks to optionally import packages (`expo-screen-capture`, `expo-notifications`, `expo-secure-store`, `@react-native-community/datetimepicker`):
```js
let Notifications;
try { Notifications = require('expo-notifications'); } catch (e) { Notifications = null; }
```
**Why it's wrong:** Opacity about dependencies, no clear documentation of which features are available in which environments.
**Do this instead:** Use `Platform.OS` checks and dependency injection, or declare optional peer dependencies in package.json.

## Error Handling

**Strategy:** Graceful degradation with console.error logging

**Patterns:**
- All AsyncStorage operations wrapped in `safeAsyncRead`/`safeAsyncWrite` with try/catch and fallback values
- `filterValidRecords()` silently removes corrupt records with `console.warn`
- Contexts catch errors in async operations (login, register, data loading) and surface via `console.error` with descriptive `[ContextName]` prefix
- UI-level errors displayed via `Alert.alert()` (e.g., login failure, PIN verification)
- PIN rate limiting is enforced server-side in-app with escalating lockout periods (30s → 5min → 1h)

## Cross-Cutting Concerns

**Logging:** All console logging uses `[ContextName]` or `[ModuleName]` prefix format (e.g., `[FinanceContext]`, `[AuthContext]`, `[safeAsyncRead]`, `[security]`). No structured logging library.

**Validation:** Schema-based validation in `src/utils/storage.js` — each data type has a schema object defining required fields, types, and custom validators. `filterValidRecords()` is called on data load from AsyncStorage to silently remove corrupted records.

**Authentication:** Email + password with SHA-256 iterative hashing (100 iterations for password, 1000 for PIN). Session persisted to `@AuthUser` key in AsyncStorage. Biometric authentication via `expo-local-authentication` on `ProfileSelectorScreen`. PIN code provides discrete mode unlock.

**Encryption:** AES-CBC encryption for sensitive data via `expo-secure-store` (master key) + Web Crypto API. Falls back to plain AsyncStorage if Web Crypto is unavailable. PIN hashes stored in expo-secure-store directly.

**Theming:** 3 theme modes (Dark/Clair/Système) stored in AsyncStorage as `@user_theme`. 20 accent colors. Theme resolved by `resolveIsDark()` in `ThemeModel.js`. Each screen computes its own color palette from `isDark` boolean.

**Internationalization:** 61 languages supported via auto-generated `LanguageManager.js` with translation objects. Translations loaded from a large JS object in `src/utils/LanguageManager.js`. Language persisted as `@app_language`.

---

*Architecture analysis: 2026-07-03*
