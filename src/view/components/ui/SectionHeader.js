import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme';
import { type } from '../../theme/type';

/**
 * En-tête de section : libellé optionnel + titre.
 *
 * Le titre est un mot du carnet, en Space Grotesk. Il n'y a pas d'exergue en
 * capitales au-dessus : le titre est le titre, il n'a pas besoin d'être
 * oxidase pour exister.
 *
 * `trailing` aligne un élément à droite sur la même ligne — c'est ainsi que
 * la recherche s'est Integrate au titre « Toutes les opérations » au lieu
 * d'occuper une carte à elle seule.
 */
export function SectionHeader({
  icon,
  title,
  trailing,
  titleColor = 'ink',
  style,
  titleStyle,
  ...props
}) {
  const colors = useColors();

  return (
    <View style={[styles.base, style]} {...props}>
      {icon}
      <Text style={[styles.title, type.title, { color: colors[titleColor] }, titleStyle]} numberOfLines={1}>
        {title}
      </Text>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
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
    flexShrink: 1,
    marginLeft: 8,
  },
  trailing: {
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SectionHeader;