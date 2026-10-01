//
// AsyncStorage keys
//
export const STORAGE_KEYS = {
  ALL_USERS: '@oraned_all_users',
  AUTH_USER: '@AuthUser',
  THEME: '@user_theme',
  ACCENT_COLOR: '@accent_color',
  CURRENCY: '@devise',
  LANGUAGE: '@app_language',
  BUDGET_LIMIT: '@oraned_budget_limit',
  BUDGET_PERIOD: '@oraned_budget_period',
  REMINDER_HOUR: '@oraned_reminder_hour',
  REMINDER_MINUTE: '@oraned_reminder_minute',
  PIN: '@oraned_pin',
  TRANSACTIONS: '@oraned_transactions',
  ONBOARDING_SEEN: '@oraned_onboarding_seen',
};

export function transactionsKey(userId) {
  return `@oraned_transactions_${userId}`;
}

export function budgetLimitKey(userId) {
  return `@oraned_budget_limit_${userId}`;
}

export function pinKey(userId) {
  return `@oraned_pin_${userId}`;
}

export function debtsKey(userId) {
  return `@oraned_debts_${userId}`;
}

export function gamificationStorageKey(userId) {
  return `@oraned_gamification_${userId}`;
}

//
// Budget
//
export const BUDGET_PERIODS = ['day', 'week', 'month'];
export const DEFAULT_BUDGET_PERIOD = 'month';

//
// Reminder
//
export const DEFAULT_REMINDER_HOUR = 20;
export const DEFAULT_REMINDER_MINUTE = 0;

//
// App info
//
export const APP_NAME = 'Orane.d';
export const APP_VERSION = '3.7.0';
