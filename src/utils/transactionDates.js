import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";

function toDate(value) {
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isTransactionInDay(transaction, day) {
  const txDate = toDate(transaction?.date);
  const target = toDate(day);
  if (!txDate || !target) return false;

  return isWithinInterval(txDate, {
    start: startOfDay(target),
    end: endOfDay(target),
  });
}

export function isTransactionInLastNDays(transaction, n, now = new Date()) {
  const txDate = toDate(transaction?.date);
  const ref = toDate(now);
  if (!txDate || !ref) return false;

  return isWithinInterval(txDate, {
    start: startOfDay(subDays(ref, Math.max(0, n - 1))),
    end: endOfDay(ref),
  });
}

export function isTransactionInCurrentWeek(transaction, now = new Date(), weekStartsOn = 1) {
  const txDate = toDate(transaction?.date);
  const ref = toDate(now);
  if (!txDate || !ref) return false;

  return isWithinInterval(txDate, {
    start: startOfWeek(ref, { weekStartsOn }),
    end: endOfWeek(ref, { weekStartsOn }),
  });
}

export function isTransactionInMonth(transaction, month = new Date()) {
  const txDate = toDate(transaction?.date);
  const ref = toDate(month);
  if (!txDate || !ref) return false;

  return isWithinInterval(txDate, {
    start: startOfMonth(ref),
    end: endOfMonth(ref),
  });
}

/** Semaine calendaire précédente (lundi → dimanche, comme l'écran Stats). */
export function isTransactionInPreviousWeek(transaction, now = new Date(), weekStartsOn = 1) {
  const ref = toDate(now);
  if (!ref) return false;

  return isTransactionInCurrentWeek(transaction, subWeeks(ref, 1), weekStartsOn);
}

/** Année calendaire — `year` permet de viser l'année précédente. */
export function isTransactionInYear(transaction, year = new Date().getFullYear()) {
  const txDate = toDate(transaction?.date);
  if (!txDate) return false;

  return txDate.getFullYear() === year;
}
