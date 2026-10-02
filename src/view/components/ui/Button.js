import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useColors } from '../../theme';

/**
 * Bouton de base.
 *
 * Les dimensions par défaut reprennent celles qui étaient codées en dur dans
 * les écrans (`formBtn` / `pwdBtn` de SettingsScreen) : paddingVertical 8,
 * paddingHorizontal 14, borderRadius 8 et fontSize 15 en taille `sm`.
 */

const SIZES = {
  sm: { paddingVertical: 8, paddingHorizontal: 14, radius: 8, fontSize: 15, minHeight: 34 },
  md: { paddingVertical: 12, paddingHorizontal: 16, radius: 12, fontSize: 15, minHeight: 44 },
  lg: { paddingVertical: 14, paddingHorizontal: 20, radius: 12, fontSize: 17, minHeight: 52 },
};

const VARIANTS = {
  primary: { bg: 'accent', fg: '#fff' },
  secondary: { bg: 'unselectedPill', fg: 'subText' },
  ghost: { bg: 'transparent', fg: 'accent' },
  danger: { bg: 'danger', fg: '#fff' },
};

/**
 * @param {'primary'|'secondary'|'ghost'|'danger'} variant
 * @param {'sm'|'md'|'lg'} size
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'sm',
  icon,
  iconRight,
  disabled = false,
  loading = false,
  flex = false,
  style,
  textStyle,
  ...props
}) {
  const colors = useColors();
  const s = SIZES[size] || SIZES.sm;
  const palette = VARIANTS[variant] || VARIANTS.primary;
  const color = colors[palette.fg];
  const inert = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: colors[palette.bg],
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: s.radius,
          minHeight: s.minHeight,
        },
        flex && styles.flex,
        inert && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <>
          {icon && (
            <>
              {icon}
              <View style={styles.spacer} />
            </>
          )}
          <Text style={[styles.label, { color, fontSize: s.fontSize }, textStyle]}>
            {label}
          </Text>
          {iconRight && (
            <>
              <View style={styles.spacer} />
              {iconRight}
            </>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  disabled: { opacity: 0.5 },
  label: { fontWeight: '600', textAlign: 'center' },
  spacer: { width: 6 },
});

export default Button;