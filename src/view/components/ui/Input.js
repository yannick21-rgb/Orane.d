import React from 'react';
import { TextInput } from 'react-native';
import { useColors } from '../../theme';
import { type, fonts } from '../../theme/type';
import { radius, touchTarget } from '../../theme/tokens';

/**
 * Champ de saisie — un creux dans la page.
 *
 * Le fond est légèrement plus sombre que la bande (`sunken`), pas plus clair :
 * on creuse la page plutôt qu'on ne pose une boîte dessus. Le montant saisi
 * est en Space Grotesk, comme tous les chiffres de l'app ; le texte saisi
 * reste dans la police système.
 *
 * `textColor` permet de refléter un champ non éditable : les écrans
 * utilisaient `colors.subText` plutôt que `colors.text` dans ce cas.
 */
export function Input({
  style,
  inputBg = 'sunken',
  textColor = 'ink',
  height = touchTarget,
  radius: radiusOverride = radius.sm,
  bordered = false,
  paddingHorizontal = 14,
  numeric = false,
  ...props
}) {
  const colors = useColors();

  return (
    <TextInput
      style={[
        type.body,
        {
          height,
          borderRadius: radiusOverride,
          paddingHorizontal,
          fontFamily: numeric ? fonts.medium : undefined,
          backgroundColor: colors[inputBg],
          color: colors[textColor],
        },
        bordered && {
          borderWidth: 1,
          borderColor: colors.rule,
        },
        style,
      ]}
      placeholderTextColor={colors.inkFaint}
      {...props}
    />
  );
}

export default Input;