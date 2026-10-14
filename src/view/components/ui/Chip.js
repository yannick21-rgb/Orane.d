import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme';
import { radius, touchTarget } from '../../theme/tokens';
import { maxFontScale } from '../../theme/typography';
import ScalePress from './ScalePress';

/**
 * Chip — filtre ou suggestion pressable (500 / 1000 / 5000 FCFA,
 * filtres type/catégorie/portefeuille…).
 *
 * @param {string} label texte (via LanguageManager côté appelant)
 * @param {boolean} selected état actif
 * @param {React.ReactNode} icon icône optionnelle à gauche
 */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  disabled = false,
  accessibilityLabel,
  style,
  textStyle,
}) {
  const colors = useColors();

  return (
    <ScalePress
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel || label}
      style={[
        styles.base,
        {
          backgroundColor: selected ? colors.accentSoft : colors.pill,
          borderColor: selected ? colors.accent : colors.rule,
        },
        style,
      ]}
    >
      <View style={styles.inner}>
        {icon}
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={maxFontScale}
          style={[
            styles.label,
            { color: selected ? colors.accent : colors.inkMid },
            textStyle,
          ]}
        >
          {label}
        </Text>
      </View>
    </ScalePress>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radius.pill,
    minHeight: touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 14, fontWeight: '500', lineHeight: 20, includeFontPadding: false },
});

export default Chip;
