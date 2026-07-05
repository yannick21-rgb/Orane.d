import { JOURNAL_STATUS } from './JournalEntry';
import { getAccountByCode } from './ChartOfAccounts';

export function buildGeneralLedger(entries, accountCode = null) {
  const ledgerMap = {};

  const posted = entries.filter((e) => e.status === JOURNAL_STATUS.POSTED);

  for (const entry of posted) {
    for (const line of entry.lines) {
      const code = line.accountCode;
      if (accountCode && code !== accountCode) continue;

      if (!ledgerMap[code]) {
        const meta = getAccountByCode(code);
        ledgerMap[code] = {
          accountCode: code,
          accountLabel: meta ? meta.label : code,
          type: meta ? meta.type : 'unknown',
          lines: [],
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        };
      }

      const record = {
        entryId: entry.id,
        date: entry.date,
        reference: entry.reference,
        description: entry.description,
        debit: line.debit || 0,
        credit: line.credit || 0,
      };

      ledgerMap[code].lines.push(record);
      ledgerMap[code].totalDebit += record.debit;
      ledgerMap[code].totalCredit += record.credit;
    }
  }

  const result = Object.values(ledgerMap);

  for (const account of result) {
    if (account.type === 'liability' || account.type === 'equity' || account.type === 'income') {
      account.balance = account.totalCredit - account.totalDebit;
    } else {
      account.balance = account.totalDebit - account.totalCredit;
    }
    account.lines.sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    for (const line of account.lines) {
      if (account.type === 'liability' || account.type === 'equity' || account.type === 'income') {
        runningBalance += line.credit - line.debit;
      } else {
        runningBalance += line.debit - line.credit;
      }
      line.runningBalance = runningBalance;
    }
  }

  result.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  return result;
}

export function getAccountBalance(entries, accountCode) {
  const ledger = buildGeneralLedger(entries, accountCode);
  if (ledger.length === 0) return 0;
  return ledger[0].balance;
}

export function getLedgerSummary(entries) {
  const ledger = buildGeneralLedger(entries);
  let totalDebit = 0;
  let totalCredit = 0;
  let debitBalance = 0;
  let creditBalance = 0;

  for (const account of ledger) {
    totalDebit += account.totalDebit;
    totalCredit += account.totalCredit;
    if (account.balance > 0) {
      debitBalance += account.balance;
    } else {
      creditBalance += Math.abs(account.balance);
    }
  }

  return {
    accountCount: ledger.length,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    debitBalance: Math.round(debitBalance * 100) / 100,
    creditBalance: Math.round(creditBalance * 100) / 100,
  };
}
