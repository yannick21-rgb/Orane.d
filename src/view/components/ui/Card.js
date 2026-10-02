import React from 'react';
import { View } from 'react-native';
import { useColors } from '../../theme';

/**
 * Conteneur de section. Reprend le `card` des écrans
 * (padding 24-28, borderRadius 28-32, marginBottom 16).
 *
 * Les dimensions continues viennent de `useResponsive` : passer `padding` et
 * `radius` depuis le parent pour conserver exactement le rendu existant.
 */
export function Card({
  children,
  padding = 24,
  radius = 28,
  marginBottom = 16,
  style,
  ...props
}) {
  const colors = useColors();

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          padding,
          borderRadius: radius,
          marginBottom,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export default Card;