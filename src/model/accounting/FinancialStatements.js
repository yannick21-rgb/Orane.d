import { buildTrialBalance, buildTrialBalanceByClass } from './TrialBalance';
import { ACCOUNT_CLASSES } from './ChartOfAccounts';
import { JOURNAL_STATUS } from './JournalEntry';

export function buildBalanceSheet(entries) {
  const byClass = buildTrialBalanceByClass(entries);

  const assets = [];
  const liabilities = [];

  for (const cls of byClass) {
    if (cls.classId >= 2 && cls.classId <= 5) {
      for (const acc of cls.accounts) {
        if (acc.balance !== 0) {
          assets.push({
            accountCode: acc.accountCode,
            accountLabel: acc.accountLabel,
            balance: Math.abs(acc.balance),
            type: acc.balance > 0 ? 'debiteur' : 'crediteur',
          });
        }
      }
    }
    if (cls.classId === 1) {
      for (const acc of cls.accounts) {
        if (acc.balance !== 0) {
          liabilities.push({
            accountCode: acc.accountCode,
            accountLabel: acc.accountLabel,
            balance: Math.abs(acc.balance),
            type: 'crediteur',
          });
        }
      }
    }
  }

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);

  return {
    assets: assets.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
    liabilities: liabilities.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
    totalAssets: Math.round(totalAssets * 100) / 100,
    totalLiabilities: Math.round(totalLiabilities * 100) / 100,
    difference: Math.round((totalAssets - totalLiabilities) * 100) / 100,
  };
}

export function buildIncomeStatement(entries) {
  const byClass = buildTrialBalanceByClass(entries);

  const expenses = [];
  const revenues = [];

  for (const cls of byClass) {
    if (cls.classId === 6) {
      for (const acc of cls.accounts) {
        if (acc.balance !== 0) {
          expenses.push({
            accountCode: acc.accountCode,
            accountLabel: acc.accountLabel,
            amount: Math.abs(acc.balance),
          });
        }
      }
    }
    if (cls.classId === 7) {
      for (const acc of cls.accounts) {
        if (acc.balance !== 0) {
          revenues.push({
            accountCode: acc.accountCode,
            accountLabel: acc.accountLabel,
            amount: Math.abs(acc.balance),
          });
        }
      }
    }
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalRevenues = revenues.reduce((s, r) => s + r.amount, 0);
  const netResult = totalRevenues - totalExpenses;

  return {
    expenses: expenses.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
    revenues: revenues.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalRevenues: Math.round(totalRevenues * 100) / 100,
    netResult: Math.round(netResult * 100) / 100,
    isProfitable: netResult >= 0,
  };
}

export function getFinancialSummary(entries) {
  const balanceSheet = buildBalanceSheet(entries);
  const incomeStatement = buildIncomeStatement(entries);
  const postedCount = entries.filter((e) => e.status === JOURNAL_STATUS.POSTED).length;

  return {
    postedEntryCount: postedCount,
    balanceSheet,
    incomeStatement,
    isBalanced: Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilities) < 0.01,
  };
}
