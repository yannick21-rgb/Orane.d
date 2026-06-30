export function toNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  const str = String(val)
    .replace(/\s/g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9.\-]/g, '');
  const num = parseFloat(str);
  return Number.isFinite(num) ? num : 0;
}

export function toCurrency(val) {
  return toNumber(val).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
