export const DEBT_TYPES = {
  CREDIT_ACCORDE: 'credit_accorde',
  CREDIT_RECU: 'credit_recu',
};

export const DEBT_STATUS = {
  EN_COURS: 'en_cours',
  REMBOURSEE: 'remboursee',
  PARTIELLE: 'partielle',
};

export const DEBT_TABS = [
  { key: DEBT_TYPES.CREDIT_ACCORDE, label: 'On me doit', icon: '💸' },
  { key: DEBT_TYPES.CREDIT_RECU, label: 'Je dois', icon: '💳' },
];

export function debtsKey(userId) {
  return `@oraned_debts_${userId}`;
}

export function createDebt({ type, personName, amount, dueDate, note, reminderEnabled }) {
  return {
    id: Date.now().toString(),
    userId: '',
    type,
    personName,
    amount,
    amountReimbursed: 0,
    dateCreated: new Date().toISOString(),
    dueDate: dueDate || null,
    status: DEBT_STATUS.EN_COURS,
    note: note || '',
    reminderEnabled: !!reminderEnabled,
  };
}

export function computeDebtStatus(debt) {
  if (debt.amountReimbursed >= debt.amount) return DEBT_STATUS.REMBOURSEE;
  if (debt.amountReimbursed > 0) return DEBT_STATUS.PARTIELLE;
  return DEBT_STATUS.EN_COURS;
}
