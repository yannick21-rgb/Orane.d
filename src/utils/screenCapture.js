/**
 * Capture d'écran — contrôle par l'utilisateur.
 *
 * Par défaut, l'app protège l'écran : `usePreventScreenCapture()` (dans
 * `App.js` et `HomeScreen.js`) pose le flag `FLAG_SECURE` sur Android, ce qui
 * interdit les captures d'écran et les enregistrements, et masque l'app dans
 * le sélecteur des apps récentes. C'est une protection légitime pour une app
 * de finance — mais elle empêche aussi de documenter l'interface.
 *
 * Ce module expose le choix de l'utilisateur : un interrupteur dans les
 * réglages (« Autoriser les captures d'écran ») qui, une fois activé, retire
 * la protection via `allowScreenCaptureAsync()`. Tant que le réglage est
 * coupé, la protection reste active.
 *
 * Sur web, `expo-screen-capture` n'expose pas ces méthodes : l'appel lève une
 * `UnavailabilityError`. On ne les invoque donc jamais sur une plateforme sans
 * module natif — l'interrupteur reste visible, sans effet ni avertissement.
 *
 * Persistance : AsyncStorage, clé `@oraned_screen_capture_allowed`.
 * Valeur absente ou illisible → `false` (protection active par défaut).
 */
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SCREEN_CAPTURE_KEY = '@oraned_screen_capture_allowed';

/**
 * Méthodes natives, résolues une seule fois au chargement du module.
 *
 * Sur web, `expo-screen-capture` exporte bien `allowScreenCaptureAsync` et
 * `preventScreenCaptureAsync`, mais leur corps lève une `UnavailabilityError`
 * faute de module natif. Vérifier `typeof fn === 'function'` ne suffit donc
 * pas : on interroge le module natif lui-même. `null` partout sur les
 * plateformes sans implémentation (web, iOS).
 */
let nativeMethods = null;
try {
  // require() plutôt que `import` : le module peut être absent selon la cible.
  const sc = require('expo-screen-capture');
  // BUG corrigé : `sc.ExpoScreenCapture` n'est JAMAIS exporté par le package
  // (c'est un module interne) — la détection échouait sur toutes les
  // plateformes et le réglage utilisateur n'avait aucun effet. On teste
  // l'export public à la place, et on exclut le web où il lève une
  // `UnavailabilityError` faute de module natif.
  const { Platform } = require('react-native');
  const hasNative =
    Platform.OS !== 'web' &&
    typeof sc.allowScreenCaptureAsync === 'function' &&
    typeof sc.preventScreenCaptureAsync === 'function';
  nativeMethods = hasNative
    ? {
        allow: sc.allowScreenCaptureAsync,
        prevent: sc.preventScreenCaptureAsync,
      }
    : null;
} catch (_) {
  nativeMethods = null;
}

/**
 * Clé propre au réglage utilisateur.
 *
 * `expo-screen-capture` suit les demandes par clé : `preventScreenCaptureAsync(key)`
 * ajoute la clé à un ensemble, `allowScreenCaptureAsync(key)` l'en retire.
 * `usePreventScreenCapture()` (monté dans `App.js` et `HomeScreen.js`) utilise
 * la clé `'default'` — la même que celle qu'utiliserait un appel sans argument.
 * Les deux se marcheraient donc dessus : le hook re-poserait `FLAG_SECURE` à
 * chaque montage et annulerait le choix de l'utilisateur.
 *
 * D'où une clé dédiée : le réglage et le hook vivent dans des ensembles
 * séparés, et c'est l'intersection qui décide de l'état réel.
 */
const TOGGLE_KEY = 'oraned-user-preference';

/** Applique l'état voulu. Résout `true` si la capture est autorisée. */
export async function applyScreenCapturePolicy(allowed) {
  if (!nativeMethods) return !!allowed;
  const fn = allowed ? nativeMethods.allow : nativeMethods.prevent;
  if (!fn) return !!allowed;
  try {
    // Toujours avec notre clé dédiée : sinon on perturberait l'ensemble
    // `'default'` tenu par `usePreventScreenCapture()`.
    await fn(TOGGLE_KEY);
    return !!allowed;
  } catch (e) {
    console.warn('[screenCapture] Impossible d’appliquer la politique :', e);
    return false;
  }
}

/** Lit la préférence persistée. Absente/illisible → protection active. */
export async function readScreenCapturePreference() {
  try {
    const raw = await AsyncStorage.getItem(SCREEN_CAPTURE_KEY);
    return raw === 'true';
  } catch (e) {
    console.warn('[screenCapture] Lecture de la préférence impossible :', e);
    return false;
  }
}

/** Enregistre la préférence puis l'applique. */
export async function setScreenCaptureAllowed(allowed) {
  try {
    await AsyncStorage.setItem(SCREEN_CAPTURE_KEY, allowed ? 'true' : 'false');
  } catch (e) {
    console.warn('[screenCapture] Sauvegarde de la préférence impossible :', e);
  }
  return applyScreenCapturePolicy(allowed);
}

/**
 * Hook : applique la politique stockée au montage (et la ré-applique si la
 * préférence change pendant la vie du composant).
 *
 * Remplace `usePreventScreenCapture()` d'`expo-screen-capture` : ce hook pose
 * la clé `'default'` de façon permanente, et le package ne retire `FLAG_SECURE`
 * que lorsque TOUS les tags ont disparu — le réglage utilisateur ne pouvait
 * donc jamais déverrouiller les captures. Ici, une seule clé (`TOGGLE_KEY`)
 * pilote l'état, conformément au stockage de la préférence.
 */
export function useScreenCapturePolicy() {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const allowed = await readScreenCapturePreference();
      if (!alive) return;
      await applyScreenCapturePolicy(allowed);
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}
