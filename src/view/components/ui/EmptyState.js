import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography, maxFontScale } from '../../theme/typography';
import Button from './Button';

/**
 * État vide soigné : illustration + message chaleureux + action.
 * Tous les textes viennent des props (LanguageManager côté appelant).
 */
export function EmptyState({
  illustration,
  title,
  message,
  actionLabel,
  onAction,
  style,
}) {
  const colors = useColors();

  return (
    <View style={[styles.base, style]}>
      {illustration}
      <Text
        maxFontSizeMultiplier={maxFontScale}
        style={[typography.subtitle, styles.title, { color: colors.ink }]}
      >
        {title}
      </Text>
      {message ? (
        <Text
          maxFontSizeMultiplier={maxFontScale}
          style={[typography.body, styles.message, { color: colors.inkMid }]}
        >
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} size="md" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', paddingVertical: spacing['2xl'], paddingHorizontal: spacing.xl },
  title: { marginTop: spacing.md, textAlign: 'center' },
  message: { marginTop: spacing.sm, textAlign: 'center' },
  action: { marginTop: spacing.lg },
});

export default EmptyState;
