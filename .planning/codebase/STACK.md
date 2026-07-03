# Technology Stack

**Analysis Date:** 2026-07-03

## Languages

**Primary:**
- JavaScript (ECMAScript 2020+) - All application and logic code; no TypeScript usage detected.

**Secondary:**
- None detected — all source files are `.js` extension. No TypeScript, Kotlin, Swift, or other native languages found.

## Runtime

**Environment:**
- React Native via Expo SDK 56
- Node.js required for development (version not locked — no `.nvmrc` found)

**Package Manager:**
- npm (lockfile: `package-lock.json` present, lockfileVersion 3)

## Frameworks

**Core:**
- **Expo SDK ~56.0.12** — Managed workflow, shell app at `index.js` and `App.js`
- **React Native 0.85.3** — Core mobile framework
- **React 19.2.3** — UI component model
- **React DOM 19.2.3** — Web rendering support (`react-native-web`)

**Navigation:**
- `@react-navigation/native 7.2.5` — Navigation container
- `@react-navigation/bottom-tabs 7.16.2` — Tab navigation (custom wrapped in CrossPlatformPager)
- `@react-navigation/material-top-tabs 7.6.0` — Material-style tabs (installed but not used in main navigation)

**State Management:**
- React Context API via custom providers in `src/viewmodel/` (`AuthContext.js`, `FinanceContext.js`, `DebtContext.js`, `TontineContext.js`, `AccountingContext.js`). No Redux, Zustand, or other external state library.

**Testing:**
- **Not detected** — No test runner config files (`jest.config.*`, `vitest.config.*`), no test files (`*.test.js`, `*.spec.js`) found anywhere in the codebase.

## Key Dependencies

**Critical:**
- `@react-native-async-storage/async-storage ^2.2.0` — All persistent data storage (transactions, users, settings, debts, tontines, accounting entries)
- `expo-secure-store ~56.0.4` — Encrypted storage for master encryption key and PIN hashes
- `expo-crypto ~56.0.4` — Provides `getRandomBytes()` and `digestStringAsync()` for cryptographic operations
- `expo-notifications ~56.0.18` — Local push notifications for reminders, monthly reviews, debt/tontine due dates
- `expo-local-authentication ~56.0.4` — Biometric authentication support

**UI Components:**
- `lucide-react-native ^1.17.0` — Icon set
- `react-native-chart-kit ^6.12.3` — Charts/stats in `StatsScreen`
- `react-native-svg 15.15.4` — SVG rendering (required by chart-kit)
- `react-native-element-dropdown ^2.12.4` — Dropdown selectors (language, currency, country)
- `react-native-pager-view 8.0.1` — View pager (fallback native pager)
- `@react-native-community/datetimepicker ^9.1.0` — Native date/time picker

**Utilities:**
- `date-fns ^4.4.0` — Date comparison and manipulation in `src/utils/transactionDates.js`
- `expo-file-system ~56.0.8` — CSV export file writing
- `expo-sharing ~56.0.18` — System share sheet for CSV export
- `expo-screen-capture` (soft-imported in `App.js`, not in package.json) — Screen capture prevention

## Configuration

**Environment:**
- No `.env` files found. No environment variables used at runtime.
- Configuration is done via `safeAsyncRead`/`safeAsyncReadJSON` from AsyncStorage with key prefixes like `@user_theme`, `@accent_color`, `@devise`, `@app_language`, `@oraned_*`.

**Build:**
- `app.json` — Expo configuration (app name "Orane.d", slug "FinanceTracker", version 3.7.0, iOS/Android/web settings)
- `eas.json` — EAS Build profiles for development, preview, production
- No `babel.config.js` or `metro.config.js` found — uses Expo defaults

**Expo Plugins:**
- `app.json` specifies `expo-local-authentication` and `expo-notifications` plugins.

## Platform Requirements

**Development:**
- Node.js (version unspecified)
- Expo CLI (`npx expo start`)
- Android: Android Studio / emulator or physical device
- iOS: Xcode / simulator or physical device (macOS)

**Production:**
- Published via EAS Build (`eas build`) to Google Play Store / Apple App Store / Expo Go
- No server-side deployment required — fully offline client application

---

*Stack analysis: 2026-07-03*
