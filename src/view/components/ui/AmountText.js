import React, { useMemo } from 'react';
import { Amount } from './Amount';
import { toNumber } from '../../../utils/format';

/**
 * AmountText — montant coloré, masquable, formaté FCFA.
 *
 * Wrapper fin au-dessus de `Amount` (colonne de chiffres conservée) :
 * - normalise via `toNumber()` (règle 5),
 * - groupe les milliers en `fr-FR` (espace insécable, stable quelle que
 *   soit la langue de l'appareil),
 * - expose le masquage vie privée (`masked`, piloté par le mode discret).
 *
 * @param {number|string} value montant brut
 * @param {string} currency unité, 'FCFA' par défaut
 * @param {'income'|'expense'|'transfer'|'ink'|'mid'|'faint'} tone
 */
export function AmountText({ value, currency = 'FCFA', ...props }) {
  const numeric = useMemo(() => toNumber(value), [value]);
  return <Amount value={numeric} currency={currency} {...props} />;
}

export default AmountText;
