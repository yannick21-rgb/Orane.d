import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme';
import { touchTarget } from '../../theme/tokens';
import { typography, maxFontScale } from '../../theme/typography';
import ScalePress from './ScalePress';

/**
 * Ligne de liste générique : icône/cercle à gauche, titre + sous-titre,
 * montant ou chevron à droite. Hauteur tactile ≥ 44.
 */
export function ListItem({
  left,
  title,
  subtitle,
  right,
  onPress,
  accessibilityLabel,
  showDivider = true,
  style,
}) {
  const colors = useColors();

  const content = (
    <>
      {left}
      <View style={styles.main}>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={maxFontScale}
          style={[typography.bodyStrong, { color: colors.ink }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={maxFontScale}
            style={[typography.caption, styles.subtitle, { color: colors.inkMid }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </>
  );

  return (
    <View style={style}>
      {onPress ? (
        <ScalePress
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel || title}
          style={styles.row}
        >
          <View style={styles.inner}>{content}</View>
        </ScalePress>
      ) : (
        <View accessible accessibilityLabel={accessibilityLabel || title} style={styles.row}>
          <View style={styles.inner}>{content}</View>
        </View>
      )}
      {showDivider ? <View style={[styles.divider, { backgroundColor: colors.ruleSoft }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: touchTarget, justifyContent: 'center', paddingVertical: 10 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  main: { flex: 1, minWidth: 0 },
  subtitle: { marginTop: 2 },
  divider: { height: 1, marginLeft: 52 },
});

export default ListItem;
