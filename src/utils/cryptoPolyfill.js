import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  const { getRandomBytes } = require('expo-crypto');

  if (!global.crypto) {
    global.crypto = {};
  }
  if (!global.crypto.subtle) {
    global.crypto.subtle = {};
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
        const view = new Uint32Array(bytes.buffer);
        buffer.set(view);
        return view;
      }
      const fallback = getRandomBytes(buffer.length || 1);
      for (let i = 0; i < (buffer.length || 1); i++) {
        buffer[i] = fallback[i] || 0;
      }
      return buffer;
    };
  }
}
