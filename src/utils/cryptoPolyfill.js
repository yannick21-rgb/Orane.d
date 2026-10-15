import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  const { getRandomBytes } = require('expo-crypto');

  if (!global.crypto) {
    global.crypto = {};
  }

  // WebCrypto complet (crypto.subtle : AES-CBC, importKey…) via
  // react-native-quick-crypto. `install()` pose `global.crypto` (subtle
  // inclus), `global.Buffer` et les helpers base64.
  //
  // Le module est natif : sous Expo Go (ou avant un `expo prebuild` / rebuild)
  // il est absent et le `require` lève. On retombe alors sur le seul
  // `getRandomValues` — `secureStorage` détecte l'absence de `subtle` et
  // n'écrit PAS de données chiffrées (stockage en clair, comme avant) plutôt
  // que d'écrire des valeurs indéchiffrables.
  try {
    const { install } = require('react-native-quick-crypto');
    install();
  } catch (e) {
    console.warn(
      '[cryptoPolyfill] react-native-quick-crypto indisponible — rebuild natif requis, chiffrement au repos désactivé :',
      e && e.message
    );
  }

  if (typeof global.crypto.getRandomValues !== 'function') {
    global.crypto.getRandomValues = (buffer) => {
      if (buffer instanceof Uint8Array) {
        const bytes = getRandomBytes(buffer.length);
        buffer.set(bytes);
        return buffer;
      }
      if (buffer instanceof Uint32Array) {
        const bytes = getRandomBytes(buffer.length * 4);
        buffer.set(new Uint32Array(bytes.buffer, bytes.byteOffset, buffer.length));
        return buffer;
      }
      const fallback = getRandomBytes(buffer.length || 1);
      for (let i = 0; i < (buffer.length || 1); i++) {
        buffer[i] = fallback[i] || 0;
      }
      return buffer;
    };
  }
}
