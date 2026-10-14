import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../../theme';
import { radius, touchTarget } from '../../theme/tokens';
import { typography, maxFontScale } from '../../theme/typography';

/**
 * BottomSheetModal — feuille modale bas d'écran (zone du pouce).
 *
 * Phase 1 : `Modal` + slide natif, sans dépendance native nouvelle
 * (testable dans Expo Go). La migration vers `@gorhom/bottom-sheet`
 * (gestes, snap points) arrive en Phase 4 avec la saisie rapide.
 *
 * Hauteur : la feuille est bornée par `useWindowDimensions().height × 0.9`
 * (pixels, toujours résolus). Un `maxHeight` en pourcentage ne se résout pas
 * de façon fiable quand le parent est en hauteur automatique — la feuille
 * débordait alors sous le bas de l'écran et le bouton d'enregistrement était
 * coupé. La chaîne `flexShrink: 1` (sheetWrap → sheet → content) laisse
 * ensuite la feuille se comprimer au lieu de déborder, et le ScrollView du
 * contenu devient défilable.
 */
export function BottomSheetModal({
  visible,
  onClose,
  title,
  children,
  accessibilityLabel,
  style,
}) {
  const colors = useColors();
  const { height } = useWindowDimensions();
  const maxSheetHeight = Math.round(height * 0.9);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityLabel={accessibilityLabel || title}
    >
      {/* `root` occupe tout l'écran et pousse la feuille vers le bas. Le fond
          (backdrop) est en position absolue : il n'entre donc pas dans le flux
          flex et ne partage pas l'écran avec la feuille (ancien bug 50/50). */}
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.modalBg }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel || title}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <SafeAreaView
            edges={['bottom']}
            style={[
              styles.sheet,
              { backgroundColor: colors.card, maxHeight: maxSheetHeight },
            ]}
          >
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.ruleStrong }]} />
            </View>
            {title ? (
              <View style={styles.header}>
                <Text
                  maxFontSizeMultiplier={maxFontScale}
                  style={[typography.subtitle, { color: colors.ink }]}
                >
                  {title}
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  accessibilityRole="button"
                  style={styles.closeHit}
                >
                  <Text style={[styles.close, { color: colors.inkMid }]}>✕</Text>
                </Pressable>
              </View>
            ) : null}
            {/* flexShrink:1 → le contenu se comprime dans la hauteur bornée de
                la feuille : sans lui, les enfants débordent sous le bord
                inférieur de l'écran et le bouton d'enregistrement est coupé. */}
            <View style={[styles.content, style]}>{children}</View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  // flexShrink:1 : si la feuille dépasse la hauteur bornée, c'est ce
  // conteneur qui se comprime (sinon il déborde par le haut).
  sheetWrap: { width: '100%', flexShrink: 1 },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 12,
    minHeight: 200,
    flexShrink: 1,
  },
  handleRow: { alignItems: 'center', paddingTop: 10 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    minHeight: touchTarget,
  },
  closeHit: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'flex-end', justifyContent: 'center' },
  close: { fontSize: 18 },
  // flexShrink:1 → c'est ici que la compression se fait, le ScrollView enfant
  // récupère une hauteur bornée et devient défilable.
  content: { paddingHorizontal: 20, paddingTop: 8, flexShrink: 1 },
});

export default BottomSheetModal;
