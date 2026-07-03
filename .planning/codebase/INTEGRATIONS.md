# External Integrations

**Analysis Date:** 2026-07-03

## APIs & External Services

**No external HTTP APIs or cloud services are consumed.**
The application is fully offline. All data is stored locally on-device with no network calls to third-party backends.

- No REST APIs consumed
- No GraphQL endpoints
- No external SDK integrations (no Stripe, no Supabase, no Firebase, no AWS)
- No analytics services (no Google Analytics, no Sentry, no Crashlytics)

## Data Storage

**Databases:**
- **None** — No SQLite, no Realm, no WatermelonDB, no remote database.
- All data is stored via `@react-native-async-storage/async-storage` as JSON strings keyed by user-specific prefixes.

**AsyncStorage keys in use (all local):**

| Key Pattern | Purpose | Module |
|---|---|---|
| `@oraned_all_users` | User registry (email, name, hashed password) | `AuthContext.js`, `storage.js` |
| `@AuthUser` | Currently authenticated user | `AuthContext.js` |
| `@oraned_transactions_{userId}` | Financial transactions | `FinanceContext.js` |
| `@oraned_budget_limit_{userId}` | Budget limit per user | `FinanceContext.js` |
| `@oraned_debts_{userId}` | Debts/loans records | `DebtContext.js` |
| `@oraned_tontines_{userId}` | Tontine/savings groups | `TontineContext.js` |
| `@oraned_accounting_entries_{userId}` | Double-entry accounting entries | `AccountingContext.js` |
| `@oraned_accounting_period_{userId}` | Fiscal period setting | `AccountingContext.js` |
| `@oraned_rate_limit_{userId}` | PIN brute force rate limiting | `security.js` |
| `@user_theme`, `@accent_color`, `@devise`, `@app_language` | User preferences | `FinanceContext.js` |
| `@oraned_budget_period`, `@oraned_reminder_hour`, `@oraned_reminder_minute` | Budget + reminder config | `FinanceContext.js` |
| `@oraned_onboarding_seen` | Onboarding completion flag | `App.js` |
| `@oraned_accounts_index` | Multi-account index | `AuthContext.js` |
| `@pays` | Country preference | `SettingsScreen.js` |

**File Storage:**
- Local filesystem only, via `expo-file-system`. Used exclusively for CSV export — transactions are written to `FileSystem.cacheDirectory` and shared via the share sheet.

**Caching:**
- **None** — No remote data to cache. All data is local by design.

## Authentication & Identity

**Auth Provider:**
- **Custom, fully local** — No Firebase Auth, Auth0, Supabase Auth, or OAuth providers.
- Authentication is password-based with SHA-256 iterative hashing (salt + 100 iterations).
- Users are stored in AsyncStorage key `@oraned_all_users` as unencrypted JSON objects with hashed passwords.
- PIN code (5-digit) provides additional app-level security with AES-CBC encryption via `expo-secure-store` and `expo-crypto`.

**Implementation files:**
- `src/viewmodel/AuthContext.js` — Auth state management (login, register, switch account, logout)
- `src/utils/security.js` — Password hashing (`hashPassword`, `verifyPassword`), PIN hashing (`hashPin`, `verifyPin`), rate limiting (`checkPinRateLimit`, `recordFailedPinAttempt`)
- `src/utils/secureStorage.js` — AES-CBC encryption layer using Web Crypto API polyfilled via `expo-crypto`

## Monitoring & Observability

**Error Tracking:**
- **None** — No Sentry, no Crashlytics, no Datadog, no LogRocket. Only `console.error` / `console.warn` statements throughout the codebase.

**Logs:**
- `console.log` / `console.warn` / `console.error` used ad-hoc throughout context providers and utilities. No structured logging library.

## CI/CD & Deployment

**Hosting:**
- **None** — The app is a standalone mobile application (no server hosting). Published via Expo EAS Build to app stores.
- Web version: `react-native-web` enables web export via `expo start --web`; a prebuilt `dist/` directory exists for web deployment.

**CI Pipeline:**
- **None detected** — No GitHub Actions, no `.gitlab-ci.yml`, no `jenkins` config found.

## Environment Configuration

**Required env vars:**
- **None** — The application has zero runtime environment variable dependencies.

**Secrets location:**
- Master encryption key is stored in `expo-secure-store` under key `orane_master_key` (generated at runtime, persisted across app restarts).
- PIN hashes are stored in `expo-secure-store` per-user (with AsyncStorage fallback).
- No external secrets (API keys, tokens, passwords) are used.

## Webhooks & Callbacks

**Incoming:**
- **None** — No webhook endpoints. The app has no HTTP server.

**Outgoing:**
- **None** — No webhooks or callbacks sent to external services.

## Notifications

**Local Only:**
- `expo-notifications` is used exclusively for **local** push notifications (no remote/push notification service):
  - Daily reminder: "Pense à enregistrer tes dépenses du jour !" (`FinanceContext.js:updateDailyReminderTime`)
  - Monthly review: "Découvre ton bilan financier du mois !" (`FinanceContext.js:scheduleMonthlyReview`)
  - Debt due date reminders (`DebtContext.js:scheduleDueDateNotification`)
  - Tontine round reminders (`TontineContext.js:scheduleRoundNotifications`)

## Biometrics

- `expo-local-authentication` is installed and `expo-screen-capture` is soft-imported for screen capture prevention (`App.js:usePreventScreenCapture`).

---

*Integration audit: 2026-07-03*
