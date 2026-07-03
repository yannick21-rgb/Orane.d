# Codebase Concerns

**Analysis Date:** 2026-07-03

## Tech Debt

### Monolithic LanguageManager (8054 lines, 61 languages)

- **Issue:** `src/utils/LanguageManager.js` is 8054 lines long — nearly half of the total source code (17,481 lines). It contains inline translations for 61 languages as a single auto-generated file.
- **Files:** `src/utils/LanguageManager.js`
- **Impact:** Any translation change requires editing an 8000+ line file. Developer productivity degrades; navigation in this file is extremely slow. The file consumes disproportionate memory at runtime since the entire translations object is loaded.
- **Fix approach:** Split translations into per-language files (e.g., `i18n/en.json`, `i18n/fr.json`) and lazy-load based on user locale. Use a lightweight i18n library instead of a custom manager.

### No test infrastructure (zero tests)

- **Issue:** There are zero test files — no unit, integration, or E2E tests anywhere in the codebase.
- **Files:** (entire `src/` tree)
- **Impact:** No regression protection. Refactoring security-sensitive code (encryption, auth, storage) is high-risk. Bugs in business logic (budget calculations, debt tracking, accounting double-entry) can go undetected.
- **Fix approach:** Add Jest/Expo testing infrastructure. Prioritize tests for `src/utils/security.js`, `src/utils/storage.js`, `src/model/accounting/` (financial calculations), and `src/viewmodel/` (state management).

### No TypeScript — plain JavaScript throughout

- **Issue:** The entire codebase uses plain JavaScript (`.js` files). No type checking exists.
- **Files:** All files under `src/`
- **Impact:** Runtime type errors are common. Refactoring is risky — renaming a field or changing a function signature has no compiler checks. The data models (`TransactionModel.js`, `DebtModel.js`, `TontineModel.js`) would benefit enormously from type definitions.
- **Fix approach:** Incrementally convert core models and utilities to TypeScript. At minimum, add JSDoc type annotations to critical functions in `src/utils/security.js` and `src/utils/storage.js`.

### Scattered storage key literals

- **Issue:** AsyncStorage keys are defined in `src/model/AppConstants.js` (`STORAGE_KEYS` object) but are also hardcoded as string literals across multiple files (`src/viewmodel/AuthContext.js`, `src/viewmodel/FinanceContext.js`, `src/viewmodel/AccountingContext.js`, `src/view/screens/SettingsScreen.js`, etc.).
- **Files:** `src/model/AppConstants.js`, `src/viewmodel/AuthContext.js`, `src/viewmodel/FinanceContext.js`, `src/viewmodel/AccountingContext.js`, `src/viewmodel/DebtContext.js`, `src/viewmodel/TontineContext.js`, `src/view/screens/SettingsScreen.js`
- **Impact:** Changes to storage keys require hunting down all occurrences. Some keys use `@oraned_` prefix while others use `@enc_` or `@AuthUser` — inconsistent naming convention.
- **Fix approach:** Centralize ALL storage keys in `AppConstants.js`. Remove all inline string literals. Add a key-generation utility function like `transactionsKey(userId)` pattern used for some keys.

### Duplicate normalizeType function

- **Issue:** `normalizeType()` is defined independently in both `src/model/TransactionModel.js` (line 75) and `src/viewmodel/FinanceContext.js` (line 17). Both implement the same logic.
- **Files:** `src/model/TransactionModel.js:75`, `src/viewmodel/FinanceContext.js:17`
- **Impact:** Maintaining two copies increases risk of divergence. Any change to type normalization must be replicated.
- **Fix approach:** Export from `TransactionModel.js` and import everywhere. Remove the duplicate from `FinanceContext.js`.

### Fragile CSV export

- **Issue:** The CSV export in `src/service/exportCSV.js` uses comma (`,`) as both the delimiter and the replacement character for sanitization. Category/description fields with commas get corrupted.
- **Files:** `src/service/exportCSV.js:10-21`
- **Impact:** If a transaction title or category contains a comma, the CSV structure breaks — columns shift, data becomes unreadable in spreadsheet software.
- **Fix approach:** Use a different delimiter (e.g., semicolon `;`) which is already used as the delimiter, or properly quote/escape fields with `"..."` wrapping per CSV spec.

### Direct AsyncStorage access bypassing safe wrappers

- **Issue:** `src/view/screens/SettingsScreen.js` uses `AsyncStorage.setItem` and `AsyncStorage.getItem` directly (lines 234-248) instead of the safe wrappers from `src/utils/storage.js`.
- **Files:** `src/view/screens/SettingsScreen.js:234-248`
- **Impact:** Bypasses error handling, JSON parsing safety, and write-verify pattern that the wrappers provide. Inconsistent storage access pattern.
- **Fix approach:** Replace with `safeAsyncRead`/`safeAsyncWrite` from `src/utils/storage.js`.

### Large static data arrays embedded in component

- **Issue:** `src/view/screens/SettingsScreen.js` contains hardcoded arrays of 197 countries (lines 31-116), 11 currencies (lines 118-130), and 61 languages (lines 132-199) — approximately 270 lines of static data baked into a component file.
- **Files:** `src/view/screens/SettingsScreen.js:31-199`
- **Impact:** Bloats the component file to 1101 lines. Makes the file harder to navigate. Data cannot be shared with other components if needed.
- **Fix approach:** Extract to separate data files under `src/model/` or `src/constants/`.

### No data migration strategy

- **Issue:** Schema migrations are handled ad-hoc throughout the codebase. Examples: checking legacy `@transactions` key (FinanceContext line 148), migrating old PIN format (FinanceContext line 175), migrating PIN to SecureStore (security.js line 187). There is no systematic migration versioning.
- **Files:** `src/viewmodel/FinanceContext.js:148-169`, `src/viewmodel/FinanceContext.js:175-183`, `src/utils/security.js:187-201`
- **Impact:** As the app evolves, migration logic accumulates in multiple places. Old migration code may never be cleaned up. New developers may not know which migration paths exist.
- **Fix approach:** Implement a schema version key (`@oraned_schema_version`) with numbered migration functions. Remove legacy migration paths after N versions.

## Security Considerations

### Crypto downgrade to plaintext is silent

- **Issue:** In `src/utils/secureStorage.js`, AES encryption/decryption silently falls back to storing/returning plaintext when the Web Crypto API is unavailable (lines 79-82, 94-97, 102-104, 114-117). The user is never notified.
- **Files:** `src/utils/secureStorage.js:78-98`, `src/utils/secureStorage.js:101-119`
- **Impact:** Users believe their financial data is encrypted when it may be stored in plaintext in AsyncStorage. Complete loss of confidentiality guarantee without any visible indication.
- **Fix approach:** Surface a visible warning to the user when encryption is unavailable. Consider making the app refuse to store sensitive data without encryption, or at minimum show a persistent banner.

### Math.random fallback in cryptoPolyfill is cryptographically insecure

- **Issue:** When `expo-crypto` is unavailable, `src/utils/cryptoPolyfill.js` falls back to `Math.floor(Math.random() * 256)` for random number generation (line 42). This is not cryptographically secure.
- **Files:** `src/utils/cryptoPolyfill.js:42`
- **Impact:** PIN salts, encryption IVs, and master keys generated with this fallback are predictable. An attacker who knows the approximate time of generation could brute-force the random values.
- **Fix approach:** Throw an error instead of silently degrading. The app should refuse to generate keys without secure randomness.

### Weak password hashing (only 100 iterations)

- **Issue:** `src/utils/security.js` uses only 100 iterations of SHA-256 for password hashing (line 173). This is extremely weak by modern standards.
- **Files:** `src/utils/security.js:169-173`
- **Impact:** 100 iterations of SHA-256 can be brute-forced at billions of hashes per second on consumer GPUs. A weak password could be cracked in seconds.
- **Fix approach:** Increase iterations to at least 100,000 (or use a proper KDF like PBKDF2/scrypt/bcrypt via a native module). Existing hashes will remain weak until users change passwords.

### Weak PIN hashing (1000 iterations)

- **Issue:** PIN hashing uses 1000 iterations of SHA-256 (line 29). While better than the password hashing, this is still weak for a 5-digit PIN (only 100,000 possible values).
- **Files:** `src/utils/security.js:29-35`
- **Impact:** A 5-digit PIN with 1000 SHA-256 iterations can be brute-forced in milliseconds to seconds on modern hardware. The PIN provides only a minimal security barrier.
- **Fix approach:** Use at least 100,000 iterations or PBKDF2. Apply constant-time comparison for PIN verification (current comparison via `===` is not constant-time).

### Module-level masterKey persists in memory

- **Issue:** `src/utils/secureStorage.js` stores the master encryption key in a module-level variable `masterKey` (line 17). It is never zeroed out, even after logout.
- **Files:** `src/utils/secureStorage.js:17, 208-210`
- **Impact:** The encryption key remains in the JavaScript heap for the lifetime of the app process. A memory dump or heap inspection could extract it. `resetSecureStorage` sets it to `null` but the old value may remain in memory.
- **Fix approach:** Use a WeakRef or at minimum overwrite with `''` before setting to `null`. Consider whether the key can be fetched from SecureStore on each operation instead of caching.

### PIN hash stored in AsyncStorage as fallback

- **Issue:** When `expo-secure-store` is unavailable, PIN hashes are stored in plain AsyncStorage via `storePinHash` fallback (security.js line 62-65). The salt is stored separately in AsyncStorage too.
- **Files:** `src/utils/security.js:57-67`
- **Impact:** The PIN hash and salt are stored in unencrypted AsyncStorage, which can be read by other apps on rooted/jailbroken devices or via backup extraction.
- **Fix approach:** Make SecureStore a hard requirement for PIN functionality. Disable PIN features if SecureStore is unavailable.

## Performance Bottlenecks

### Write storms from individual useEffect hooks

- **Issue:** `src/viewmodel/FinanceContext.js` has 8 separate `useEffect` hooks (lines 360-416) that each independently write a single state slice to AsyncStorage on every change. A single user action (e.g., changing theme + accent color) triggers multiple sequential AsyncStorage writes.
- **Files:** `src/viewmodel/FinanceContext.js:360-416`
- **Impact:** Increased battery drain and UI jank on lower-end devices. AsyncStorage writes are I/O operations that should be batched.
- **Fix approach:** Consolidate user preferences into a single JSON object persisted with one `useEffect`. Use a debounced write pattern for transactions.

### All data loaded into memory on startup

- **Issue:** `src/viewmodel/FinanceContext.js`, `src/viewmodel/DebtContext.js`, `src/viewmodel/TontineContext.js`, and `src/viewmodel/AccountingContext.js` each load their entire dataset into React state on app start. For users with thousands of transactions, this creates memory pressure.
- **Files:** `src/viewmodel/FinanceContext.js:140-156`, `src/viewmodel/DebtContext.js:14-25`, `src/viewmodel/TontineContext.js:14-25`, `src/viewmodel/AccountingContext.js:38-55`
- **Impact:** Slow initial load times. High memory usage for power users. No pagination or lazy loading.
- **Fix approach:** Implement pagination for transaction lists. Use `useMemo` more aggressively (already used for wallet balances). Consider virtualized lists for transaction display.

### Duplicate notification scheduling on every data load

- **Issue:** `scheduleMonthlyReview()` is called in the `finally` block of `loadUserData()` (FinanceContext line 193), which runs every time `userId` changes. This schedules a new notification each time without canceling the previous one.
- **Files:** `src/viewmodel/FinanceContext.js:107-125, 193`
- **Impact:** Multiple duplicate notifications scheduled for the same event. Users may receive multiple reminders on the same day.
- **Fix approach:** Cancel existing monthly review notifications before scheduling a new one.

## Fragile Areas

### Legacy PIN migration chain

- **Issue:** PIN migration goes through multiple formats: plain PIN → `@oraned_pin_{userId}` → SecureStore, with fallback paths interleaved. The `loginToUser` function in `AuthContext.js` (line 56) still reads from the legacy `@oraned_pin_{userId}` key instead of using `getStoredPinHash`.
- **Files:** `src/viewmodel/AuthContext.js:42-86`, `src/viewmodel/FinanceContext.js:170-184`, `src/utils/security.js:187-201`
- **Impact:** Multiple code paths touch PIN storage with subtle differences. The `AuthContext.loginToUser` bypasses the migration logic in `FinanceContext.loadUserData`.
- **Fix approach:** Centralize all PIN read/write operations into `src/utils/security.js`. Remove legacy key reads from viewmodels.

### Accounting double-entry correctness depends on manual validation

- **Issue:** The accounting module validates that journal entries balance (debits = credits) at entry time via `validateJournalEntry` in `JournalEntry.js` (line 90). However, `updateEntry` in `AccountingContext.js` (line 82) applies changes without re-validating balance.
- **Files:** `src/model/accounting/JournalEntry.js:51-101`, `src/viewmodel/AccountingContext.js:82-89`
- **Impact:** Updating an existing journal entry could produce unbalanced books. The `postEntry` function re-validates (line 96-106), but `updateEntry` does not.
- **Fix approach:** Add validation in `updateEntry` before persisting. Or make entries immutable once posted (only allow reversal entries).

### Balance sheet omits Class 4 liability accounts

- **Issue:** `buildBalanceSheet` in `FinancialStatements.js` only collects liabilities from Class 1 accounts (line 24). Class 4 accounts (Tiers) contain liability accounts like `401 Fournisseurs`, `421 Personnel`, `441 État` which should appear on the balance sheet.
- **Files:** `src/model/accounting/FinancialStatements.js:9-36`
- **Impact:** Balance sheet understates liabilities, giving a misleading financial picture. Users relying on this for business decisions get incorrect data.
- **Fix approach:** Include Class 4 accounts in liabilities collection. Use account type (`liability`) instead of class ID to determine placement.

### Inconsistent try/catch coverage in state persistence effects

- **Issue:** The 8 persistence `useEffect` hooks in `FinanceContext.js` (lines 360-416) only `.catch()` errors but do not roll back state or notify the user. An AsyncStorage write failure silently drops data changes.
- **Files:** `src/viewmodel/FinanceContext.js:360-416`
- **Impact:** Users may change settings or add transactions that appear to succeed but are never persisted. After app restart, changes are lost without explanation.
- **Fix approach:** Surface write errors to the user. Consider a "save status" indicator. For critical writes (transactions), implement a retry mechanism.

### CrossPlatformPager behavioral differences

- **Issue:** `CrossPlatformPager` has two implementations: `.native.js` uses `react-native-pager-view` (native ViewPager), while the web `.js` version uses a custom `PanResponder`/`Animated` implementation. These may have different swipe gestures, animation curves, and edge cases.
- **Files:** `src/view/components/CrossPlatformPager.js`, `src/view/components/CrossPlatformPager.native.js`
- **Impact:** UI behavior differs across platforms. Edge swipes, page animations, and programmatic `setPage` calls may behave unexpectedly on one platform.
- **Fix approach:** Use a single cross-platform solution (e.g., the Animated implementation only, or `react-native-pager-view` with web polyfill).

### Duplicate fee transaction on transfer

- **Issue:** `AddTransactionScreen.handleSave()` calls `addTransaction` twice when `type === 'transfert'` and `computedFee > 0` (lines 118-146). The second call creates a fee transaction. These are two separate React state updates and two separate AsyncStorage writes.
- **Files:** `src/view/screens/AddTransactionScreen.js:118-146`
- **Impact:** If the first write succeeds and the second fails, the database is inconsistent — the transfer exists without its corresponding fee. No rollback mechanism.
- **Fix approach:** Make the fee a property of the transfer transaction rather than a separate record. Or batch both writes atomically.

## Known Bugs

### PIN rate limit is bypassed for existing users

- **Issue:** In `FinanceContext.unlockDiscreteMode` (line 225), rate limiting is checked but the stored hash is read via `getStoredPinHash`. If no hash exists (user has no PIN), the function returns `true` immediately (line 239-240), bypassing any rate limit even if the user previously had a PIN that was deleted.
- **Files:** `src/viewmodel/FinanceContext.js:225-259`
- **Impact:** A user without a PIN (or whose PIN data was corrupted) can bypass the discrete mode check entirely.

### Login uses old PIN key format

- **Issue:** `AuthContext.loginToUser` reads the PIN hash from `@oraned_pin_${id}` (line 56) instead of using `getStoredPinHash` which checks SecureStore first. New PINs created via `saveNewPin` are stored in SecureStore via `storePinHash`, so `loginToUser` won't find them.
- **Files:** `src/viewmodel/AuthContext.js:56`
- **Impact:** Users who created a PIN through the normal flow (HomeScreen → create PIN) cannot use it to log in via ProfileSelectorScreen. They will get "Code PIN incorrect" despite entering the correct PIN.

### Generic registration error hides root cause

- **Issue:** `RegisterScreen.handleRegister` catches all errors and shows `"Erreur lors de l'inscription."` (line 66-67), discarding the actual error message from the thrown exception.
- **Files:** `src/view/screens/RegisterScreen.js:63-69`
- **Impact:** If registration fails due to a network error, storage quota exceeded, or any other specific reason, the user sees a generic message with no actionable information.

### No validation that `handleCancel` is used before accessing `authUser`

- **Issue:** In `SettingsScreen`, `handleCancelEdit()` references `authUser` (line 294-296) which is destructured on line 299 — *after* the function is defined. Due to JavaScript hoisting rules for `const`, this works because the function is not called until after `authUser` is defined, but it appears as a reference-before-declaration and makes the code fragile.
- **Files:** `src/view/screens/SettingsScreen.js:293-297, 299`
- **Impact:** If the component structure is refactored and the function is called before the hook runs, this would crash with a ReferenceError.

## Test Coverage Gaps

- **What's not tested:** Entire codebase — zero test files.
- **Files:** (all)
- **Risk:** Any change to any module could break functionality without detection. Particularly critical: encryption (`src/utils/secureStorage.js`), authentication (`src/viewmodel/AuthContext.js`), financial calculations (`src/model/accounting/`), data validation (`src/utils/storage.js`).
- **Priority:** High

## Missing Critical Features

- **Data backup/restore:** No export/import for full app data (only CSV export of transactions). If the app is uninstalled or AsyncStorage is cleared, all data is lost.
- **Offline sync:** AsyncStorage provides no cross-device sync. Users on multiple devices cannot share data.
- **Input validation on financial amounts:** Transaction amounts are parsed with `toNumber()` which silently converts invalid input to 0, potentially creating zero-amount transactions that pollute reports.

## Dependencies at Risk

- **react-native-chart-kit** (`^6.12.3`): This library is poorly maintained and has known issues with newer React Native versions. The StatsScreen already documents fixed bugs related to this library (lines 11-12, 339-340). It uses `Svg` directly as a workaround for missing `Rect` exports.
  - Risk: May become incompatible with future React Native/Expo versions.
- **react-native-element-dropdown** (`^2.12.4`): Used in SettingsScreen. Known for performance issues with large datasets.
- **AsyncStorage** (via `@react-native-async-storage/async-storage`): Database of record for the entire app. No query capabilities, no encryption natively, no migration tooling. 10MB+ datasets will cause performance degradation.

---

*Concerns audit: 2026-07-03*
