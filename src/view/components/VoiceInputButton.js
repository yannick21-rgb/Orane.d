// VoiceInputButton.js — Bouton micro + écoute + transcription live pour la Saisie Vocale Express
import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Mic, MicOff } from 'lucide-react-native';
import { useVoiceInput } from '../../utils/useVoiceInput';

const FR = {
  listen: 'Dictez votre transaction…',
  stop: 'Terminer',
  cancel: 'Annuler',
};

export default function VoiceInputButton({
  onResult,
  onError,
  accentColor = '#3b82f6',
  textColor = '#131419',
  subTextColor = '#6a6c7a',
  backgroundColor = '#eef0f5',
  cardColor = '#ffffff',
  style,
}) {
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
          style={[styles.micButton, { backgroundColor: accentColor }]}
          onPress={handlePress}
          activeOpacity={0.85}
        >
          {isListening ? (
            <MicOff color="#ffffff" size={22} />
          ) : (
            <Mic color="#ffffff" size={22} />
          )}
        </TouchableOpacity>
      </Animated.View>

      {isListening && (
        <View style={[styles.listeningCard, { backgroundColor: cardColor }]}>
          <View style={styles.listeningHeader}>
            <ActivityIndicator size="small" color={accentColor} />
            <Text style={[styles.listeningLabel, { color: subTextColor }]}>{FR.listen}</Text>
          </View>
          {transcript !== '' && (
            <Text style={[styles.transcript, { color: textColor }]}>{transcript}</Text>
          )}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: backgroundColor }]} onPress={abortListening}>
              <Text style={[styles.actionText, { color: subTextColor }]}>{FR.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: accentColor }]} onPress={stopListening}>
              <Text style={[styles.actionText, { color: '#ffffff', fontWeight: '700' }]}>{FR.stop}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {error && !isListening && (
        <Text style={[styles.errorText, { color: '#ff5c5c' }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  micButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  listeningCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  listeningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listeningLabel: { fontSize: 13, fontWeight: '600' },
  transcript: { marginTop: 10, fontSize: 16, fontWeight: '500', lineHeight: 22 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  actionText: { fontSize: 13, fontWeight: '600' },
  errorText: { marginTop: 8, fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
