// VoiceInputButton.js — Bouton micro + écoute + transcription live pour la Saisie Vocale Express
import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Mic, MicOff } from 'lucide-react-native';
import { useVoiceInput } from '../../utils/useVoiceInput';
import { useColors } from '../theme';
import { inkOn } from '../theme/colors';
import { radius } from '../theme/tokens';

const FR = {
  listen: 'Dictez votre transaction…',
  stop: 'Terminer',
  cancel: 'Annuler',
};

export default function VoiceInputButton({
  onResult,
  onError,
  accentColor,
  textColor,
  subTextColor,
  backgroundColor,
  cardColor,
  style,
}) {
  const palette = useColors();
  const accent = accentColor ?? palette.accent;
  const ink = textColor ?? palette.ink;
  const sub = subTextColor ?? palette.inkMid;
  const sunken = backgroundColor ?? palette.sunken;
  const card = cardColor ?? palette.card;
  const onAccent = inkOn(accent);

  const { isListening, transcript, isFinal, error, startListening, stopListening, abortListening } = useVoiceInput({ lang: 'fr-FR' });

  const pulse = useRef(new Animated.Value(1)).current;
  const errorTimer = useRef(null);
  const lastResultRef = useRef('');
  const prevErrorRef = useRef(null);

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
    return () => pulse.stopAnimation();
  }, [isListening, pulse]);

  useEffect(() => {
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!transcript) {
      lastResultRef.current = '';
      return;
    }
    if (isFinal && transcript !== lastResultRef.current) {
      lastResultRef.current = transcript;
      onResult?.(transcript);
    }
  }, [isFinal, transcript, onResult]);

  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      onError?.(error);
      if (errorTimer.current) clearTimeout(errorTimer.current);
      errorTimer.current = setTimeout(() => { errorTimer.current = null; }, 4000);
    }
    prevErrorRef.current = error;
  }, [error, onError]);

  const handlePress = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <TouchableOpacity
          style={[styles.micButton, { backgroundColor: accent }]}
          onPress={handlePress}
          activeOpacity={0.85}
        >
          {isListening ? (
            <MicOff color={onAccent} size={22} />
          ) : (
            <Mic color={onAccent} size={22} />
          )}
        </TouchableOpacity>
      </Animated.View>

      {isListening && (
        <View style={[styles.listeningCard, { backgroundColor: card, borderColor: palette.border }]}>
          <View style={styles.listeningHeader}>
            <ActivityIndicator size="small" color={accent} />
            <Text style={[styles.listeningLabel, { color: sub }]}>{FR.listen}</Text>
          </View>
          {transcript !== '' && (
            <Text style={[styles.transcript, { color: ink }]}>{transcript}</Text>
          )}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: sunken }]} onPress={abortListening}>
              <Text style={[styles.actionText, { color: sub }]}>{FR.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: accent }]} onPress={stopListening}>
              <Text style={[styles.actionText, { color: onAccent, fontWeight: '700' }]}>{FR.stop}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {error && !isListening && (
        <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  micButton: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningCard: {
    marginTop: 12,
    borderRadius: radius.lg,
    padding: 14,
    alignSelf: 'stretch',
    borderWidth: 1,
  },
  listeningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listeningLabel: { fontSize: 13, fontWeight: '600' },
  transcript: { marginTop: 10, fontSize: 16, fontWeight: '500', lineHeight: 22 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  actionText: { fontSize: 13, fontWeight: '600' },
  errorText: { marginTop: 8, fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
