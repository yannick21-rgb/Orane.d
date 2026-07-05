import { toNumber } from './format';

export function computeIncomeExpenseTotals(transactions) {
  let totalIncome = 0;
  let totalExpenses = 0;

  (transactions || []).forEach((t) => {
    if (!t) return;
    const tType = t.type === 'expense' || t.type === 'depense' ? 'depense'
                : t.type === 'income' || t.type === 'revenu' ? 'revenu'
                : t.type;

    if (tType === 'revenu' && t.category !== 'Emprunt') {
      totalIncome += Math.abs(toNumber(t.amount));
    } else if (tType === 'depense' && t.category !== 'Remboursement') {
      totalExpenses += Math.abs(toNumber(t.amount));
    }
  });

  return { totalIncome, totalExpenses };
}
