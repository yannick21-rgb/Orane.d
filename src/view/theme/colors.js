/**
 * Le carnet — palette.
 *
 * L'app est une page d'encre : un fond froid, des filets qui séparent, une
 * encre dont la densité code l'importance (texte, libellé, micro-libellé).
 * Les surfaces n'ont pas toutes le même rôle — il y a le fond, la bande
 * réglée, le creux du champ de saisie — et c'est cette différence de valeur
 * qui porte la hiérarchie, pas des boîtes empilées.
 *
 * Tous les noms historiques sont conservés : les autres écrans continuent
 * d'appeler `card`, `border`, `subText`… et pointent sur la même valeur.
 */

import { DEFAULT_ACCENT } from '../../model/ThemeModel';

/**
 * Sens — *presque* identiques en clair et en sombre.
 *
 * Le sens d'un montant ne doit pas changer avec l'heure du jour : le vert
 * reste le vert. Mais une teinte lisible sur du noir est souvent trop claire
 * sur du blanc — `#2ecc71` sur `#ffffff` plafonne à 2,1:1, bien en dessous du
 * seuil de lecture. On garde donc la même teinte en sombre et on descend le
 * registre en clair : même famille, assez assombrie pour être lue.
 */
export const SEMANTIC = {
  income: '#2ecc71',
  expense: '#ff5c5c',
  danger: '#ef4444',
  warning: '#f59e0b',
  transfer: '#f59e0b',
};

/** Variantes clair — vérifiées à 4,5:1 sur `card` blanc. */
const SEMANTIC_LIGHT = {
  income: '#0f7a4a',
  expense: '#c22a2a',
  danger: '#c02626',
  warning: '#8a5a00',
  transfer: '#8a5a00',
};

/* ------------------------------------------------------------------ */
/* Fond sombre — la direction principale.                               */
/* L'app se consulte au marché, dans la file, le soir : l'encre d'abord. */
/* ------------------------------------------------------------------ */
const DARK = {
  bg: '#0e1014',        // la page
  card: '#14171d',      // la bande réglée, légèrement au-dessus du fond
  band: '#14171d',
  sunken: '#191d24',    // creux : champs de saisie, pistes de progression

  text: '#eef1f5',
  subText: '#98a1ae',

  ink: '#eef1f5',       // texte
  inkMid: '#98a1ae',    // libellés, métadonnées
  inkFaint: '#656e7b',  // ce qui s'efface

  rule: '#22262f',      // filet entre deux lignes d'opération
  ruleSoft: '#1a1e25',  // filet discret
  ruleStrong: '#313742',

  border: '#22262f',
  borderSoft: '#1a1e25',

  inputBg: '#191d24',
  track: '#1f242c',
  pill: '#191d24',
  dot: '#22262f',

  modalBg: 'rgba(8,9,12,0.86)',
  overlay: 'rgba(8,9,12,0.86)',
};

/* ------------------------------------------------------------------ */
/* Fond clair — le même carnet lu le jour.                              */
/* Structure identique, encre inversée. Pas de papier crème : le registre  */
/* reste un registre, il ne devient pas une page de roman.               */
/* ------------------------------------------------------------------ */
const LIGHT = {
  bg: '#f2f3f4',
  card: '#ffffff',
  band: '#ffffff',
  sunken: '#e9ebee',

  text: '#14171c',
  subText: '#5c6470',

  ink: '#14171c',
  inkMid: '#545c68',
  inkFaint: '#6e7683',

  rule: '#dcdfe4',
  ruleSoft: '#e6e8ec',
  ruleStrong: '#c3c8d0',

  border: '#dcdfe4',
  borderSoft: '#e6e8ec',

  inputBg: '#e9ebee',
  track: '#e3e6ea',
  pill: '#e9ebee',
  dot: '#c3c8d0',

  modalBg: 'rgba(20,23,28,0.55)',
  overlay: 'rgba(20,23,28,0.55)',
};

/**
 * Alias de maintenance. Les écrans utilisent des noms hétérogènes pour la
 * même notion (card/cardBg, input/inputBg, line/track, green/income…) :
 * plutôt que de renommer une centaine de sites d'un coup, chaque écran garde
 * son nom d'origine et pointe sur la valeur unique.
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

/* ------------------------------------------------------------------ */
/* Lisibilité de l'accent                                               */
/* ------------------------------------------------------------------ */

/** `#abc` ou `#aabbcc` → [r, g, b]. */
function parseHex(hex) {
  const h = String(hex).replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminance relative WCAG. */
function luminance(hex) {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/**
 * Encre posée sur l'accent.
 *
 * L'accent est au choix de l'utilisateur (vingt nuances). Toutes ne peuvent
 * pas porter du blanc : sur un jaune pâle, du blanc est illisible. On choisit
 * donc entre deux enbres celle qui obtient le meilleur taux de contraste,
 * quel que soit l'accent retenu. C'est ce qui rend le réglage de couleur
 * réellement utilisable au lieu d'être décoratif.
 */
const ON_ACCENT_DARK = '#ffffff';
const ON_ACCENT_LIGHT = '#0e1014';

/**
 * Encre lisible sur n'importe quel aplat plein.
 *
 * Exporté parce que la même question se repose sur chaque surface pleine :
 * l'accent (au choix de l'utilisateur) et le rouge de destruction. Un aplat
 * n'a pas toujours besoin de la même encre par-dessus — c'est une mesure, pas
 * une convention.
 */
export function inkOn(bg) {
  return contrast(bg, ON_ACCENT_DARK) >= contrast(bg, ON_ACCENT_LIGHT)
    ? ON_ACCENT_DARK
    : ON_ACCENT_LIGHT;
}

/** Ajoute un canal alpha à une couleur hex (8 chiffres, format RN). */
function alpha(hex, a) {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Construit la palette pour un thème donné.
 *
 * @param {boolean} isDark
 * @param {string} accentColor couleur d'accent choisie par l'utilisateur
 * @param {object} overrides écarts ponctuels (ex: fond blanc de l'onboarding)
 */
export function buildColors(isDark, accentColor = DEFAULT_ACCENT, overrides = {}) {
  const base = {
    ...(isDark ? DARK : LIGHT),
    ...(isDark ? SEMANTIC : SEMANTIC_LIGHT),
    accent: accentColor,
    isDark,
  };

  base.accentFg = inkOn(accentColor);
  // Le rouge de destruction suit la même règle : `#ef4444` en sombre se lit
  // mieux à l'encre sombre qu'au blanc, et l'inverse en clair.
  base.dangerFg = inkOn(base.danger);
  base.accentSoft = alpha(accentColor, isDark ? 0.18 : 0.12);
  base.mask = isDark ? '#eef1f5' : '#14171c';

  const aliased = Object.entries(ALIASES).reduce((acc, [alias, target]) => {
    acc[alias] = base[target];
    return acc;
  }, {});

  return { ...base, ...aliased, ...overrides };
}

export default buildColors;