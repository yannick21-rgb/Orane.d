import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { useColors } from '../../theme';
import { radius, touchTarget, duration } from '../../theme/tokens';
import { maxFontScale } from '../../theme/typography';

/**
 * SegmentedControl animé (MoMo/Cash, Semaine/Mois/Année, Sombre/Clair).
 * Curseur glissant via Animated natif. Zone tactile 44px par segment.
 *
 * @param {Array<{value:string,label:string}>} options
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
}) {
  const colors = useColors();
  const [widths, setWidths] = useState({});
  const translateX = useRef(new Animated.Value(0)).current;

  const index = Math.max(options.findIndex((o) => o.value === value), 0);

  useEffect(() => {
    let offset = 0;
    for (let i = 0; i < index; i++) offset += widths[options[i]?.value] || 0;
    Animated.timing(translateX, {
      toValue: offset,
      duration: duration.fast,
      useNativeDriver: true,
    }).start();
    // `options` est volontairement hors dépendances : les appelants recréent
    // le tableau à chaque rendu, ce qui relancerait l'animation sans raison.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, widths, translateX]);

  const activeWidth = widths[options[index]?.value] || 0;

  return (
    <View
      accessible
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.base, { backgroundColor: colors.sunken }, style]}
    >
      {activeWidth > 0 && (
        <Animated.View
          style={[
            styles.cursor,
            {
              backgroundColor: colors.card,
              width: activeWidth,
              transform: [{ translateX }],
            },
          ]}
        />
      )}
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange?.(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            style={[
              styles.segment,
              { minHeight: touchTarget },
              { width: undefined },
            ]}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              setWidths((prev) => (prev[opt.value] === w ? prev : { ...prev, [opt.value]: w }));
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={maxFontScale}
              style={[styles.label, { color: active ? colors.ink : colors.inkMid }]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 3,
    position: 'relative',
  },
  cursor: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: radius.sm,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 0,
    zIndex: 1,
  },
  label: { fontSize: 14, fontWeight: '600', lineHeight: 20, includeFontPadding: false },
});

export default SegmentedControl;
