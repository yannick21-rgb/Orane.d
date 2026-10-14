/**
 * Pastille de pression : feedback tactile 44×44 commun à tous les
 * composants pressables (léger scale via Animated natif, useNativeDriver).
 * Migrera vers Reanimated en Phase 10 avec le reste des animations.
 */
import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { touchTarget, duration } from '../../theme/tokens';

export function ScalePress({
  children,
  onPress,
  disabled = false,
  scaleTo = 0.96,
  style,
  ...props
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue) => {
    Animated.timing(scale, {
      toValue,
      duration: duration.fast,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => !disabled && animate(scaleTo)}
      onPressOut={() => animate(1)}
      style={[{ minHeight: touchTarget, minWidth: touchTarget }, style]}
      {...props}
    >
      <Animated.View style={{ transform: [{ scale }], flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default ScalePress;
