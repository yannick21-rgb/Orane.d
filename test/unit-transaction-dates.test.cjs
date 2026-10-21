require('../scripts/test-harness.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isTransactionInCurrentWeek,
  isTransactionInPreviousWeek,
  isTransactionInYear,
} = require('../src/utils/transactionDates');

// Mercredi 21 octobre 2026. La semaine court du lundi 19 au dimanche 25,
// celle d'avant du lundi 12 au dimanche 18.
const NOW = new Date('2026-10-21T12:00:00');

const tx = (date) => ({ date });

test('isTransactionInCurrentWeek — la semaine en cours seulement', () => {
  assert.equal(isTransactionInCurrentWeek(tx('2026-10-19T09:00:00'), NOW), true, 'lundi');
  assert.equal(isTransactionInCurrentWeek(tx('2026-10-21T09:00:00'), NOW), true, 'mercredi');
  assert.equal(isTransactionInCurrentWeek(tx('2026-10-25T23:00:00'), NOW), true, 'dimanche');
  assert.equal(isTransactionInCurrentWeek(tx('2026-10-18T23:00:00'), NOW), false, 'dimanche précédent');
  assert.equal(isTransactionInCurrentWeek(tx('2026-10-26T09:00:00'), NOW), false, 'lundi suivant');
});

test('isTransactionInPreviousWeek — la semaine d’avant seulement', () => {
  assert.equal(isTransactionInPreviousWeek(tx('2026-10-12T09:00:00'), NOW), true, 'lundi précédent');
  assert.equal(isTransactionInPreviousWeek(tx('2026-10-18T23:00:00'), NOW), true, 'dimanche précédent');
  assert.equal(isTransactionInPreviousWeek(tx('2026-10-21T09:00:00'), NOW), false, 'semaine en cours');
  assert.equal(isTransactionInPreviousWeek(tx('2026-10-05T09:00:00'), NOW), false, 'il y a deux semaines');
});

test('isTransactionInYear — année civile, et l’année précédente', () => {
  assert.equal(isTransactionInYear(tx('2025-12-31T23:00:00'), 2025), true);
  assert.equal(isTransactionInYear(tx('2025-01-01T00:00:00'), 2025), true);
  assert.equal(isTransactionInYear(tx('2025-06-15T12:00:00'), 2026), false);
  assert.equal(isTransactionInYear(tx('2026-06-15T12:00:00'), 2026), true);
});

test('les deux semaines ne se recoupent pas', () => {
  const t = tx('2026-10-14T12:00:00');
  assert.equal(isTransactionInCurrentWeek(t, NOW), false);
  assert.equal(isTransactionInPreviousWeek(t, NOW), true);
});
