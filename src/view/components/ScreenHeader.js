/**
 * En-tête minimaliste : grand titre qui se réduit au scroll.
 *
 * Motif iOS : le grand titre (Sora 22) défile avec le contenu et
 * s'efface en glissant, pendant qu'une barre compacte (fond opaque,
 * titre 17 centré) apparaît en fondu. Tout passe par `opacity` et
 * `translateY` avec `useNativeDriver` — 60 fps même sur Android d'entrée
 * de gamme. Pointeur désactivé sur la barre (affichage seul en Phase 2,
 * les actions arrivent avec les écrans).
 *
 * Usage :
 * ```js
 * const header = useCollapsingHeader();
 * <CollapsingBar title={t('settings')} style={header.compactStyle} />
 * <Animated.ScrollView onScroll={header.onScroll} scrollEventThrottle={16}>
 *   <Animated.Text style={[styles.pageTitle, header.largeStyle]}>
 * ```
 */
import React from 'react';
import { useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../theme';
import { typography, maxFontScale } from '../theme/typography';

const COMPACT_HEIGHT = 48;

export function useCollapsingHeader({ threshold = 110 } = {}) {
  const scrollY = useRef(new Animated.Value(0)).current;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  const compactOpacity = scrollY.interpolate({
    inputRange: [threshold * 0.45, threshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const largeOpacity = scrollY.interpolate({
    inputRange: [0, threshold * 0.8],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const largeTranslateY = scrollY.interpolate({
    inputRange: [0, threshold],
    outputRange: [0, -14],
    extrapolate: 'clamp',
  });

  return {
    scrollY,
    onScroll,
    compactStyle: { opacity: compactOpacity },
    largeStyle: { opacity: largeOpacity, transform: [{ translateY: largeTranslateY }] },
  };
}

export function CollapsingBar({ title, style }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      pointerEvents="none"
      accessible
      accessibilityRole="header"
      accessibilityLabel={title}
      style={[
        styles.bar,
        {
          backgroundColor: colors.bg,
          borderBottomColor: colors.rule,
          paddingTop: insets.top,
          height: COMPACT_HEIGHT + insets.top,
        },
        style,
      ]}
    >
      <View style={styles.inner}>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={maxFontScale}
          style={[typography.subtitle, { color: colors.ink, fontSize: 17 }]}
        >
          {title}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: 1,
  },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});

export default CollapsingBar;
