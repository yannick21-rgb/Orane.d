import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useFinance } from './FinanceContext';
import { useDebts } from './DebtContext';
import { useTontines } from './TontineContext';
import { safeAsyncReadJSON, safeAsyncWriteJSON } from '../utils/storage';
import {
  XP_REWARDS,
  gamificationKey,
  computeLevel,
  createInitialState,
  normalizeGamificationState,
  weekKeyFor,
  monthKeyFor,
  dayKeyFor,
  BADGE_DEFS,
  CHALLENGE_DEFS,
} from '../model/GamificationModel';
import { toNumber } from '../utils/format';
import { normalizeType } from '../model/TransactionModel';

const GamificationContext = createContext({});

function monthKeysBetween(startKey, endKey) {
  const [sy, sm] = startKey.split('-').map(Number);
  const [ey, em] = endKey.split('-').map(Number);
  const keys = [];
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return keys;
}

function computeMonthStats(transactions, budgetLimit) {
  const monthExpense = {};
  const monthIncome = {};
  const monthDays = {};
  (transactions || []).forEach((t) => {
    if (!t || !t.date) return;
    const mk = monthKeyFor(t.date);
    const dk = dayKeyFor(t.date);
    const type = normalizeType(t.type);
    const amt = toNumber(t.amount);
    if (type === 'depense') {
      monthExpense[mk] = (monthExpense[mk] || 0) + amt;
      if (!monthDays[mk]) monthDays[mk] = {};
      if (!monthDays[mk][dk]) monthDays[mk][dk] = [];
      monthDays[mk][dk].push(t);
    } else if (type === 'revenu') {
      monthIncome[mk] = (monthIncome[mk] || 0) + amt;
    }
  });
  return { monthExpense, monthIncome, monthDays };
}

function computeStreakAnnual(keys, isGood) {
  if (!keys.length) return { current: 0, best: 0, lastKey: null };
  const sorted = [...keys].sort();
  let best = 0, current = 0, lastKey = null;
  let run = 0;
  let prevGood = false;
  for (const k of sorted) {
    if (isGood(k)) {
      run = prevGood ? run + 1 : 1;
      best = Math.max(best, run);
      lastKey = k;
      prevGood = true;
    } else {
      run = 0;
      prevGood = false;
    }
  }
  const last = sorted[sorted.length - 1];
  if (isGood(last)) current = run;
  else current = 0;
  return { current, best, lastKey: isGood(last) ? lastKey : null };
}

function computeCategorizationStreak(transactions) {
  const dayMap = {};
  (transactions || []).forEach((t) => {
    if (!t || !t.date) return;
    if (normalizeType(t.type) !== 'depense') return;
    const dk = dayKeyFor(t.date);
    if (!dayMap[dk]) dayMap[dk] = [];
    dayMap[dk].push(t);
  });
  const days = Object.keys(dayMap).sort();
  if (!days.length) return { current: 0, best: 0, lastKey: null };
  const isCategorized = (dk) => dayMap[dk].every((tx) => tx.category && tx.category !== 'Autres' && String(tx.category).trim() !== '');
  const dayKeys = days;
  let best = 0, run = 0, current = 0;
  let prevGood = false;
  let lastKey = null;
  for (let i = 0; i < dayKeys.length; i++) {
    const dk = dayKeys[i];
    const good = isCategorized(dk);
    if (good) {
      run = prevGood ? run + 1 : 1;
      best = Math.max(best, run);
      lastKey = dk;
      prevGood = true;
    } else {
      run = 0;
      prevGood = false;
    }
  }
  const lastDay = dayKeys[dayKeys.length - 1];
  if (isCategorized(lastDay)) {
    const todayKey = dayKeyFor(new Date());
    if (lastDay === todayKey) current = run;
    else current = run;
  } else current = 0;
  if (!isCategorized(lastDay)) lastKey = null;
  return { current, best, lastKey };
}

function computeBudgetStreak(transactions, budgetLimit) {
  if (!budgetLimit || budgetLimit <= 0) return { current: 0, best: 0, lastKey: null };
  const { monthExpense } = computeMonthStats(transactions, budgetLimit);
  const allMonths = Object.keys(monthExpense).sort();
  if (!allMonths.length) return { current: 0, best: 0, lastKey: null };
  const curMonth = monthKeyFor(new Date());
  const earliest = allMonths[0];
  const keys = monthKeysBetween(earliest, curMonth);
  const isGood = (k) => (monthExpense[k] || 0) <= budgetLimit;
  return computeStreakAnnual(keys, isGood);
}

function computeBalancedStreak(transactions) {
  const { monthExpense, monthIncome } = computeMonthStats(transactions, 0);
  const allMonths = new Set([...Object.keys(monthExpense), ...Object.keys(monthIncome)]);
  const sorted = [...allMonths].sort();
  if (!sorted.length) return { current: 0, best: 0, lastKey: null };
  const curMonth = monthKeyFor(new Date());
  const earliest = sorted[0];
  const keys = monthKeysBetween(earliest, curMonth);
  const isGood = (k) => (monthExpense[k] || 0) <= (monthIncome[k] || 0);
  return computeStreakAnnual(keys, isGood);
}

function computeChallengeProgress(transactions, weekKey) {
  const wk = weekKey;
  const weekTx = (transactions || []).filter((t) => t && t.date && weekKeyFor(t.date) === wk);
  const c1Progress = weekTx.length;
  const daysSet = new Set(weekTx.map((t) => dayKeyFor(t.date)));
  const c2Progress = daysSet.size;
  const dayExpenseMap = {};
  weekTx.forEach((t) => {
    if (normalizeType(t.type) !== 'depense') return;
    const dk = dayKeyFor(t.date);
    if (!dayExpenseMap[dk]) dayExpenseMap[dk] = [];
    dayExpenseMap[dk].push(t);
  });
  const dayKeys = Object.keys(dayExpenseMap);
  let c3Progress = 0;
  dayKeys.forEach((dk) => {
    const allCat = dayExpenseMap[dk].every((tx) => tx.category && String(tx.category).trim() !== '' && tx.category !== 'Autres');
    if (allCat) c3Progress += 1;
  });
  if (!dayKeys.length) c3Progress = 0;
  return { c1_add_15: c1Progress, c2_log_3days: c2Progress, c3_all_categorized: c3Progress };
}

function evaluateBadges(state, transactions, debts, groups) {
  const level = computeLevel(state.totalXp).level;
  const organizedCount = (transactions || []).filter((t) => t && normalizeType(t.type) === 'depense' && t.category && String(t.category).trim() !== '').length;
  const tontinePaidCount = (groups || []).reduce((s, g) => s + (g.rounds || []).filter((r) => r.status === 'PAYE').length, 0);
  const debtsReimbursedCount = (debts || []).filter((d) => d.status === 'REMBOURSEE').length;
  const checks = {
    first_expense: (transactions || []).some((t) => t && normalizeType(t.type) === 'depense'),
    organized_50: organizedCount >= 50,
    budget_master_3m: (state.streaks?.budgetMastered?.current || 0) >= 3,
    balanced_3m: (state.streaks?.balancedMonth?.current || 0) >= 3,
    tontine_pro_6: tontinePaidCount >= 6,
    debts_in_check_5: debtsReimbursedCount >= 5,
    level_5: level >= 5,
    level_10: level >= 10,
  };
  return BADGE_DEFS.filter((b) => checks[b.id]).map((b) => b.id);
}

export function GamificationProvider({ children }) {
  const { userId } = useAuth();
  const { transactions, budgetLimit, isUserDataLoaded } = useFinance();
  const { debts } = useDebts();
  const { groups } = useTontines();

  const [state, setState] = useState(createInitialState());
  const [loaded, setLoaded] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const saveRef = useRef(null);
  const prevUserId = useRef(null);

  const pushNote = useCallback((note) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setNotifications((prev) => [...prev, { id, ...note }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 2800);
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const recomputeDerived = useCallback((baseState, txs, bl, ds, gs) => {
    const budgetStreak = computeBudgetStreak(txs, bl);
    const balancedStreak = computeBalancedStreak(txs);
    const catStreak = computeCategorizationStreak(txs);
    const wk = weekKeyFor(new Date());
    const progress = computeChallengeProgress(txs, wk);
    let challenges = baseState.challenges;
    if (baseState.weekKey !== wk) {
      challenges = CHALLENGE_DEFS.map((d) => ({ ...d, progress: progress[d.id] || 0, status: (progress[d.id] || 0) >= d.target ? 'done' : 'active' }));
    } else {
      challenges = baseState.challenges.map((c) => {
        const p = progress[c.id] || 0;
        const done = p >= c.target;
        if (c.status === 'done') return { ...c, progress: p };
        return { ...c, progress: p, status: done ? 'done' : 'active' };
      });
    }
    const streaks = {
      budgetMastered: budgetStreak,
      balancedMonth: balancedStreak,
      categorization: catStreak,
      weeklyReview: baseState.streaks?.weeklyReview || { current: 0, best: 0, lastKey: null },
    };
    const withStreaks = { ...baseState, streaks, challenges, weekKey: wk };
    const badgeIds = evaluateBadges(withStreaks, txs, ds, gs);
    const existing = new Set((withStreaks.badges || []).map((b) => b.id));
    const newBadges = badgeIds.filter((id) => !existing.has(id)).map((id) => ({ id, unlockedAt: new Date().toISOString() }));
    const badges = [...(withStreaks.badges || []), ...newBadges];
    return { nextState: { ...withStreaks, badges }, newBadges };
  }, []);

  useEffect(() => {
    if (!userId) {
      setState(createInitialState());
      setLoaded(false);
      prevUserId.current = null;
      return;
    }
    if (prevUserId.current === userId && loaded) return;
    prevUserId.current = userId;
    const load = async () => {
      try {
        const raw = await safeAsyncReadJSON(gamificationKey(userId), null);
        if (raw) {
          const normalized = normalizeGamificationState(raw);
          const { nextState } = recomputeDerived(normalized, transactions || [], budgetLimit, debts || [], groups || []);
          setState(nextState);
        } else {
          const init = createInitialState();
          const { nextState } = recomputeDerived(init, transactions || [], budgetLimit, debts || [], groups || []);
          setState(nextState);
          await safeAsyncWriteJSON(gamificationKey(userId), nextState);
        }
      } catch (e) {
        console.error('[Gamification] load error', e);
      } finally {
        setLoaded(true);
      }
    };
    if (isUserDataLoaded) load();
  }, [userId, isUserDataLoaded]);

  useEffect(() => {
    if (!userId || !loaded) return;
    const { nextState, newBadges } = recomputeDerived(state, transactions || [], budgetLimit, debts || [], groups || []);
    const changed =
      JSON.stringify(nextState.streaks) !== JSON.stringify(state.streaks) ||
      JSON.stringify(nextState.challenges.map((c) => ({ id: c.id, progress: c.progress, status: c.status }))) !==
        JSON.stringify(state.challenges.map((c) => ({ id: c.id, progress: c.progress, status: c.status }))) ||
      nextState.weekKey !== state.weekKey ||
      newBadges.length > 0;
    if (changed) {
      setState(nextState);
    }
  }, [transactions, budgetLimit, debts, groups]);

  useEffect(() => {
    if (!userId || !loaded) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      safeAsyncWriteJSON(gamificationKey(userId), { ...state, updatedAt: new Date().toISOString() }).catch(() => {});
    }, 400);
    return () => { if (saveRef.current) clearTimeout(saveRef.current); };
  }, [state, userId, loaded]);

  const awardXp = useCallback(async (amount, reason) => {
    if (!userId || !amount) return null;
    const prevLevel = computeLevel(state.totalXp).level;
    const nextTotal = (state.totalXp || 0) + amount;
    const nextLevelInfo = computeLevel(nextTotal);
    const leveledUp = nextLevelInfo.level > prevLevel;
    const newHistory = [...(state.xpHistory || []), { date: new Date().toISOString(), amount, reason }];
    if (newHistory.length > 80) newHistory.splice(0, newHistory.length - 80);
    let nextState = { ...state, totalXp: nextTotal, xpHistory: newHistory };
    const { nextState: withDerived, newBadges } = recomputeDerived(nextState, transactions || [], budgetLimit, debts || [], groups || []);
    nextState = withDerived;
    const pendingChallenges = withDerived.challenges.filter((c) => c.status === 'done' && !withDerived.rewarded.challengeWeekKeys.includes(`${withDerived.weekKey}:${c.id}`));
    if (pendingChallenges.length) {
      let bonus = 0;
      const newKeys = [...withDerived.rewarded.challengeWeekKeys];
      pendingChallenges.forEach((c) => {
        bonus += c.xpReward;
        newKeys.push(`${withDerived.weekKey}:${c.id}`);
      });
      if (bonus > 0) {
        nextState.totalXp += bonus;
        nextState.xpHistory = [...nextState.xpHistory, ...pendingChallenges.map((c) => ({ date: new Date().toISOString(), amount: c.xpReward, reason: `challenge:${c.id}` }))];
        pendingChallenges.forEach((c) => pushNote({ kind: 'challenge', title: '+ ' + c.xpReward + ' XP', subtitle: 'Défi terminé !', icon: c.icon }));
      }
      nextState.rewarded = { ...nextState.rewarded, challengeWeekKeys: newKeys };
    }
    setState(nextState);
    await safeAsyncWriteJSON(gamificationKey(userId), nextState).catch(() => {});
    pushNote({ kind: 'xp', title: `+${amount} XP`, subtitle: reason || '', icon: '⭐' });
    if (leveledUp) pushNote({ kind: 'level', title: `Niveau ${nextLevelInfo.level} !`, subtitle: `${nextLevelInfo.totalXp} XP`, icon: '🎉' });
    newBadges.forEach((b) => {
      const def = BADGE_DEFS.find((d) => d.id === b.id);
      pushNote({ kind: 'badge', title: def ? def.icon + ' Badge débloqué' : 'Badge débloqué', subtitle: b.id, icon: def?.icon || '🏅' });
    });
    return { leveledUp, newBadges, nextLevelInfo };
  }, [state, userId, transactions, budgetLimit, debts, groups, recomputeDerived, pushNote]);

  const awardDebtReimbursed = useCallback(async (debtId) => {
    if (!userId || state.rewarded.debtIds.includes(debtId)) return;
    const nextRewarded = { ...state.rewarded, debtIds: [...state.rewarded.debtIds, debtId] };
    setState((prev) => ({ ...prev, rewarded: nextRewarded }));
    await awardXp(XP_REWARDS.DEBT_REIMBURSED_ON_TIME, 'Dette remboursée à temps');
  }, [state.rewarded, userId, awardXp]);

  const awardTontineRound = useCallback(async (groupId, roundNumber) => {
    const key = `${groupId}:${roundNumber}`;
    if (!userId || state.rewarded.tontineKeys.includes(key)) return;
    const nextRewarded = { ...state.rewarded, tontineKeys: [...state.rewarded.tontineKeys, key] };
    setState((prev) => ({ ...prev, rewarded: nextRewarded }));
    await awardXp(XP_REWARDS.TONTINE_ROUND_PAID_ON_TIME, 'Tontine payée à l’heure');
  }, [state.rewarded, userId, awardXp]);

  const levelInfo = computeLevel(state.totalXp);

  return (
    <GamificationContext.Provider
      value={{
        totalXp: state.totalXp,
        xpHistory: state.xpHistory,
        streaks: state.streaks,
        badges: state.badges,
        challenges: state.challenges,
        weekKey: state.weekKey,
        rewarded: state.rewarded,
        levelInfo,
        loaded,
        notifications,
        dismissNotification,
        awardXp,
        awardDebtReimbursed,
        awardTontineRound,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
}

export const useGamification = () => useContext(GamificationContext);
