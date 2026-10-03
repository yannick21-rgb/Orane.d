export const THEME_MODES = {
  DARK: 'Sombre',
  LIGHT: 'Clair',
  SYSTEM: 'Système',
};

export const THEME_KEYS = ['Sombre', 'Clair', 'Système'];

/**
 * Nuances d'accent proposées.
 *
 * Le registre n'ancre jamais la couleur : l'accent ne sert qu'à marquer ce
 * qui est vivant — la jauge, le repère d'une opération sélectionnée, le bouton
 * d'action, l'onglet courant. C'est pourquoi aucune nuance ne concurrence une
 * couleur de sens : pas de vert « revenu », pas de rouge « dépense », pas
 * d'ambre « virement ».
 *
 * Les gris ont été retirés : en accent sur fond sombre, un gris n'est ni un
 * accent ni un gris, et l'utilisateur perdait sa sélection d'un coup d'œil.
 *
 * Chaque nuance doit rester visible sur le fond sombre *et* porter une encre
 * lisible sur elle-même. Contrôlé par ratio WCAG : accent ≥ 3:1 sur le fond,
 * encre posée dessus ≥ 4,5:1. `#B93FD4` et `#D6435C` ont été assombris pour
 * franchir le seuil avec du blanc.
 */
export const ACCENT_COLORS = [
  // Encre — le stylo bille
  '#4A5BF0', '#2F7BEA', '#1189C4',
  // Cobalt profond
  '#1E5FD0', '#0B6E99',
  // Violet
  '#7C4DE0', '#9B4BE8', '#A93BC4',
  // Rose
  '#E0407E', '#C93A53',
  // Ambre
  '#E08A1E', '#C9871A',
  // Vert
  '#1FA97A', '#3AA84A',
  // Turquoise
  '#0FA3A3', '#12B0A6', '#3FC1C9',
  // Ardoise
  '#5A6B8C', '#7A8AA8',
];

export const DEFAULT_ACCENT = '#4A5BF0';

export function resolveIsDark(theme, systemScheme) {
  return theme === THEME_MODES.DARK || (theme === THEME_MODES.SYSTEM && systemScheme === 'dark');
}
