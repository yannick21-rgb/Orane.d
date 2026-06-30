export const TONTINE_FREQUENCIES = [
  { key: 'hebdomadaire', label: 'Hebdomadaire', daysOffset: 7 },
  { key: 'mensuelle', label: 'Mensuelle', daysOffset: 30 },
];

export const ROUND_STATUS = {
  A_PAYER: 'a_payer',
  PAYE: 'paye',
  RECU: 'recu',
};

export function tontinesKey(userId) {
  return `@oraned_tontines_${userId}`;
}

export function generateRounds({ startDate, frequency, totalParticipants, myPosition, amountPerTour }) {
  const rounds = [];
  for (let i = 1; i <= totalParticipants; i++) {
    const dueDate = new Date(startDate);
    if (frequency === 'hebdomadaire') {
      dueDate.setDate(dueDate.getDate() + (i - 1) * 7);
    } else {
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
    }
    rounds.push({
      roundNumber: i,
      dueDate: dueDate.toISOString(),
      status: ROUND_STATUS.A_PAYER,
      amount: amountPerTour,
      isMyTurnToReceive: i === myPosition,
    });
  }
  return rounds;
}

export function computeTontineSummary(group) {
  const paidCount = group.rounds.filter((r) => r.status === ROUND_STATUS.PAYE).length;
  const receivedRounds = group.rounds.filter((r) => r.status === ROUND_STATUS.RECU);
  const totalPaid = paidCount * group.amountPerTour;
  const totalReceived = receivedRounds.reduce((s, r) => s + (r.amount * group.totalParticipants), 0);
  const totalToReceiveAtMyTurn = group.amountPerTour * group.totalParticipants;
  const myTurnRound = group.rounds.find((r) => r.isMyTurnToReceive);
  const hasReceived = myTurnRound ? myTurnRound.status === ROUND_STATUS.RECU : false;
  return { totalPaid, totalReceived, totalToReceiveAtMyTurn, hasReceived };
}
