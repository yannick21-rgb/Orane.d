/**
 * Design tokens — valeurs statiques de l'interface.
 *
 * Complémentaires à colors.js : celui-ci porte les couleurs dépendantes du
 * thème (clair/sombre), celui-ci les valeurs invariantes.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};

/**
 * Échelle de rayons — quatre pas, pas plus.
 *
 * L'app empilait une vingtaine de rayons différents (3,4,7,8,10,12,13,14,16,
 * 18,19,20,22,24,25,27,28,30,32) : aucun élément ne se ressemblait, donc
 * aucune règle ne se lisait. Quatre pas couvrent ce que l'écran fait
 * réellement : un creux, un champ, un bloc, une pastille.
 *
 * Note : ces pas servent les primitives partagées et les écrans redessinés.
 * Les écrans restants gardent encore leurs rayons historiques — les aligner
 * est une passe mécanique à faire écran par écran.
 */
export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const duration = {
  fast: 150,
  normal: 250,
  slow: 400,
};

/**
 * Le carnet — traits.
 *
 * La structure de l'app est faite de filets, pas de boîtes. `ruleWidth` vaut
 * 1px partout : sur fond sombre un trait de 1px est lisible (contrairement à
 * ce que suppose la version précédente, où les cartes n'avaient aucune
 * bordure en thème sombre et ne se détachaient que par un gris presque
 * identique au fond).
 */
export const ruleWidth = 1;

/** Épaisseur des barres de progression. */
export const track = {
  thin: 4,
  thick: 8,
};

/**
 * Objectifs tactiles. Tout ce qui est cliquable doit atteindre 44pt de haut,
 * même quand la marque elle-même est plus petite.
 */
export const touchTarget = 44;