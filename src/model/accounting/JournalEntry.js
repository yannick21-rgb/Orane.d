import { isValidAccountCode } from './ChartOfAccounts';

export const JOURNAL_STATUS = {
  DRAFT: 'draft',
  POSTED: 'posted',
};

export const JOURNAL_LINE_SCHEMA = {
  accountCode: { type: 'string', required: true },
  label: { type: 'string', required: true },
  debit: { type: 'number', required: false },
  credit: { type: 'number', required: false },
};

export const JOURNAL_ENTRY_SCHEMA = {
  id: { type: 'string', required: true },
  date: { type: 'string', required: true },
  reference: { type: 'string', required: true },
  description: { type: 'string', required: true },
  lines: { type: 'array', required: true },
  status: { type: 'string', required: true },
  userId: { type: 'string', required: true },
  createdAt: { type: 'string', required: true },
  updatedAt: { type: 'string', required: true },
};

export function createJournalEntry({ date, description, lines, userId }) {
  const timestamp = Date.now();
  const dateObj = date ? new Date(date) : new Date();
  const year = dateObj.getFullYear();
  const count = timestamp % 10000;

  return {
    id: `JE_${timestamp}`,
    date: dateObj.toISOString().split('T')[0],
    reference: `JN-${year}-${String(count).padStart(4, '0')}`,
    description: description.trim(),
    lines: lines.map((l) => ({
      accountCode: l.accountCode,
      label: l.label || '',
      debit: Math.abs(Number(l.debit) || 0),
      credit: Math.abs(Number(l.credit) || 0),
    })),
    status: JOURNAL_STATUS.DRAFT,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function validateJournalEntry(entry) {
  const errors = [];

  if (!entry.description || !entry.description.trim()) {
    errors.push('La description est requise');
  }

  if (!entry.lines || entry.lines.length < 2) {
    errors.push('L\'écriture doit contenir au moins 2 lignes');
    return { valid: false, errors };
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of entry.lines) {
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;

    if (debit < 0 || credit < 0) {
      errors.push('Les montants doivent être positifs');
    }

    if (debit === 0 && credit === 0) {
      errors.push(`Ligne ${line.accountCode}: le débit ou le crédit doit être > 0`);
    }

    if (debit > 0 && credit > 0) {
      errors.push(`Ligne ${line.accountCode}: ne peut pas avoir débit ET crédit`);
    }

    if (!isValidAccountCode(line.accountCode)) {
      errors.push(`Compte invalide: ${line.accountCode}`);
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    errors.push(
      `Le total doit être équilibré: ${totalDebit.toFixed(2)} ≠ ${totalCredit.toFixed(2)}`
    );
  }

  if (totalDebit === 0) {
    errors.push('Le montant total doit être supérieur à 0');
  }

  return { valid: errors.length === 0, errors };
}

export function validateJournalLine(line) {
  const errors = [];
  if (!line.accountCode) errors.push('Code compte requis');
  if (!line.label) errors.push('Libellé requis');
  const debit = Number(line.debit) || 0;
  const credit = Number(line.credit) || 0;
  if (debit === 0 && credit === 0) errors.push('Débit ou crédit requis');
  if (debit > 0 && credit > 0) errors.push('Débit et crédit exclusifs');
  return { valid: errors.length === 0, errors };
}

export function sortEntriesByDate(entries) {
  return [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getEntriesInPeriod(entries, startDate, endDate) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).setHours(23, 59, 59, 999);
  return entries.filter((e) => {
    const d = new Date(e.date).getTime();
    return d >= start && d <= end;
  });
}

export function formatReference(entry) {
  return entry.reference || `${entry.id.slice(0, 8)}`;
}
