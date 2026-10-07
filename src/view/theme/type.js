/**
 * Le carnet — système typographique.
 *
 * Deux familles, deux rôles, jamais plus :
 *
 *   Space Grotesk  les chiffres et les titres. Ses chiffres sont larges et
 *                  réguliers : une colonne de montants s'aligne dessus, ce qui
 *                  est exactement le métier d'un carnet. C'est la seule
 *                  famille qui porte un montant.
 *   Police système le texte courant, les libellés, les notes.
 *
 * Une règle non négociable : **aucun montant n'est écrit dans la police
 * système**. C'est ce qui fait tenir la colonne de droite.
 *
 * Aucun libellé n'est en capitales. Les majuscules espacées étaient la
 * signalétique par défaut d'un écran générique ; ici la hiérarchie vient de
 * la taille et de l'encre, pas de la casse.
 *
 * `fontWeight` est volontairement absent des styles en Space Grotesk : sur
 * Android, la graisse est portée par le fichier de police lui-même et la
 * combiner à `fontFamily` est ignorée.
 */

/** Graisses Space Grotesk réellement chargées (voir App.js). */
export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
};

/**
 * Échelle. Les tailles suivent une progression quasi geometricale ; les
 * interlettrages ferment sur les grands corps (les chiffres inhaled
 * paraissent désolidarisés) et s'ouvrent à peine sur les micro-libellés.
 */
export const type = {
  /** Le chiffre du solde en tête d'écran. Le seul corps très marqué. */
  display: { fontFamily: fonts.bold, fontSize: 34, letterSpacing: -1.4 },

  /** Chiffres secondaires : revenus, dépenses, niveau, soldes de poche. */
  figure: { fontFamily: fonts.semibold, fontSize: 22, letterSpacing: -0.8 },

  /** Montant d'une ligne d'opération — la colonne de droite. */
  amount: { fontFamily: fonts.medium, fontSize: 15, letterSpacing: -0.2 },

  /** Montant plus petit : totaux en ligne, valeurs de cellule. */
  amountSm: { fontFamily: fonts.medium, fontSize: 13, letterSpacing: -0.1 },

  /** Titre d'écran. */
  title: { fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.3 },

  /** Sous-titre de bloc, nom d'une catégorie. */
  heading: { fontFamily: fonts.semibold, fontSize: 15, letterSpacing: -0.2 },

  /** Texte courant. */
  body: { fontSize: 15, letterSpacing: -0.1 },

  /** Texte courant appuyé — libellé d'une opération. */
  bodyStrong: { fontSize: 15, fontWeight: '600', letterSpacing: -0.1 },

  /** Libellé de cellule, métadonnée. */
  label: { fontSize: 13, letterSpacing: -0.05 },

  /** Micro-libellé : nom d'une cellule, unité monétaire. */
  micro: { fontSize: 11, fontWeight: '500', letterSpacing: 0.15 },
};

/**
 * Chiffres à chasse fixe.
 *
 * `fontVariant` est la correction qui empêche la colonne de sautiller quand un
 * montant se met à jour : sans elle, le `1` est plus étroit que le `8` et le
 * chiffre à gauche de la virgule bouge à chaque saisie. Ignoré sur les
 * plateformes qui ne le gèrent pas — d'où l'alignement explicite dans
 * `ui/Amount.js`, qui ne dépend pas de ce support.
 */
export const tabular = { fontVariant: ['tabular-nums'] };

export default type;