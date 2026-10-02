import React from 'react';
import { TextInput } from 'react-native';
import { useColors } from '../../theme';

/**
 * Champ de saisie. Reprend les dimensions de `textInput` (44px, rayon 8) et
 * `pwdInput` (48px, rayon 12) des écrans.
 *
 * `textColor` permet de refléter un champ non éditable : les écrans
 * utilisaient `colors.subText` plutôt que `colors.text` dans ce cas.
 */
export function Input({
  style,
  inputBg = 'inputBg',
  textColor = 'text',
  height = 44,
  radius = 8,
  bordered = true,
  paddingHorizontal = 12,
  ...props
}) {
  const colors = useColors();

  return (
    <TextInput
      style={[
        {
          height,
          borderRadius: radius,
          paddingHorizontal,
          fontSize: 15,
          backgroundColor: colors[inputBg],
          color: colors[textColor],
        },
        bordered && {
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
      placeholderTextColor={colors.subText}
      {...props}
    />
  );
}

export default Input;