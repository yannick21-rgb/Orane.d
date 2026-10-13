/**
 * ThemeProvider — wrapper fin au-dessus de FinanceContext.
 *
 * La source de vérité (mode Sombre/Clair/Système, accent, persistance
 * AsyncStorage) reste FinanceContext : ce provider ne duplique aucun
 * état, il expose palette + tokens sous un seul hook pour les écrans.
 *
 * ```js
 * const { colors, isDark, mode, setMode } = useTheme();
 * ```
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useFinance } from '../../viewmodel/FinanceContext';
import { buildColors } from './colors';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows, elevation } from './shadows';
import { typography, fonts, tabular, maxFontScale } from './typography';

const ThemeContext = createContext(null);

/** Modes gérés, persistés via FinanceContext (`@user_theme`). */
export const THEME_MODES = ['Sombre', 'Clair', 'Système'];

export function ThemeProvider({ children }) {
  const { theme, setTheme, accentColor, setAccentColor, isDark } = useFinance();

  const value = useMemo(() => {
    const colors = buildColors(isDark, accentColor);
    return {
      colors,
      isDark,
      /** Mode brut : 'Sombre' | 'Clair' | 'Système'. */
      mode: theme,
      /** Change le mode (persisté par FinanceContext). */
      setMode: setTheme,
      accentColor,
      setAccentColor,
      spacing,
      radius,
      shadows,
      elevation,
      typography,
      fonts,
      tabular,
      maxFontScale,
    };
  }, [theme, setTheme, accentColor, setAccentColor, isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Palette + tokens de l'écran courant.
 * À appeler sous <FinanceProvider> (et idéalement <ThemeProvider> ;
 * repli direct sur FinanceContext si le provider est absent).
 */
export function useTheme() {
  // Les hooks sont appelés inconditionnellement : `useTheme` peut être monté
  // hors `<ThemeProvider>` (tests, écrans isolés), et un `return` avant les
  // hooks ferait varier leur ordre d'un rendu à l'autre.
  const ctx = useContext(ThemeContext);
  const { theme, setTheme, accentColor, setAccentColor, isDark } = useFinance();
  const fallback = useMemo(() => ({
    colors: buildColors(isDark, accentColor),
    isDark,
    mode: theme,
    setMode: setTheme,
    accentColor,
    setAccentColor,
    spacing,
    radius,
    shadows,
    elevation,
    typography,
    fonts,
    tabular,
    maxFontScale,
  }), [theme, setTheme, accentColor, setAccentColor, isDark]);
  return ctx || fallback;
}

export default ThemeProvider;
