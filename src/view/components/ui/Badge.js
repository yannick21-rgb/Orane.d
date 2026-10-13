import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme';
import { radius } from '../../theme/tokens';
import { maxFontScale } from '../../theme/typography';

/**
 * Badge — compteur ou pastille de statut (non pressable).
 *
 * @param {string|number} label texte ou compteur
 * @param {'income'|'expense'|'warning'|'info'|'neutral'} tone sens fixe
 */
const TONES = {
  income: 'income',
  expense: 'expense',
  warning: 'warning',
  info: 'info',
  neutral: 'inkMid',
};

export function Badge({ label, tone = 'neutral', style, textStyle }) {
  const colors = useColors();
  const key = TONES[tone] || 'inkMid';
  const fg = colors[key];
  const isRaw = typeof fg === 'string';

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={String(label)}
      style={[
        styles.base,
        { backgroundColor: isRaw ? `${fg}22` : colors.pill },
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={maxFontScale}
        style={[styles.label, { color: isRaw ? fg : colors.inkMid }, textStyle]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 11, fontWeight: '600' },
});

export default Badge;
