/**
 * Palette de l'application, dérivée du thème clair/sombre.
 *
 * Remplace les ternaires `isDark ? '#…' : '#…'` dupliqués dans chaque écran.
 * Les valeurs sont identiques à celles qui étaient codées en dur — cette
 * extraction est purement structurelle, sans changement de rendu.
 */

import { DEFAULT_ACCENT } from '../../model/ThemeModel';

/** Couleurs de sens, identiques en clair et en sombre. */
export const SEMANTIC = {
  income: '#2ecc71',
  expense: '#ff5c5c',
  danger: '#ef4444',
  warning: '#f59e0b',
  transfer: '#f59e0b',
};

const DARK = {
  bg: '#0f1015',
  card: '#16171f',
  text: '#ffffff',
  subText: '#8c8e9b',

  border: '#2a2b38',
  borderSoft: 'transparent',

  inputBg: '#1c1d28',
  track: '#222431',
  pill: '#232430',
  dot: '#2a2b38',

  modalBg: 'rgba(0,0,0,0.75)',
  overlay: 'rgba(0,0,0,0.75)',
};

const LIGHT = {
  bg: '#f5f6fa',
  card: '#ffffff',
  text: '#131419',
  subText: '#6a6c7a',

  border: '#e8eaef',
  borderSoft: '#eef0f5',

  inputBg: '#f0f1f6',
  track: '#eef0f5',
  pill: '#eef0f5',
  dot: '#d1d5db',

  modalBg: 'rgba(0,0,0,0.5)',
  overlay: 'rgba(0,0,0,0.75)',
};

/**
 * Alias maintenance de la palette.
 *
 * Les écrans existants utilisent des noms hétérogènes pour la même notion
 * (card/cardBg, input/inputBg, line/track, green/income…). Plutôt que de
 * renommer ~95 sites d'appel d'un coup, chaque.screen continue d'utiliser
 * son nom d'origine et pointe sur la même valeur unique.
 */
const ALIASES = {
  cardBg: 'card',
  input: 'inputBg',
  line: 'track',
  unselectedPill: 'pill',
  green: 'income',
  orange: 'warning',
  red: 'danger',
};

/**
 * Construit la palette pour un thème donné.
 *
 * @param {boolean} isDark
 * @param {string} accentColor couleur d'accent choisie par l'utilisateur
 * @param {object} overrides écarts ponctuels (ex: fond blanc de l'onboarding)
 */
export function buildColors(isDark, accentColor = DEFAULT_ACCENT, overrides = {}) {
  const base = { ...(isDark ? DARK : LIGHT), ...SEMANTIC, accent: accentColor, isDark };

  const aliased = Object.entries(ALIASES).reduce((acc, [alias, target]) => {
    acc[alias] = base[target];
    return acc;
  }, {});

  return { ...base, ...aliased, ...overrides };
}

export default buildColors;