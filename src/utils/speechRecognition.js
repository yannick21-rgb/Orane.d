// speechRecognition.js — Import SÉCURISÉ du module natif expo-speech-recognition.
// Le package appelle requireNativeModule('ExpoSpeechRecognition') à l'import :
// si le module natif est absent (Expo Go, build sans plugin de config), cet appel
// lève une exception et casserait tout écran qui importe le package.
// On neutralise proprement : module = null et hooks no-op.

let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent = () => {};

try {
  const speech = require('expo-speech-recognition');
  if (speech && speech.ExpoSpeechRecognitionModule) {
    ExpoSpeechRecognitionModule = speech.ExpoSpeechRecognitionModule;
    if (typeof speech.useSpeechRecognitionEvent === 'function') {
      useSpeechRecognitionEvent = speech.useSpeechRecognitionEvent;
    }
  }
} catch (e) {
  ExpoSpeechRecognitionModule = null;
}

export const isSpeechRecognitionAvailable = !!ExpoSpeechRecognitionModule;

export { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent };
