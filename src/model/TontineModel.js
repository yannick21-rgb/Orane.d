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
  // `setMonth` déborde quand le jour de départ est 29-31 (31 janv. + 1 mois
  // → 3 mars) : on recale le jour sur le dernier jour du mois visé.
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const start = new Date(startDate);
  for (let i = 1; i <= totalParticipants; i++) {
    const dueDate = new Date(start);
    if (frequency === 'hebdomadaire') {
      dueDate.setDate(dueDate.getDate() + (i - 1) * 7);
    } else {
      const day = start.getDate();
      const totalMonth = start.getMonth() + (i - 1);
      const year = start.getFullYear() + Math.floor(totalMonth / 12);
      const month = ((totalMonth % 12) + 12) % 12;
      dueDate.setFullYear(year, month, Math.min(day, daysInMonth(year, month)));
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

export function nextRoundInfo(group) {
  const upcoming = [...(group.rounds || [])]
    .filter((r) => r.status === ROUND_STATUS.A_PAYER)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  if (!upcoming.length) return null;
  const days = Math.ceil((new Date(upcoming[0].dueDate) - new Date()) / 86400000);
  return { round: upcoming[0], days };
}

export function computeTontineSummary(group) {
  // `group` peut venir du cloud sans validation : `rounds` n'est alors pas garanti.
  const rounds = (group && Array.isArray(group.rounds)) ? group.rounds : [];
  const amountPerTour = Number(group?.amountPerTour) || 0;
  const totalParticipants = Number(group?.totalParticipants) || 1;
  const paidCount = rounds.filter((r) => r.status === ROUND_STATUS.PAYE).length;
  const receivedRounds = rounds.filter((r) => r.status === ROUND_STATUS.RECU);
  const totalPaid = paidCount * amountPerTour;
  const totalReceived = receivedRounds.reduce((s, r) => s + ((Number(r.amount) || 0) * totalParticipants), 0);
  const totalToReceiveAtMyTurn = amountPerTour * totalParticipants;
  const myTurnRound = rounds.find((r) => r.isMyTurnToReceive);
  const hasReceived = myTurnRound ? myTurnRound.status === ROUND_STATUS.RECU : false;
  return { totalPaid, totalReceived, totalToReceiveAtMyTurn, hasReceived };
}
