import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme';
import { maxFontScale } from '../../theme/typography';

/**
 * Avatar à initiales colorées (tontines, dettes, profil).
 * Couleur déterministe : même nom → même teinte, sans stockage.
 */
const PALETTE = [
  '#C9A86A', '#4A5BF0', '#1FA97A', '#7C4DE0',
  '#E0407E', '#0FA3A3', '#E08A1E', '#2F7BEA',
];

function initialsOf(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorOf(name) {
  const s = String(name || '?');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function Avatar({ name, size = 40, color, style, textStyle }) {
  const colors = useColors();
  const bg = useMemo(() => color || colorOf(name), [name, color]);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        style,
      ]}
    >
      <Text
        maxFontSizeMultiplier={maxFontScale}
        style={[styles.initials, { fontSize: size * 0.38 }, textStyle]}
      >
        {initialsOf(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#ffffff', fontWeight: '600' },
});

export function avatarColorFor(name) {
  return colorOf(name);
}

export default Avatar;
