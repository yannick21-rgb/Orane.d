import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useColors } from '../../theme';
import { radius, track, duration } from '../../theme/tokens';

/**
 * Barre de progression animée (budget, remboursement, épargne).
 * Couleur pilotée par l'appelant (vert → orange → rouge selon le ratio).
 */
export function ProgressBar({
  value,
  max = 100,
  color,
  trackColor,
  height = track.thick,
  style,
  accessibilityLabel,
}) {
  const colors = useColors();
  const width = useRef(new Animated.Value(0)).current;
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  useEffect(() => {
    Animated.timing(width, {
      toValue: ratio,
      duration: duration.normal,
      useNativeDriver: false,
    }).start();
  }, [ratio, width]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ now: Math.round(ratio * 100), min: 0, max: 100 }}
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: trackColor || colors.track },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            borderRadius: height / 2,
            backgroundColor: color || colors.accent,
            width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', width: '100%' },
  fill: { height: '100%' },
});

export default ProgressBar;
