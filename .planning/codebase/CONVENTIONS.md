# Coding Conventions

**Analysis Date:** 2026-07-03

## Naming Patterns

**Files:**
- PascalCase for React components/screens: `HomeScreen.js`, `AddTransactionScreen.js`, `DebtFormModal.js`
- PascalCase for platform-specific files with `.native.js` suffix: `CrossPlatformPager.native.js`, `CrossPlatformPager.js`
- camelCase for utility/model/service files: `storage.js`, `format.js`, `transactionDates.js`, `exportCSV.js`
- All source files use `.js` extension — no TypeScript anywhere in the codebase

**Functions:**
- camelCase always: `addTransaction`, `computeTransferFee`, `generateRounds`, `handleSave`
- Component functions use PascalCase: `function HomeScreen()`, `function MainTabs()`
- Arrow functions preferred for callbacks and handlers: `const handleSave = () => {...}`
- Context hooks use `use` prefix: `useFinance`, `useAuth`, `useDebts`, `useTontines`
- `export default function ComponentName` for screen/component files
- `export function utilityName` for utility/model functions (named exports)

**Variables:**
- camelCase: `totalIncome`, `isDark`, `accentColor`, `selectedIds`
- `const` preferred over `let` — `let` only for state that genuinely mutates
- Destructuring from context/hooks at top of component: `const { isDark, accentColor } = useFinance()`
- Boolean variables prefixed with `is`, `has`, `show`: `isDark`, `hasPinCode`, `showPinModal`, `isEditing`, `isDiscreteMode`, `isLoaded`

**Types:**
- No TypeScript types/interfaces used anywhere
- Models use object constants with `export const` at module level: `TRANSACTION_TYPES`, `DEBT_STATUS`, `WALLET_TYPES`
- Schema definitions for validation use plain objects with `type`, `required`, `validator` fields: `USER_SCHEMA`, `TRANSACTION_SCHEMA`

## Code Style

**Formatting:**
- No ESLint or Prettier configuration detected — no `.eslintrc`, `.prettierrc`, or `eslint.config.*` files found
- Code appears to follow default Expo/React formatting conventions
- 2-space indentation used consistently
- Single quotes for strings
- Semicolons used
- Trailing commas in multiline objects/arrays

**Linting:**
- No linter configured — no lint scripts in `package.json`, no lint config files found
- Unused imports occasionally present (e.g., `Svg` imports in `StatsScreen.js` with `Rect` commented as removed in source)

## Import Organization

**Order:**
1. React/external library imports (React, RN core, third-party)
2. Project source imports (model → utils → service → viewmodel → view components/screens)

**Pattern used throughout:**
```javascript
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useTranslation } from '../../utils/LanguageManager';
import { toNumber } from '../../utils/format';
import { computeIncomeExpenseTotals } from '../../utils/transactionTotals';
import { Trash2, CheckSquare } from 'lucide-react-native';
import PinAuthModal from '../components/PinAuthModal';
```

**Path Aliases:**
- No path aliases configured — all imports use relative paths (`../../viewmodel/FinanceContext`)
- Relative paths go up from current file location with `../` and `../../` prefix patterns

**Barrel Files:**
- Index barrel files exist in most layer directories:
  - `src/model/index.js` — re-exports all model constants and factories
  - `src/utils/index.js` — re-exports from `transactionDates`, `LanguageManager`, `format`
  - `src/service/index.js` — re-exports `exportTransactionsToCSV`
  - `src/viewmodel/index.js` — re-exports context providers and hooks
  - `src/view/components/index.js` — re-exports modal components
  - `src/view/screens/index.js` — re-exports all screens
- However, most screens import directly from the source file, not the barrel

**Soft Imports (try/catch pattern):**
```javascript
let Notifications;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  Notifications = null;
}
```
This pattern is used throughout for optional dependencies like `expo-notifications`, `expo-screen-capture`, `expo-secure-store`.

## Error Handling

**Patterns:**
- **Async errors** use try/catch with `console.error('[ContextName] Description :', err)` — the bracket-prefix pattern is consistent:
  ```javascript
  try {
    await someOperation();
  } catch (err) {
    console.error('[FinanceContext] Erreur de chargement :', err);
  }
  ```
- **User-facing errors** use `throw new Error('French message')` from context methods, caught with `Alert.alert()` in the screen
- **Storage operations** wrap in try/catch returning fallback values
- **Validation functions** (`validateSchema`, `validateUser`, etc.) return `{ valid, errors }` objects with French error messages
- **AsyncStorage reads** use wrapper functions that catch and return `fallback`:
  ```javascript
  export async function safeAsyncRead(key, fallback = null) {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw !== null ? raw : fallback;
    } catch (e) {
      console.error(`[safeAsyncRead] Erreur lecture ${key} :`, e.message);
      return fallback;
    }
  }
  ```
- **PIN verification error messages** are built progressively with escalating severity strings
- Some catch blocks silences errors with empty catch `catch (_) {}` or `catch (e) {}` — primarily in security polyfill/fallback code

## Logging

**Framework:** `console` only — no external logging library

**Patterns:**
- `console.error('[ContextName] Description :', err)` — for errors
- `console.warn('[moduleName] Description :', message)` — for warnings (unsupported features, validation failures)
- Some inline `.catch(console.error)` shorthand used in `FinanceContext.js` persistence effects
- Log prefix format: `[ModuleOrContextName]` + French message

## Comments

**When to Comment:**
- Minimal JSDoc/TSDoc — none found in the codebase
- French comments used for section headings and explanations
- Inline comments note bug fixes and changes: `// ✅ BUG #1 CORRIGÉ : ...`
- Commented-out code occasionally present (e.g., `// ✅ Supprimée au profit de checkBudgetPeriodAlert (voir addTransaction)` in `FinanceContext.js`)
- Model files are self-documenting with descriptive constant/variable names

**JSDoc/TSDoc:**
- Not used — no `/** ... */` blocks found

## Function Design

**Size:**
- Utility functions are small, single-purpose (5-20 lines)
- Context provider functions vary: setters are 1-5 lines, complex operations (login, register, unlockDiscreteMode) are 30-60 lines
- Screen components range from 150-565 lines, with render logic inline
- File sizes range from 13 lines (`service/index.js`) to 1101 lines (`SettingsScreen.js`)

**Parameters:**
- Named parameters via destructuring objects for complex functions: `function createDebt({ type, personName, amount, dueDate, note, reminderEnabled })`
- Simple parameters passed positionally: `function computeTransferFee(amount, networkKey)`
- Credentials passed as positional strings: `function login(email, password)`

**Return Values:**
- Utility/model functions return plain values or objects
- Context methods that mutate state return `void` or `Promise<void>` for fire-and-forget
- Validation functions return `{ valid: boolean, errors: string[] }`
- Context methods that need confirmation return `Promise<boolean>`

## Module Design

**Exports:**
- **Components/Screens**: `export default function ComponentName`
- **Contexts**: `export function ProviderName` + `export const useX = () => useContext(XContext)`
- **Models/Utilities**: `export const CONSTANT` and `export function fnName` (named exports)
- **Barrel files**: `export { named } from './source'` and `export { default as Named } from './source'`

**State Management:**
- All global state via React Context API (`createContext` + `useContext`)
- 5 context providers nested in `App.js`: `AuthProvider` → `FinanceProvider` → `DebtProvider` → `TontineProvider` → `AccountingProvider`
- Each context file exports a `Provider` component and a custom hook (`useX`)
- Local component state uses `useState` and `useRef`
- Derived state uses `useMemo`
- Async initialization uses `useEffect` with loading flags

**Context File Structure:**
```javascript
const XContext = createContext({});

export function XProvider({ children }) {
  const [state, setState] = useState(initialValue);
  // ... operations using useCallback
  return (
    <XContext.Provider value={{ state, operation1, operation2 }}>
      {children}
    </XContext.Provider>
  );
}

export const useX = () => useContext(XContext);
```

## UI & Style Conventions

**Component Structure (every screen file):**
```javascript
export default function ScreenName({ navigation }) {
  // 1. Hooks and context
  // 2. Local state
  // 3. Color object (computed from isDark)
  // 4. Derived data/computations
  // 5. Event handlers
  // 6. Render return
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // ...
});
```

**Color Pattern:**
Each screen defines a `colors` object inline based on theme:
```javascript
const colors = {
  bg:      isDark ? '#0f1015' : '#f5f6fa',
  card:    isDark ? '#16171f' : '#ffffff',
  text:    isDark ? '#ffffff' : '#131419',
  subText: isDark ? '#8c8e9b' : '#6a6c7a',
  input:   isDark ? '#1c1d28' : '#f0f1f6',
  border:  isDark ? '#2a2b38' : '#e8eaef',
};
```
Styles are applied inline with array syntax: `style={[styles.element, { color: colors.text }]}`

**Spacing Values Used:**
- Border radii: 8, 12, 14, 16, 18, 20, 24, 28
- Paddings: 4, 6, 8, 12, 14, 16, 20, 22, 24, 28, 30
- Font sizes: 11, 12, 13, 14, 15, 16, 17, 18, 20, 24, 28, 32, 36, 48

**Safe Area:**
- `SafeAreaView` from `react-native-safe-area-context` used consistently in screen components
- `useSafeAreaInsets` used in `App.js` for tab bar bottom padding

## Internationalization

**Translation System:**
- Custom `LanguageManager` in `src/utils/LanguageManager.js` — supports 60+ languages
- Translation keys use short French/English identifiers: `settings`, `home`, `add`, `stats`
- Hook: `const { t, currentLanguage, changeLanguage } = useTranslation()`
- Usage: `{t('home')}` — returns translated string or falls back to key
- Language-specific formatting in date display: locale mapped from `currentLanguage`

## Platform Abstraction

**Cross-platform files:**
- `CrossPlatformPager.js` (web — custom PanResponder-based pager)
- `CrossPlatformPager.native.js` (native — wraps `react-native-pager-view`)
- Expo automatically resolves `.native.js` on native platforms, `.js` as fallback

---

*Convention analysis: 2026-07-03*
