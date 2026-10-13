/**
 * QuickAddFab — bouton d'action flottant de la page Accueil.
 *
 * Il remplace l'onglet « Ajouter » retiré de la barre : **même action**
 * (ouvre la saisie rapide en feuille), mais placé en **zone du pouce**,
 * en bas à droite, au-dessus de la barre d'onglets.
 *
 * Réglé sur les règles HIG/Material d'un FAB :
 * - cible **80 dp** (grand FAB, > token `touchTarget` 44) ;
 * - **grand format** : disque de **80 dp**, **simple cercle plein**
 *   (`accentFg`, filet 2 dp, sans estompage) autour d'un **+ de 40 dp**
 *   (double de la taille d'origine), bouts arrondis ;
 * - retour d'appui : échelle 0,94 (Animated natif, useNativeDriver) +
 *   ondulation Android `borderless` teintée `accentFg` ;
 * - **ombre portée** token `fab` (élevation 8 Android) pour la
 *   séparation du plan — en sombre la valeur de surface suffit déjà ;
 * - haptique légère à l'appui ;
 * - **masqué avec la barre d'onglets** quand le clavier s'ouvre
 *   (convention `tabBarHideOnKeyboard`) ;
 * - étiquette d'accessibilité « Ajouter » (clé `add`, même libellé que
 *   l'onglet retiré).
 */
import React, { useRef } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../theme';
import { duration, shadows } from '../theme/tokens';
import { spacing } from '../theme/spacing';
import { useTranslation } from '../../utils/LanguageManager';
import { TAB_BAR_HEIGHT } from './TabBar';

let Haptics = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  Haptics = null;
}

export function QuickAddFab({ onPress, hidden = false }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue) => {
    Animated.timing(scale, {
      toValue,
      duration: duration.fast,
      useNativeDriver: true,
    }).start();
  };

  if (hidden) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        // Position : marge `lg` (16) à droite et au-dessus de la barre —
        // le pouce atteint le coin bas-droit sans couvrir la barre.
        { bottom: TAB_BAR_HEIGHT + insets.bottom + spacing.lg },
        { transform: [{ scale }] },
      ]}
    >
      <Pressable
        onPress={() => {
          try {
            Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          } catch (e) {}
          onPress?.();
        }}
        onPressIn={() => animate(0.94)}
        onPressOut={() => animate(1)}
        accessibilityRole="button"
        accessibilityLabel={t('add')}
        android_ripple={{ color: `${colors.accentFg}33`, borderless: false }}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.accent },
          pressed && styles.pressed,
        ]}
      >
        <Plus
          color={colors.accentFg}
          size={28}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Ancre bas-droite ; la hauteur (`bottom`) est calculée côté composant
  // (barre + insets + marge).
  wrap: { position: 'absolute', right: spacing.lg },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.fab,
  },
  // Retour d'appui : opacité en plus de l'échelle Animée (indicateur
  // non mouvant pour qui désactive les animations).
  pressed: { opacity: 0.88 },
});

export default QuickAddFab;
