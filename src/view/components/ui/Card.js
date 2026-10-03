import React from 'react';
import { View } from 'react-native';
import { useColors } from '../../theme';
import { radius } from '../../theme/tokens';

/**
 * La bande réglée.
 *
 * Un bloc de contenu, posé sur le fond sans bordure ni ombre : c'est le petit
 * écart de valeur entre `bg` et `card` qui dit où s'arrête le bloc. La
 * version précédente empilait des boîtes à rayon 28 partout, y compris en
 * thème sombre où elles n'avaient aucune bordure — le résultat lisait comme
 * des dalles identiques et ne donnait aucun repère sur l'importance.
 *
 * `padding` et `radius` restent pilotables par l'écran appelant, comme
 * avant.
 */
export function Card({
  children,
  padding = 20,
  radius: radiusOverride = radius.md,
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
          borderRadius: radiusOverride,
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