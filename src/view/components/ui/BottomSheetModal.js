import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityLabel={accessibilityLabel || title}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.modalBg }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
      />
      {/* Le fond (backdrop) est en flex:1 → il occupe tout l'espace au-dessus
          et pousse la feuille en bas de l'écran. `sheetWrap` ne doit JAMAIS
          être en flex:1 : le conteneur du Modal est une colonne flex:1, les
          deux enfants se partageraient alors l'écran 50/50 et la feuille
          serait plafonnée à 88 % × 50 % = 44 % de l'écran (feuille coupée). */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
        <SafeAreaView
          edges={['bottom']}
          style={[styles.sheet, { backgroundColor: colors.card }]}
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
          {/* flexShrink:1 → le contenu se comprime dans le maxHeight de la
              feuille (88 % de l'écran) : sans lui, les enfants débordent
              sous le bord inférieur de l'écran et le bouton d'enregistrement
              est coupé. C'est le correctif du bouton invisible. */}
          <View style={[styles.content, { flexShrink: 1 }, style]}>{children}</View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 12,
    maxHeight: '88%',
    minHeight: 200,
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
  content: { paddingHorizontal: 20, paddingTop: 8 },
});

export default BottomSheetModal;
