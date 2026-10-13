/**
 * Snackbar — bandeau d'annulation (« Opération supprimée · Annuler »).
 *
 * Apparaît en bas d'écran au-dessus de la zone du pouce, se retire seul
 * après 4 s. Action unique, zone tactile 44 px, rôle d'alerte pour les
 * lecteurs d'écran.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../theme';
import { radius, duration, touchTarget } from '../../theme/tokens';
import { shadows } from '../../theme/shadows';
import { typography, maxFontScale } from '../../theme/typography';

export function Snackbar({
  visible,
  message,
  actionLabel,
  onAction,
  onDismiss,
  durationMs = 4000,
  style,
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  // Dernière référence du callback : le retirer des dépendances évite que
  // chaque re-rendu de l'appelant (flèche inline) relance le compte à rebours
  // et maintienne le bandeau affiché indéfiniment.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: duration.fast, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: duration.fast, useNativeDriver: true }),
      ]).start();
      timer.current = setTimeout(() => onDismissRef.current?.(), durationMs);
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 80, duration: duration.fast, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: duration.fast, useNativeDriver: true }),
      ]).start();
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible, durationMs, opacity, translateY]);

  if (!visible && !message) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={message}
      style={[
        styles.wrap,
        shadows.raised,
        { bottom: insets.bottom + 76, opacity, transform: [{ translateY }] },
        style,
      ]}
    >
      <View style={[styles.bar, { backgroundColor: colors.ink, borderRadius: radius.md }]}>
        <Text
          numberOfLines={2}
          maxFontSizeMultiplier={maxFontScale}
          style={[typography.body, styles.message, { color: colors.bg }]}
        >
          {message}
        </Text>
        {actionLabel && onAction && (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={styles.action}
          >
            <Text
              maxFontSizeMultiplier={maxFontScale}
              style={[typography.bodyStrong, styles.actionText, { color: colors.bg }]}
            >
              {actionLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20, zIndex: 50 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
    minHeight: touchTarget,
  },
  message: { flex: 1, minWidth: 0 },
  actionText: { textDecorationLine: 'underline' },
  action: { minHeight: touchTarget, minWidth: touchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
});

export default Snackbar;
