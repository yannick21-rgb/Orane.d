/**
 * Barre d'onglets personnalisée « Old Money ».
 *
 * **3 destinations**, même ordre que le pager : Accueil, Stats,
 * Paramètres. L'onglet « Ajouter » a été retiré : la création d'une
 * opération passe par la modale `TransactionSheet`, ouverte depuis les
 * actions rapides de la page Accueil. La page « Ajout » n'est plus une
 * page du pager (donc plus atteignable par balayage) : c'est une modale,
 * ouverte pour l'édition via `editingTransaction` et pour la création via
 * `TransactionSheet`. `pages` mappe chaque onglet sur sa page du pager.
 *
 * Réglé sur les règles UI/UX de référence (HIG / Material) :
 *
 * - **cibles tactiles** : le slot remplit toute la hauteur de la barre
 *   (≥ 48 dp utiles, token `touchTarget` 44 en filet de sécurité) ;
 * - **retour à l'appui** : fondu à 0,6 + ondulation native Android
 *   (`android_ripple`, bornée par le rayon du slot) + haptique de
 *   sélection — jamais de décalage de mise en page (l'opacité ne bouge
 *   rien) ;
 * - **état actif non porté par la seule couleur** (daltonisme) :
 *   tick animé au-dessus, échelle de l'icône, gras du libellé ;
 * - **contrastes AA mesurés** : inactif `inkMid` (6,8:1 sur carte dans
 *   les deux thèmes), actif `accent` (4,9:1 clair / 7,9:1 sombre) ;
 * - **libellés 12 px** (échelle Material), jamais tronqués
 *   (`adjustsFontSizeToFit`, repli à 80 %) ;
 * - **alignement vertical centré** dans une barre de `TAB_BAR_HEIGHT` +
 *   insets : le contenu ne peut pas être rogné par le bord de l'écran,
 *   même avec la taille de police agrandie (`maxFontScale` 1,3) ;
 * - **zone sûre** : marge basse = `insets.bottom`.
 *
 * Animations en `Animated` natif (useNativeDriver) : aucun plugin babel
 * Reanimated n'est configuré dans ce projet. Masquée quand le clavier
 * est ouvert (convention `tabBarHideOnKeyboard`), le pager reprend
 * l'espace.
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, PieChart, Settings as SettingsIcon } from 'lucide-react-native';
import { useColors } from '../theme';
import { duration, touchTarget } from '../theme/tokens';
import { maxFontScale } from '../theme/typography';

/** Hauteur utile de la barre (hors insets bas) — réutilisée par le FAB. */
export const TAB_BAR_HEIGHT = 68;

let Haptics = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  Haptics = null;
}

function tap() {
  try {
    if (!Haptics) return;
    Haptics.selectionAsync().catch(() => {});
  } catch (e) {}
}

function TabSlot({ label, Icon, focused, accent, colors, onPress }) {
  const tick = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(focused ? 1.12 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(tick, { toValue: focused ? 1 : 0, duration: duration.fast, useNativeDriver: true }),
      Animated.timing(scale, { toValue: focused ? 1.12 : 1, duration: duration.fast, useNativeDriver: true }),
    ]).start();
  }, [focused, tick, scale]);

  // Une seule règle d'encre pour les 2 éléments (icône, libellé) :
  // inactif `inkMid` (AA), actif `accent` (AA).
  const ink = focused ? accent : colors.inkMid;

  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      android_ripple={{ color: colors.accentSoft, borderless: false }}
      style={({ pressed }) => [styles.slot, pressed && styles.slotPressed]}
    >
      <Animated.View style={[styles.tick, { backgroundColor: accent, opacity: tick }]} />
      {/* Boîte d'icône commune de 28 px : les 3 libellés restent alignés
          sur toute la rangée. */}
      <View style={styles.iconBox}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Icon color={ink} size={22} strokeWidth={2} />
        </Animated.View>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={maxFontScale}
        style={[styles.label, focused && styles.labelActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * @param {string[]} labels libellés traduits [accueil, stats, réglages]
 * @param {number[]} [pages] page du pager pour chaque onglet
 *   (défaut : [0, 1, 2…] — identité)
 * @param {number} activeIndex page courante du pager
 * @param {(page:number)=>void} onTabPress
 * @param {boolean} hidden clavier ouvert → masquée
 */
export function TabBar({ labels, pages, activeIndex, onTabPress, hidden = false }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Mêmes caractéristiques pour les 3 destinations : un seul composant,
  // une seule grille. L'icône suit l'index de l'onglet (Home, Stats,
  // Réglages).
  const icons = useMemo(() => [Home, PieChart, SettingsIcon], []);
  const tabs = useMemo(() => labels.map((label, i) => ({
    page: pages ? pages[i] : i,
    label,
    Icon: icons[i] || Home,
  })), [labels, pages, icons]);

  if (hidden) return null;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.rule,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom + 8,
        },
      ]}
    >
      {tabs.map((tab) => (
        <TabSlot
          key={tab.page}
          {...tab}
          focused={activeIndex === tab.page}
          accent={colors.accent}
          colors={colors}
          onPress={() => onTabPress(tab.page)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    // Les slots remplissent la hauteur et centrent leur contenu : le
    // libellé ne peut pas être poussé contre (voire sous) le bord bas.
    alignItems: 'stretch',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: 2,
    borderRadius: 12,
  },
  // Retour d'appui : opacité seule → aucun décalage de mise en page.
  slotPressed: { opacity: 0.6 },
  tick: { width: 18, height: 2, borderRadius: 1, marginBottom: 4 },
  // Boîte d'icône : hauteur commune → libellés alignés sur toute la rangée.
  iconBox: { height: 28, alignItems: 'center', justifyContent: 'center' },
  // 12 px (échelle Material) : lisible même à taille de police agrandie.
  label: { fontSize: 12, fontWeight: '500', letterSpacing: 0.2, marginTop: 2 },
  // État actif aussi marqué par le gras (indice non coloré).
  labelActive: { fontWeight: '700' },
});

export default TabBar;
