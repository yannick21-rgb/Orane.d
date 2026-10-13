import React from 'react';
import { StyleSheet } from 'react-native';
import { useColors } from '../../theme';
import { radius, touchTarget } from '../../theme/tokens';
import ScalePress from './ScalePress';

/**
 * Bouton d'icône 44×44 (œil, recherche, fermeture…).
 */
export function IconButton({
  children,
  onPress,
  variant = 'ghost',
  disabled = false,
  accessibilityLabel,
  style,
}) {
  const colors = useColors();
  const bg = variant === 'filled' ? colors.sunken : 'transparent';

  return (
    <ScalePress
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.base, { backgroundColor: bg }, style]}
    >
      {children}
    </ScalePress>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default IconButton;
