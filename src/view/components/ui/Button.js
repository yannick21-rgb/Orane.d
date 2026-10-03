import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useColors } from '../../theme';
import { fonts } from '../../theme/type';
import { radius, touchTarget } from '../../theme/tokens';

/**
 * Bouton de base.
 *
 * Le libellé est un nom d'action court — « Enregistrer », « Vérifier » — donc
 * il est écrit comme un mot du carnet, en Space Grotesk. L'encre du texte
 * vient de la variante, jamais d'un `#fff` posé en dur : sur une accent
 * clair, du blanc serait illisible, et `accentFg` tranche pour nous.
 */

const SIZES = {
  sm: { paddingVertical: 7, paddingHorizontal: 14, radius: radius.xs, fontSize: 14, minHeight: 34 },
  md: { paddingVertical: 11, paddingHorizontal: 16, radius: radius.sm, fontSize: 15, minHeight: touchTarget },
  lg: { paddingVertical: 14, paddingHorizontal: 20, radius: radius.md, fontSize: 17, minHeight: 52 },
  // Bouton d'enregistrement pleine largeur des modales de formulaire
  // (saveBtn de DebtFormModal / TontineFormModal)
  xl: { paddingVertical: 0, paddingHorizontal: 20, radius: radius.md, fontSize: 16, minHeight: 52 },
};

const VARIANTS = {
  // accent / accentFg : l'encre est calculée pour garantir le contraste
  primary: { bg: 'accent', fg: 'accentFg' },
  secondary: { bg: 'sunken', fg: 'ink' },
  ghost: { bg: 'transparent', fg: 'inkMid' },
  // Clés de palette uniquement — une valeur littérale ici est résolue en
  // `colors['#ffffff']`, c'est-à-dire en `undefined`, donc en texte noir.
  danger: { bg: 'danger', fg: 'dangerFg' },
};

/**
 * @param {'primary'|'secondary'|'ghost'|'danger'} variant
 * @param {'sm'|'md'|'lg'|'xl'} size
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
  fullWidth = false,
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
        fullWidth && styles.fullWidth,
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
          <Text
            style={[
              styles.label,
              { fontFamily: fonts.semibold, color, fontSize: s.fontSize, letterSpacing: -0.1 },
              textStyle,
            ]}
          >
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
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  label: { textAlign: 'center' },
  spacer: { width: 6 },
});

export default Button;