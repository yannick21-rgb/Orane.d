// useVoiceInput.js — Hook de reconnaissance vocale (expo-speech-recognition, français)
// Robuste : module natif absent (Expo Go), permissions refusées, double démarrage,
// arrêt sans session active, mise en arrière-plan, erreurs réseau/native.
import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  isSpeechRecognitionAvailable,
} from './speechRecognition';

const DEFAULT_ERROR = 'Impossible d\'utiliser la reconnaissance vocale.';
const PERMISSION_ERROR = 'Autorisation du microphone refusée. Activez-la dans les réglages.';

const ERROR_MESSAGES = {
  'not-allowed': PERMISSION_ERROR,
  'service-not-allowed': PERMISSION_ERROR,
  'no-speech': 'Aucune parole détectée. Réessayez en parlant distinctement.',
  network: 'Erreur réseau. Vérifiez votre connexion internet.',
  'network-timeout': 'Erreur réseau. Vérifiez votre connexion internet.',
  'audio-capture': 'Impossible d\'accéder au microphone.',
  busy: 'La reconnaissance vocale est déjà en cours.',
  'language-not-supported': 'La langue française n\'est pas supportée par cet appareil.',
  aborted: null,
  canceled: null,
};

function messageForEvent(event) {
  if (event?.message && event?.message !== event?.error) return event.message;
  return ERROR_MESSAGES[event?.error] || event?.message || event?.error || DEFAULT_ERROR;
}

export function useVoiceInput({ lang = 'fr-FR' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState(null);
  const [isAvailable, setIsAvailable] = useState(isSpeechRecognitionAvailable);

  const startingRef = useRef(false);
  const activeRef = useRef(false);

  useSpeechRecognitionEvent('start', () => {
    activeRef.current = true;
    startingRef.current = false;
    setIsListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    activeRef.current = false;
    startingRef.current = false;
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event?.results?.[0]?.transcript ?? '';
    setTranscript(text);
    setIsFinal(!!event?.isFinal);
  });

  useSpeechRecognitionEvent('error', (event) => {
    activeRef.current = false;
    startingRef.current = false;
    setIsListening(false);
    const msg = messageForEvent(event);
    if (msg) setError(msg);
  });

  const startListening = useCallback(async () => {
    if (startingRef.current || activeRef.current) return false;
    startingRef.current = true;

    setError(null);
    setTranscript('');
    setIsFinal(false);

    if (!ExpoSpeechRecognitionModule || !isSpeechRecognitionAvailable) {
      startingRef.current = false;
      setIsAvailable(false);
      setError('La reconnaissance vocale n\'est pas disponible : utilisez un build de développement (npx expo run:android / run:ios).');
      return false;
    }

    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission?.granted) {
        startingRef.current = false;
        setError(PERMISSION_ERROR);
        return false;
      }

      let available = true;
      try {
        available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      } catch (e) {
        available = false;
      }
      setIsAvailable(available);
      if (!available) {
        startingRef.current = false;
        setError('Aucun service de reconnaissance vocale détecté sur cet appareil.');
        return false;
      }

      ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: true,
        continuous: false,
      });
      return true;
    } catch (e) {
      startingRef.current = false;
      setError(e?.message || DEFAULT_ERROR);
      return false;
    }
  }, [lang]);

  const stopListening = useCallback(() => {
    if (!activeRef.current) return;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (e) {}
  }, []);

  const abortListening = useCallback(() => {
    startingRef.current = false;
    if (!activeRef.current) return;
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch (e) {}
    activeRef.current = false;
    setIsListening(false);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') abortListening();
    });
    return () => sub.remove();
  }, [abortListening]);

  useEffect(() => {
    return () => {
      try {
        ExpoSpeechRecognitionModule?.abort();
      } catch (e) {}
    };
  }, []);

  return {
    isListening,
    transcript,
    isFinal,
    error,
    isAvailable,
    startListening,
    stopListening,
    abortListening,
  };
}
