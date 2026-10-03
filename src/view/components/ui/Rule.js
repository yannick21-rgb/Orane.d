import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useColors } from '../../theme';
import { ruleWidth } from '../../theme/tokens';

/**
 * Le filet.
 *
 * C'est la structure de l'app. Là où la version précédente empilait des
 * boîtes identiques pour marquer les séparations, le registre trace une
 * ligne et s'arrête là : en thème sombre, la ligne est visible — ce qui n'était
 * pas le cas, les cartes n'y avaient aucune bordure et ne se détachaient que
 * par un gris presque identique au fond.
 *
 * @param {'soft'|'solid'|'strong'} tone
 */
export function Rule({ tone = 'solid', vertical = false, style, ...props }) {
  const colors = useColors();

  const color = tone === 'strong'
    ? colors.ruleStrong
    : tone === 'soft'
      ? colors.ruleSoft
      : colors.rule;

  return (
    <View
      style={[
        vertical
          ? { width: ruleWidth, alignSelf: 'stretch' }
          : { height: ruleWidth, alignSelf: 'stretch' },
        { backgroundColor: color },
        style,
      ]}
      {...props}
    />
  );
}

export default Rule;