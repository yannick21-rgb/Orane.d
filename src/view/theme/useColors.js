import { useMemo } from 'react';
import { useFinance } from '../../viewmodel/FinanceContext';
import { buildColors } from './colors';

/**
 * Palette de l'écran courant.
 *
 * Remplace le bloc `const colors = { bg: isDark ? … }` dupliqué dans chaque
 * écran. Mémoïsée sur les deux seules entrées qui la font varier.
 *
 * Pour un écart ponctuel (fond blanc de l'onboarding, par exemple), passer
 * `buildColors(isDark, accentColor, { bg: '#ffffff' })` directement plutôt
 * que d'étendre ce hook : les overrides reçus en paramètre ne seraient pas
 * stables entre deux rendus et casseraient la mémoïsation.
 *
 * @returns {object} palette avec les clés bg, card, text, subText, border, …
 */
export function useColors() {
  const { isDark, accentColor } = useFinance();

  return useMemo(
    () => buildColors(isDark, accentColor),
    [isDark, accentColor]
  );
}

export default useColors;