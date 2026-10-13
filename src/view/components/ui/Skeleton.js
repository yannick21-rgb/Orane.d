import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useColors } from '../../theme';
import { radius } from '../../theme/tokens';
import { useReduceMotion } from '../../../utils/useReduceMotion';

/**
 * Skeleton de chargement (pulsation douce).
 * Immobile si « réduire les animations » est activé (règle Phase 10).
 */
export function Skeleton({ width = '100%', height = 16, borderRadius = null, style = null }) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.6);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no"
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius: borderRadius ?? radius.sm,
          backgroundColor: colors.sunken,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Ligne de transaction factice (cercle + 2 barres). */
export function SkeletonRow({ style }) {
  const colors = useColors();
  return (
    <View accessible={false} importantForAccessibility="no" style={[styles.row, style]}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.rowMain}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} />
      </View>
      <Skeleton width={72} height={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowMain: { flex: 1, gap: 6 },
});

export default Skeleton;
