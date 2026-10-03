import React, { Children } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme';
import { type } from '../../theme/type';
import Rule from './Rule';

/**
 * La rangée de cellules.
 *
 * Un seul motif structurel, réutilisé partout où l'app doit montrer deux ou
 * trois grandeurs côte à côte : un filet vertical les sépare, chaque cellule
 * porte un micro-libellé encre moyenne au-dessus d'une valeur.
 *
 *   Revenus  |  Dépenses
 *   +45 000  |  − 38 200
 *
 * Pas de fond, pas de rayon, pas d'ombre : c'est une ligne de carnet. Le motif
 * sert deux fois sur l'écran d'accueil (revenus/dépenses, puis les trois
 * séries), ce qui lui donne une valeur de langage plutôt que de décoration.
 */
export function Cell({ label, children, align = 'left', style }) {
  const colors = useColors();

  return (
    <View style={[styles.cell, align === 'right' ? styles.alignRight : null, style]}>
      {label ? (
        <Text style={[type.micro, styles.label, { color: colors.inkMid }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

export function Cells({ children, style, ...props }) {
  const items = Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.row, style]} {...props}>
      {items.map((child, i) => (
        <React.Fragment key={child.key ?? i}>
          {i > 0 ? <Rule vertical tone="soft" /> : null}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  cell: { flex: 1, paddingHorizontal: 2, minWidth: 0 },
  alignRight: { alignItems: 'flex-end' },
  label: { marginBottom: 3 },
});

export default Cells;