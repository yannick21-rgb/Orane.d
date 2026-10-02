import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme';

/**
 * En-tête de section : icône optionnelle + titre.
 * Reprend `sectionHeader` / `sectionTitle` des écrans.
 *
 * La marge gauche de 8px est appliquée au titre dans tous les cas, comme
 * auparavant — y compris lorsqu'aucune icône n'est fournie. Un titre sans
 * icône reste donc décalé de 8px, ce qui est le rendu d'origine.
 */
export function SectionHeader({ icon, title, titleColor = 'text', style, titleStyle, ...props }) {
  const colors = useColors();

  return (
    <View style={[styles.base, style]} {...props}>
      {icon}
      <Text style={[styles.title, { color: colors[titleColor] }, titleStyle]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default SectionHeader;