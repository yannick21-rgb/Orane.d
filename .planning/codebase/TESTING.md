# Testing Patterns

**Analysis Date:** 2026-07-03

## Test Framework

**Runner:**
- **Not detected** — No test runner is configured in the project
- No `jest.config.*`, `vitest.config.*`, or other test runner config files found
- `package.json` has no test scripts defined:
  ```json
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  }
  ```
- No test-related dependencies in `package.json` (no Jest, Vitest, Mocha, Jasmine, etc.)

**Assertion Library:**
- Not applicable — no test runner means no assertion library installed or configured

**Run Commands:**
- No test commands available — the project has no testing infrastructure

## Test File Organization

**Location:**
- No test files found anywhere in the repository
- No `__tests__/` directories exist in `src/` or any other directory
- No `*.test.js` or `*.spec.js` files exist in the entire codebase

**Naming:**
- No test naming conventions established — no test files exist

**Structure:**
```
src/
├── model/       # No __tests__/ or *.test.js
├── service/     # No __tests__/ or *.test.js
├── utils/       # No __tests__/ or *.test.js
├── viewmodel/   # No __tests__/ or *.test.js
└── view/        # No __tests__/ or *.test.js
```

## Test Structure

**Suite Organization:**
- No test suites exist — no patterns established

**Patterns:**
- No setup/teardown patterns established
- No assertion patterns established

## Mocking

**Framework:**
- Not applicable — no mocking framework installed or configured

**Patterns:**
- No mocking patterns established

**What to Mock (recommended based on codebase architecture):**
- `AsyncStorage` (`@react-native-async-storage/async-storage`) — used for all persistence
- `expo-secure-store` — encrypted storage for master key and PIN hashes
- `expo-crypto` — cryptographic operations (hashing, random bytes)
- `expo-notifications` — scheduling/canceling notifications
- `expo-file-system` and `expo-sharing` — CSV export
- React Navigation — navigation prop for screens
- Context hooks (`useAuth`, `useFinance`, etc.) for isolated component testing

**What NOT to Mock:**
- Pure utility functions (`toNumber`, `formatDate`, `computeTransferFee`) — should be tested directly
- Model constants and data structures
- Validation schema logic

## Fixtures and Factories

**Test Data:**
- No test fixtures or factories exist in the codebase
- Candidate fixtures based on model patterns:
  - `TransactionModel.js` — EXPENSE_CATEGORIES, INCOME_CATEGORIES, NETWORKS constants
  - `DebtModel.js` — `createDebt()` factory function
  - `TontineModel.js` — `generateRounds()` factory function
  - `UserModel.js` — `createUser()` and `createAuthUser()` factory functions

**Location:**
- No fixtures directory exists

## Coverage

**Requirements:**
- No coverage requirements — no coverage tooling configured
- No `.nycrc`, `istanbul`, or `c8` configuration

**View Coverage:**
- Not applicable

## Test Types

**Unit Tests:**
- **Not present** — No unit tests exist
- Highest-value targets for unit tests:
  - `src/utils/format.js` — `toNumber()`, `toCurrency()` — pure functions
  - `src/utils/transactionDates.js` — `isTransactionInDay`, `isTransactionInLastNDays`, etc.
  - `src/utils/transactionTotals.js` — `computeIncomeExpenseTotals`
  - `src/utils/storage.js` — `safeJSONParse`, `validateSchema`, `filterValidRecords`
  - `src/model/TransactionModel.js` — `computeTransferFee`, `normalizeType`, `isRealExpense`
  - `src/model/DebtModel.js` — `createDebt`, `computeDebtStatus`
  - `src/model/TontineModel.js` — `generateRounds`, `computeTontineSummary`
  - `src/utils/security.js` — `hashPin`, `verifyPin`, `checkPinRateLimit`, `hashPassword`, `verifyPassword`

**Integration Tests:**
- **Not present** — No integration tests exist
- Highest-value targets:
  - Context providers and their interactions: `AuthContext` → `FinanceContext` → `DebtContext`
  - Storage → Context data flow: `safeAsyncReadJSON` → context initialization
  - AsyncStorage operations with encryption layer

**E2E Tests:**
- **Not present** — No E2E framework installed or configured
- The app is fully offline/local — E2E would require React Native Testing Library or Detox

## Where to Add Tests

**Recommended setup (based on Expo SDK 56 + React Native 0.85 + React 19):**

1. **Test runner:** Jest with `jest-expo` preset (recommended for Expo projects)
   ```
   npm install --save-dev jest @testing-library/react-native @testing-library/jest-native jest-expo
   ```

2. **Jest config** (`jest.config.js`):
   ```javascript
   module.exports = {
     preset: 'jest-expo',
     setupFilesAfterSetup: ['@testing-library/jest-native/extend-expect'],
     transformIgnorePatterns: [
       'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
     ],
   };
   ```

3. **Test script** for `package.json`:
   ```json
   "scripts": {
     "test": "jest",
     "test:watch": "jest --watch",
     "test:coverage": "jest --coverage"
   }
   ```

## Common Patterns to Establish

**For pure utility functions** (co-locate or use `__tests__/`):
```
src/utils/format.js
src/utils/__tests__/format.test.js
```

**Pattern for context tests:**
```javascript
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
}));

describe('AuthContext', () => {
  it('should start with no user', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });
    expect(result.current.user).toBeNull();
  });
});
```

**Pattern for component tests:**
```javascript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';

// Mock context hooks
jest.mock('../../viewmodel/FinanceContext', () => ({
  useFinance: () => ({
    transactions: [],
    isDark: false,
    accentColor: '#3b82f6',
    // ... other mock values
  }),
}));

describe('HomeScreen', () => {
  it('renders empty state', () => {
    const { getByText } = render(<HomeScreen navigation={{ navigate: jest.fn() }} />);
    expect(getByText(/aucune operation/i)).toBeTruthy();
  });
});
```

## Risk Assessment

**What is at risk without tests:**

| Area | Risk Level | Reason |
|------|-----------|--------|
| `src/utils/storage.js` | **Critical** | All data persistence flows through `safeAsyncRead/Write` — corruption here loses all user data |
| `src/utils/security.js` | **Critical** | PIN/password hashing — bugs could lock users out or compromise security |
| `src/viewmodel/FinanceContext.js` | **High** | Core state management (transactions, balances, budget) — regression affects all screens |
| `src/viewmodel/AuthContext.js` | **High** | Authentication flow (login, register, logout, user switching) |
| `src/model/TransactionModel.js` | **Medium** | Category data, transfer fee computation |
| `src/model/DebtModel.js` | **Medium** | Debt status computation |
| Screen components | **Medium** | UI rendering logic, navigation, user interactions |

---

*Testing analysis: 2026-07-03*
