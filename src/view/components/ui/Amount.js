import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme';
import { type, tabular } from '../../theme/type';

/**
 * Le montant — la colonne de droite.
 *
 * Trois règles, et rien d'autre autour.
 *
 * 1. Un montant est toujours écrit en Space Grotesk, jamais dans la police
 *    système. C'est ce qui fait tenir une colonne de chiffres alignée.
 * 2. Les décimales sont estompées. Dans un carnet, l'unité compte, la
 *    centime est une précision ; on les distingue sans les opposer.
 * 3. Le signe est dans le nombre, pas à côté : `− 2 500`, comme on l'écrit.
 *
 * L'alignement à la virgule ne repose pas sur `fontVariant` seul — ignoré
 * sur certaines plateformes — mais sur la chasse fixe quand elle est
 * supportée, et sur le découpage entier/décimales sinon.
 */

/** Teintes nommées du registre. */
const TONES = {
  ink: 'ink',
  mid: 'inkMid',
  faint: 'inkFaint',
  income: 'income',
  expense: 'expense',
  transfer: 'transfer',
};

/** Séparateur de milliers. */
function group(digits) {
  try {
    return Number(digits).toLocaleString();
  } catch (e) {
    return digits;
  }
}

/**
 * Découpe une valeur en partie entière et partie décimale.
 *
 * Le séparateur décimal est imposé à `.` plutôt que laissé au locale : une
 * colonne de montants qui change de séparateur selon la langue de l'appareil
 * n'est plus une colonne.
 *
 * `320 / 600` n'est pas un montant mais deux nombres joints par un slash :
 * la chaîne passe telle quelle, avec la même chasse que le reste de la
 * colonne.
 */
function split(value, decimals, signed) {
  const asNumber = Number(value);

  if (typeof value === 'string' && value.trim() !== '' && Number.isNaN(asNumber)) {
    return { int: value, dec: '', prefix: '' };
  }

  const magnitude = Number.isFinite(asNumber) ? Math.abs(asNumber) : 0;
  const [int, dec] = magnitude.toFixed(decimals).split('.');

  // Le signe suit la valeur affichée, pas la valeur brute. Sans cela un solde
  // de −0,40 arrondi à l'unité s'écrit « −0 », ce qui est absurde.
  const shown = Number(int) + (dec ? Number(`0.${dec}`) : 0);
  const prefix = shown === 0 ? '' : asNumber < 0 ? '−' : signed && asNumber > 0 ? '+' : '';

  return { int: group(int), dec: dec || '', prefix };
}

/**
 * @param {number|string} value      montant ; le signe est lu ici. Une chaîne
 *                                   non numérique est affichée telle quelle.
 * @param {string} [currency]        unité, posée après le nombre
 * @param {string} [tone]            nom de teinte (`income`, `expense`,
 *                                   `transfer`, `ink`, `mid`, `faint`) ou
 *                                   directement une couleur
 * @param {'display'|'figure'|'amount'|'amountSm'} [size]
 * @param {boolean} [signed]         préfixe `+` sur les valeurs positives
 * @param {'left'|'right'} [align]
 * @param {boolean} [masked]         mode discret : masque la valeur
 */
export function Amount({
  value,
  currency,
  tone = 'ink',
  size = 'amount',
  signed = false,
  align = 'right',
  masked = false,
  style,
  ...props
}) {
  const colors = useColors();

  const parts = useMemo(() => {
    const decimals = size === 'display' || size === 'figure' ? 0 : 2;
    return split(value, decimals, signed);
  }, [value, signed, size]);

  const isRawColor = typeof tone === 'string' && (tone.startsWith('#') || tone.startsWith('rgb'));
  const color = isRawColor ? tone : colors[TONES[tone] || 'ink'];

  if (masked) {
    return (
      <View style={[styles.row, align === 'right' ? styles.right : null, style]} {...props}>
        <Text style={[type[size], tabular, { color }]}>••••</Text>
        {currency ? (
          <Text style={[type.micro, styles.unit, { color: colors.inkFaint }]}>{currency}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.row, align === 'right' ? styles.right : null, style]} {...props}>
      <Text numberOfLines={1} style={[type[size], tabular, { color }]}>
        {parts.prefix}
        {parts.int}
        {parts.dec ? <Text style={styles.decimals}>,{parts.dec}</Text> : null}
      </Text>
      {currency ? <Text style={[type.micro, styles.unit, { color: colors.inkMid }]}>{currency}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
  right: { justifyContent: 'flex-end' },
  decimals: { opacity: 0.5 },
  unit: { marginLeft: 5 },
});

export default Amount;