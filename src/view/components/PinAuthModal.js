import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { buildColors } from '../theme';

export default function PinAuthModal({ visible, onClose, onSaveNewPin, onUnlock, hasPin, isDark, accentColor, remainingText }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pinRef = useRef('');

  useEffect(() => {
    if (visible) {
      setPin('');
      setError('');
      setLoading(false);
    }
  }, [visible]);

  const processPin = useCallback(async (fullPin) => {
    if (hasPin) {
      setLoading(true);
      try {
        const ok = await onUnlock(fullPin);
        if (!ok) {
          setError('Code PIN incorrect');
          pinRef.current = '';
          setPin('');
          setLoading(false);
          return;
        }
      } catch (e) {
        setError(e.message || 'Code PIN incorrect');
        pinRef.current = '';
        setPin('');
        setLoading(false);
        return;
      }
      pinRef.current = '';
      setPin('');
      setLoading(false);
    } else {
      onSaveNewPin(fullPin);
      pinRef.current = '';
      setPin('');
    }
  }, [hasPin, onUnlock, onSaveNewPin]);

  const handleNumber = useCallback((num) => {
    if (pinRef.current.length >= 5) return;
    setError('');
    const newPin = pinRef.current + num;
    pinRef.current = newPin;
    setPin(newPin);

    if (newPin.length === 5) {
      setTimeout(() => processPin(newPin), 120);
    }
  }, [processPin]);

  const handleDelete = useCallback(() => {
    pinRef.current = pinRef.current.slice(0, -1);
    setPin(pinRef.current);
    setError('');
  }, []);

  const handleCancel = useCallback(() => {
    pinRef.current = '';
    setPin('');
    setError('');
    onClose();
  }, [onClose]);

  // Ce composant reçoit isDark/accentColor en props (et non via useFinance) :
  // on construit donc la palette directement. Ecart conservé : les pastilles
  // reposent sur la teinte `border` plutôt que `dot`.
  const colors = useMemo(() => {
    const base = buildColors(isDark, accentColor);
    return { ...base, dotBg: base.border };
  }, [isDark, accentColor]);

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '⌫'],
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <Text style={[styles.lockIcon, { color: accentColor }]}>🔒</Text>

          <Text style={[styles.title, { color: colors.text }]}>
            {hasPin ? 'Mode Discret' : 'Sécurisez vos données'}
          </Text>

          <Text style={[styles.subtitle, { color: colors.subText }]}>
            {hasPin
              ? 'Entrez votre code PIN à 5 chiffres'
              : 'Créez votre code secret à 5 chiffres pour sécuriser vos données'
            }
          </Text>

          <View style={styles.dotsRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: colors.dotBg },
                  i < pin.length && { backgroundColor: accentColor },
                ]}
              />
            ))}
          </View>

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          {hasPin && remainingText && !error ? (
            <Text style={[styles.remainingText, { color: colors.subText }]}>{remainingText}</Text>
          ) : null}

          {loading ? <Text style={[styles.remainingText, { color: accentColor }]}>Vérification...</Text> : null}

          <View style={styles.numpad}>
            {keys.map((row, ri) => (
              <View key={ri} style={styles.numpadRow}>
                {row.map((key, ki) => {
                  if (key === '') return <View key={ki} style={styles.numpadKey} />;
                  if (key === '⌫') {
                    return (
                      <TouchableOpacity
                        key={ki}
                        style={styles.numpadKey}
                        onPress={handleDelete}
                      >
                        <Text style={[styles.numpadKeyText, { color: colors.text, fontSize: 22 }]}>
                          ⌫
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={ki}
                      style={styles.numpadKey}
                      onPress={() => handleNumber(key)}
                    >
                      <Text style={[styles.numpadKeyText, { color: colors.text }]}>{key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.subText }]}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  error: {
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '500',
  },
  remainingText: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  numpad: {
    width: '100%',
    gap: 10,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  numpadKey: {
    width: 70,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numpadKeyText: {
    fontSize: 28,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 20,
    padding: 10,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
