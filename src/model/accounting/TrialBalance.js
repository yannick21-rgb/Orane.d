import { buildGeneralLedger } from './GeneralLedger';
import { ACCOUNT_CLASSES, getAccountsByClass } from './ChartOfAccounts';

export function buildTrialBalance(entries) {
  const ledger = buildGeneralLedger(entries);
  const balanceMap = {};

  for (const account of ledger) {
    balanceMap[account.accountCode] = {
      accountCode: account.accountCode,
      accountLabel: account.accountLabel,
      classId: getClassId(account.accountCode),
      type: account.type,
      totalDebit: account.totalDebit,
      totalCredit: account.totalCredit,
      balance: account.balance,
    };
  }

  const result = Object.values(balanceMap);
  result.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const totals = result.reduce(
    (acc, r) => ({
      totalDebit: acc.totalDebit + r.totalDebit,
      totalCredit: acc.totalCredit + r.totalCredit,
      debitBalance: acc.debitBalance + (r.balance > 0 ? r.balance : 0),
      creditBalance: acc.creditBalance + (r.balance < 0 ? Math.abs(r.balance) : 0),
    }),
    { totalDebit: 0, totalCredit: 0, debitBalance: 0, creditBalance: 0 }
  );

  return { accounts: result, totals };
}

function getClassId(code) {
  const firstDigit = parseInt(code.charAt(0), 10);
  return firstDigit >= 1 && firstDigit <= 8 ? firstDigit : 0;
}

export function buildTrialBalanceByClass(entries) {
  const { accounts } = buildTrialBalance(entries);
  const grouped = {};

  for (const acc of accounts) {
    const cls = acc.classId;
    if (!grouped[cls]) {
      grouped[cls] = {
        classId: cls,
        className: ACCOUNT_CLASSES[cls]?.label || `Classe ${cls}`,
        accounts: [],
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
      };
    }
    grouped[cls].accounts.push(acc);
    grouped[cls].totalDebit += acc.totalDebit;
    grouped[cls].totalCredit += acc.totalCredit;
    grouped[cls].balance += acc.balance;
  }

  return Object.values(grouped).sort((a, b) => a.classId - b.classId);
}

export function isBalanced(trialBalance) {
  const { totals } = trialBalance;
  return (
    Math.abs(totals.totalDebit - totals.totalCredit) < 0.01 &&
    Math.abs(totals.debitBalance - totals.creditBalance) < 0.01
  );
}
