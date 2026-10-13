/**
 * Échelle d'espacement canonique — pas de 4/8/12/16/24/32/48.
 *
 * Un seul pas par usage : 4 pour le resserrement interne, 48 pour la
 * respiration entre blocs. Les écrans n'importent que d'ici, jamais de
 * valeur littérale (règle 4).
 */

/** Échelle officielle. `lg` vaut 24 (et non 16) : c'est le pas courant. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
};

/** Alias sémantiques, pour lire l'intention dans les écrans. */
export const gap = spacing;
export const padding = spacing;
export const margin = spacing;

export default spacing;
