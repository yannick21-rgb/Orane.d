export const XP_REWARDS = {
  ADD_TRANSACTION: 5,
  CATEGORIZE: 5,
  DEBT_REIMBURSED_ON_TIME: 15,
  TONTINE_ROUND_PAID_ON_TIME: 10,
  CHALLENGE_C1: 30,
  CHALLENGE_C2: 25,
  CHALLENGE_C3: 20,
};

export function gamificationKey(userId) {
  return `@oraned_gamification_${userId}`;
}

export function levelThreshold(level) {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level, 1.5));
}

export function computeLevel(totalXp) {
  let xp = Math.max(0, Math.floor(totalXp || 0));
  let level = 1;
  while (xp >= levelThreshold(level + 1)) level += 1;
  const currentThreshold = levelThreshold(level);
  const nextThreshold = levelThreshold(level + 1);
  const xpInCurrentLevel = xp - currentThreshold;
  const xpToNextLevel = nextThreshold - currentThreshold;
  const progress = xpToNextLevel > 0 ? xpInCurrentLevel / xpToNextLevel : 1;
  return { level, xpInCurrentLevel, xpToNextLevel, progress, totalXp: xp, nextLevelXp: nextThreshold };
}

export function weekKeyFor(date) {
  const d = new Date(date);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const day = Math.floor((d - jan1) / 86400000);
  const week = Math.ceil((day + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function monthKeyFor(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function dayKeyFor(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const BADGE_DEFS = [
  { id: 'first_expense', icon: '🎯', tKey: 'badge_first_expense', descKey: 'badge_first_expense_desc' },
  { id: 'organized_50', icon: '🗂️', tKey: 'badge_organized_50', descKey: 'badge_organized_50_desc' },
  { id: 'budget_master_3m', icon: '🏆', tKey: 'badge_budget_master', descKey: 'badge_budget_master_desc' },
  { id: 'balanced_3m', icon: '⚖️', tKey: 'badge_balanced_3m', descKey: 'badge_balanced_3m_desc' },
  { id: 'tontine_pro_6', icon: '🥁', tKey: 'badge_tontine_pro', descKey: 'badge_tontine_pro_desc' },
  { id: 'debts_in_check_5', icon: '✅', tKey: 'badge_debts_check', descKey: 'badge_debts_check_desc' },
  { id: 'level_5', icon: '⭐', tKey: 'badge_level_5', descKey: 'badge_level_5_desc' },
  { id: 'level_10', icon: '🔥', tKey: 'badge_level_10', descKey: 'badge_level_10_desc' },
];

export const STREAK_DEFS = [
  { key: 'budgetMastered', icon: '💰', tKey: 'streak_budget', descKey: 'streak_budget_desc' },
  { key: 'balancedMonth', icon: '⚖️', tKey: 'streak_balanced', descKey: 'streak_balanced_desc' },
  { key: 'categorization', icon: '🗂️', tKey: 'streak_categorization', descKey: 'streak_categorization_desc' },
  { key: 'weeklyReview', icon: '📅', tKey: 'streak_review', descKey: 'streak_review_desc', comingSoon: true },
];

export const CHALLENGE_DEFS = [
  { id: 'c1_add_15', icon: '📝', tKey: 'challenge_c1_title', descKey: 'challenge_c1_desc', target: 15, xpReward: XP_REWARDS.CHALLENGE_C1 },
  { id: 'c2_log_3days', icon: '📅', tKey: 'challenge_c2_title', descKey: 'challenge_c2_desc', target: 3, xpReward: XP_REWARDS.CHALLENGE_C2 },
  { id: 'c3_all_categorized', icon: '🗂️', tKey: 'challenge_c3_title', descKey: 'challenge_c3_desc', target: 7, xpReward: XP_REWARDS.CHALLENGE_C3 },
];

export function createInitialState() {
  return {
    v: 1,
    totalXp: 0,
    xpHistory: [],
    streaks: {
      budgetMastered: { current: 0, best: 0, lastKey: null },
      balancedMonth: { current: 0, best: 0, lastKey: null },
      categorization: { current: 0, best: 0, lastKey: null },
      weeklyReview: { current: 0, best: 0, lastKey: null },
    },
    badges: [],
    challenges: CHALLENGE_DEFS.map((d) => ({ ...d, progress: 0, status: 'active' })),
    weekKey: weekKeyFor(new Date()),
    rewarded: { debtIds: [], tontineKeys: [], challengeWeekKeys: [] },
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeGamificationState(raw) {
  const base = createInitialState();
  if (!raw || typeof raw !== 'object') return base;
  return {
    v: 1,
    totalXp: typeof raw.totalXp === 'number' ? raw.totalXp : 0,
    xpHistory: Array.isArray(raw.xpHistory) ? raw.xpHistory : [],
    streaks: {
      budgetMastered: raw.streaks?.budgetMastered || base.streaks.budgetMastered,
      balancedMonth: raw.streaks?.balancedMonth || base.streaks.balancedMonth,
      categorization: raw.streaks?.categorization || base.streaks.categorization,
      weeklyReview: raw.streaks?.weeklyReview || base.streaks.weeklyReview,
    },
    badges: Array.isArray(raw.badges) ? raw.badges : [],
    challenges: Array.isArray(raw.challenges) ? raw.challenges : base.challenges,
    weekKey: raw.weekKey || base.weekKey,
    rewarded: {
      debtIds: Array.isArray(raw.rewarded?.debtIds) ? raw.rewarded.debtIds : [],
      tontineKeys: Array.isArray(raw.rewarded?.tontineKeys) ? raw.rewarded.tontineKeys : [],
      challengeWeekKeys: Array.isArray(raw.rewarded?.challengeWeekKeys) ? raw.rewarded.challengeWeekKeys : [],
    },
    updatedAt: raw.updatedAt || base.updatedAt,
  };
}
