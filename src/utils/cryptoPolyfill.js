import { getRandomBytes, digestStringAsync } from 'expo-crypto';

if (typeof global.crypto === 'undefined' || !global.crypto.getRandomValues) {
  try {
    global.crypto = {
      getRandomValues: (buffer) => {
        if (buffer instanceof Uint8Array) {
          const bytes = getRandomBytes(buffer.length);
          buffer.set(bytes);
          return buffer;
        }
        if (buffer instanceof Uint32Array) {
          const bytes = getRandomBytes(buffer.length * 4);
          const view = new Uint32Array(bytes.buffer);
          buffer.set(view);
          return buffer;
        }
        const fallback = getRandomBytes(buffer.length || 1);
        for (let i = 0; i < (buffer.length || 1); i++) {
          buffer[i] = fallback[i] || 0;
        }
        return buffer;
      },
      subtle: {
        digest: async (algorithm, data) => {
          const name = typeof algorithm === 'string' ? algorithm : (algorithm.name || 'SHA-256');
          const input = typeof data === 'string'
            ? data
            : new TextDecoder('utf-8', { fatal: false }).decode(data);
          const hashHex = await digestStringAsync(name.toUpperCase().replace('-', ''), input);
          const bytes = new Uint8Array(hashHex.length / 2);
          for (let i = 0; i < hashHex.length; i += 2) {
            bytes[i / 2] = parseInt(hashHex.substring(i, i + 2), 16);
          }
          return bytes.buffer;
        },
      },
    };
  } catch (e) {
    console.warn('[cryptoPolyfill] expo-crypto indisponible :', e.message);
    global.crypto = global.crypto || {
      getRandomValues: (buf) => { for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256); return buf; },
      subtle: {
        digest: async () => { throw new Error('crypto.subtle non disponible'); },
      },
    };
  }
}
