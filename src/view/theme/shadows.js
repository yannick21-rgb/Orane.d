/**
 * Ombres et élévations cohérentes.
 *
 * Sur fond sombre, l'élévation se lit par la valeur de surface (`card`
 * au-dessus de `bg`), pas par l'ombre : les ombres portées y sont quasi
 * invisibles et coûtent un passage GPU sur les téléphones modestes. On
 * les réserve au thème clair et aux surfaces surélevées (carte héro,
 * bottom sheet, bouton flottant).
 *
 * Usage : `style={[shadows.card, { backgroundColor: colors.card }]}`
 * en clair, rien en sombre (la différence de valeur suffit).
 */
import { Platform } from 'react-native';

function iosShadow(opacity, r, x = 0, y = 2) {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: opacity,
      shadowRadius: r,
      shadowOffset: { width: x, height: y },
    },
    android: {},
    default: {},
  });
}

export const shadows = {
  none: {},
  /** Carte posée : clair uniquement. */
  card: {
    ...iosShadow(0.08, 8, 0, 2),
    elevation: 2,
  },
  /** Carte héro / sheet : la seule ombre marquée. */
  raised: {
    ...iosShadow(0.16, 16, 0, 6),
    elevation: 6,
  },
  /** Bouton flottant central. */
  fab: {
    ...iosShadow(0.22, 12, 0, 4),
    elevation: 8,
  },
};

/** Élévations Android brutes, si un composant natif les exige. */
export const elevation = {
  flat: 0,
  card: 2,
  raised: 6,
  fab: 8,
};

export default shadows;
