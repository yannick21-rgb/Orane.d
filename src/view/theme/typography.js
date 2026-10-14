/**
 * Système typographique « Old Money ».
 *
 * Deux familles, deux rôles :
 *   Sora          titres et écrans (élégante, géométrique).
 *   Inter         texte courant et libellés (lisible en petit corps).
 *   SpaceGrotesk  UNIQUEMENT les chiffres et montants (déjà chargée,
 *                 conserve l'alignement des colonnes — voir Amount.js).
 *
 * Règle : aucun montant n'est écrit en Sora ou Inter. Les montants
 * passent par `ui/Amount` ou `ui/AmountText` (chiffres tabulaires).
 *
 * La taille de police système est respectée : les composants laissent
 * `allowFontScaling` actif et plafonnent à 1,3 via
 * `maxFontSizeMultiplier` pour que les textes longs (FR/EN/ES) ne
 * cassent pas les mises en page.
 */
export const fonts = {
  display: 'Sora_700Bold',
  title: 'Sora_600SemiBold',
  heading: 'Sora_600SemiBold',
  body: 'Inter_400Regular',
  bodyStrong: 'Inter_600SemiBold',
  label: 'Inter_500Medium',
  micro: 'Inter_500Medium',
  /** Chiffres uniquement — ne pas utiliser pour du texte. */
  numeric: 'SpaceGrotesk_500Medium',
  numericBold: 'SpaceGrotesk_700Bold',
};

/** Familles Space Grotesk réellement chargées (voir App.js). */
export const numericFonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
};

/** Familles Sora à charger (voir App.js). */
export const displayFonts = {
  semibold: 'Sora_600SemiBold',
  bold: 'Sora_700Bold',
};

/** Familles Inter à charger (voir App.js). */
export const textFonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
};

/**
 * Échelle fixe : display, titre, sous-titre, corps, légende.
 * `fontWeight` est absent des styles Sora/SpaceGrotesk : sur Android
 * la graisse est portée par le fichier de police lui-même.
 */
export const typography = {
  /** Solde héro, très grand. Chiffres via AmountText size="display". */
  display: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -0.8, lineHeight: 40, includeFontPadding: false },
  /** Titre d'écran. */
  title: { fontFamily: fonts.title, fontSize: 22, letterSpacing: -0.4, lineHeight: 28, includeFontPadding: false },
  /** Sous-titre de bloc, nom de catégorie. */
  subtitle: { fontFamily: fonts.heading, fontSize: 17, letterSpacing: -0.2, lineHeight: 24, includeFontPadding: false },
  /** Texte courant. */
  body: { fontFamily: fonts.body, fontSize: 15, letterSpacing: -0.05, lineHeight: 22, includeFontPadding: false },
  /** Texte courant appuyé. */
  bodyStrong: { fontFamily: fonts.bodyStrong, fontSize: 15, letterSpacing: -0.05, lineHeight: 22, includeFontPadding: false },
  /** Libellé de cellule, métadonnée. */
  caption: { fontFamily: fonts.label, fontSize: 13, letterSpacing: 0, lineHeight: 18, includeFontPadding: false },
  /** Micro-libellé, unité monétaire. */
  micro: { fontFamily: fonts.micro, fontSize: 11, letterSpacing: 0.3, lineHeight: 16, includeFontPadding: false },
};

/** Chiffres à chasse fixe pour les montants. */
export const tabular = { fontVariant: ['tabular-nums'] };

/** Plafond de mise à l'échelle système sur les composants UI. */
export const maxFontScale = 1.3;

export default typography;
