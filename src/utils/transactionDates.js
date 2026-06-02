import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
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
