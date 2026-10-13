/**
 * Écran PIN redesigné « Old Money ».
 *
 * MÊME CONTRAT (règle 1) : props, flux création/déverrouillage, tentatives
 * et verrouillage via les callbacks — seule l'expérience change. Clavier
 * élégant en pastilles larges avec haptique au toucher, pastilles de saisie
 * qui se remplissent, secousse horizontale + haptique d'erreur en cas
 * d'échec, succès haptique. Zéro emoji, zéro texte codé en dur.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Lock, Delete } from 'lucide-react-native';
import { useTranslation } from '../../utils/LanguageManager';
import { buildColors } from '../theme';
import { typography, maxFontScale } from '../theme/typography';
import { radius, touchTarget } from '../theme/tokens';

let Haptics = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  Haptics = null;
}

function buzz(kind) {
  try {
    if (!Haptics) return;
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    else if (kind === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    else Haptics.selectionAsync().catch(() => {});
  } catch (e) {}
}

export default function PinAuthModal({ visible, onClose, onSaveNewPin, onUnlock, hasPin, isDark, accentColor, remainingText }) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pinRef = useRef('');
  // Identifiant du `setTimeout` qui déclenche `processPin` après le 5ᵉ chiffre.
  // Sans nettoyage, une annulation pendant ces 140 ms enregistrait quand même
  // le PIN (ou déverrouillait) après fermeture de la modale.
  const processTimer = useRef(null);
  const shake = useRef(new Animated.Value(0)).current;
  // `processPin` est asynchrone : après `await onUnlock`, la modale peut avoir
  // été fermée. On ignore les mises à jour d'état si elle est démontée.
  const mountedRef = useRef(true);

  useEffect(() => {
    clearTimeout(processTimer.current);
    processTimer.current = null;
    if (visible) {
      setPin('');
      setError('');
      setLoading(false);
      shake.setValue(0);
    }
  }, [visible, shake]);

  // Annulation au démontage.
  useEffect(() => () => {
    mountedRef.current = false;
    clearTimeout(processTimer.current);
  }, []);

  const fail = useCallback((message) => {
    setError(message);
    pinRef.current = '';
    setPin('');
    setLoading(false);
    buzz('error');
    Animated.sequence([
      Animated.timing(shake, { toValue: -12, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 12, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  }, [shake]);

  const processPin = useCallback(async (fullPin) => {
    if (hasPin) {
      setLoading(true);
      try {
        const ok = await onUnlock(fullPin);
        if (!mountedRef.current) return;
        if (!ok) {
          fail(t('pin_incorrect'));
          return;
        }
      } catch (e) {
        if (!mountedRef.current) return;
        fail(e.message || t('pin_incorrect'));
        return;
      }
      if (!mountedRef.current) return;
      buzz('success');
      pinRef.current = '';
      setPin('');
      setLoading(false);
    } else {
      buzz('success');
      onSaveNewPin(fullPin);
      pinRef.current = '';
      setPin('');
    }
  }, [hasPin, onUnlock, onSaveNewPin, fail, t]);

  const handleNumber = useCallback((num) => {
    if (pinRef.current.length >= 5 || loading) return;
    buzz('tap');
    setError('');
    const newPin = pinRef.current + num;
    pinRef.current = newPin;
    setPin(newPin);

    if (newPin.length === 5) {
      clearTimeout(processTimer.current);
      processTimer.current = setTimeout(() => processPin(newPin), 140);
    }
  }, [processPin, loading]);

  const handleDelete = useCallback(() => {
    pinRef.current = pinRef.current.slice(0, -1);
    setPin(pinRef.current);
    setError('');
  }, []);

  const handleCancel = useCallback(() => {
    clearTimeout(processTimer.current);
    processTimer.current = null;
    pinRef.current = '';
    setPin('');
    setError('');
    onClose();
  }, [onClose]);

  // Ce composant reçoit isDark/accentColor en props (et non via useFinance) :
  // on construit donc la palette directement.
  const colors = useMemo(() => buildColors(isDark, accentColor), [isDark, accentColor]);

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'back'],
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Animated.View style={[styles.container, { backgroundColor: colors.card, transform: [{ translateX: shake }] }]}>
          <View style={[styles.lockCircle, { backgroundColor: colors.accentSoft }]}>
            <Lock size={26} color={colors.accent} />
          </View>

          <Text maxFontSizeMultiplier={maxFontScale} style={[typography.title, styles.title, { color: colors.ink }]}>
            {hasPin ? t('pin_verrouille') : t('pin_creer_titre')}
          </Text>

          <Text maxFontSizeMultiplier={maxFontScale} style={[typography.body, styles.subtitle, { color: colors.inkMid }]}>
            {hasPin ? t('pin_sub_unlock') : t('pin_sub_create')}
          </Text>

          <View style={styles.dotsRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i < pin.length ? colors.accent : colors.track,
                    borderColor: i < pin.length ? colors.accent : colors.ruleStrong,
                  },
                ]}
              />
            ))}
          </View>

          {error ? (
            <Text maxFontSizeMultiplier={maxFontScale} style={[styles.error, { color: colors.expense }]}>
              {error}
            </Text>
          ) : null}

          {hasPin && remainingText && !error ? (
            <Text style={[styles.remainingText, { color: colors.inkMid }]}>{remainingText}</Text>
          ) : null}

          {loading ? (
            <Text style={[styles.remainingText, { color: colors.accent }]}>{t('pin_verification')}</Text>
          ) : null}

          <View style={styles.numpad}>
            {keys.map((row, ri) => (
              <View key={ri} style={styles.numpadRow}>
                {row.map((key, ki) => {
                  if (key === '') return <View key={ki} style={styles.numpadKey} />;
                  if (key === 'back') {
                    return (
                      <TouchableOpacity
                        key={ki}
                        style={styles.numpadKey}
                        onPress={handleDelete}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityRole="button"
                        accessibilityLabel={t('annuler')}
                      >
                        <Delete size={24} color={colors.inkMid} />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={ki}
                      style={[styles.numpadKey, { backgroundColor: colors.sunken }]}
                      onPress={() => handleNumber(key)}
                      activeOpacity={0.6}
                      accessibilityRole="button"
                      accessibilityLabel={key}
                    >
                      <Text maxFontSizeMultiplier={maxFontScale} style={[styles.numpadKeyText, { color: colors.ink }]}>
                        {key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleCancel}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.cancelBtn}
            accessibilityRole="button"
            accessibilityLabel={t('annuler')}
          >
            <Text style={[typography.body, { color: colors.inkMid }]}>{t('annuler')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
  },
  lockCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { marginBottom: 6, textAlign: 'center' },
  subtitle: { marginBottom: 22, textAlign: 'center' },
  dotsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
    minHeight: 20,
    alignItems: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  error: {
    fontSize: 13,
    marginBottom: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  remainingText: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  numpad: { width: '100%', gap: 10 },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  numpadKey: {
    flex: 1,
    height: 64,
    minHeight: touchTarget,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numpadKeyText: {
    fontSize: 24,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 18,
    minHeight: touchTarget,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
