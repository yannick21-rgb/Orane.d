/**
 * useReduceMotion — respecte le réglage système « réduire les animations ».
 *
 * Retourne `true` si l'utilisateur demande des animations réduites : les
 * boucles décoratives (pulsations, flottement, cascade) doivent alors être
 * rendues statiques, les micro-retours (< 150 ms) peuvent rester car ils
 * portent une information, pas un décor.
 */
import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => { if (alive) setReduce(!!v); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return reduce;
}

export default useReduceMotion;
