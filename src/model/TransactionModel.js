export const TRANSACTION_TYPES = {
  EXPENSE: 'expense',
  INCOME: 'income',
  TRANSFER: 'transfert',
};

export const NORMALIZED_TYPES = {
  expense: 'depense',
  income: 'revenu',
  transfert: 'transfert',
};

export const WALLET_TYPES = {
  MOMO: 'momo',
  CASH: 'cash',
};

export const NETWORKS = [
  { key: 'MTN',     tKey: 'mtn_momo'     },
  { key: 'MOOV',    tKey: 'moov_money'   },
  { key: 'CELTIIS', tKey: 'celtiis_cash' },
];

export const INCOME_FREQUENCIES = [
  { key: 'variable', tKey: 'non_fixe' },
  { key: 'weekly',   tKey: 'hebdo'    },
  { key: 'monthly',  tKey: 'mensuel'  },
];

export const EXPENSE_CATEGORIES = [
  { key: 'Alimentation',       tKey: 'alimentation',       icon: '🛒' },
  { key: 'Logement',           tKey: 'logement',           icon: '🏠' },
  { key: 'Transport',          tKey: 'transport',          icon: '🚗' },
  { key: 'Abonnements & Tech', tKey: 'abonnements_tech',   icon: '💳' },
  { key: 'Sport',              tKey: 'sport',              icon: '🏋️\u200d♂️' },
  { key: 'Loisirs',            tKey: 'loisirs',            icon: '🎮' },
  { key: 'Habillement',        tKey: 'habillement',        icon: '👗' },
  { key: 'Santé',              tKey: 'sante',              icon: '💊' },
  { key: 'Épargne',            tKey: 'epargne',            icon: '🏦' },
  { key: 'Remboursement',      tKey: 'remboursement',      icon: '💸' },
  { key: 'Frais & Retraits',   tKey: 'frais_retraits_cat', icon: '🪙' },
];

export const INCOME_CATEGORIES = [
  { key: 'Salaire / Coaching', tKey: 'salaire_coaching', icon: '💼' },
  { key: 'Freelance / Dev',    tKey: 'freelance_dev',    icon: '💻' },
  { key: 'Projets Web',        tKey: 'projets_web',      icon: '📈' },
  { key: 'Cadeau',             tKey: 'cadeau',           icon: '🎁' },
  { key: 'Emprunt',            tKey: 'emprunt',          icon: '🤝' },
  { key: 'Ventes',             tKey: 'ventes',           icon: '🛍️' },
];

export const HOME_CATEGORY_ICONS = {
  'Alimentation': '🛒',
  'Transport':    '🚗',
  'Logement':     '🏠',
  'Santé':        '💊',
  'Loisirs':      '🎮',
  'Salaire':      '💼',
  'Freelance':    '💻',
  'Autres':       '📌',
};

export function normalizeType(type) {
  if (type === 'expense') return 'depense';
  if (type === 'income') return 'revenu';
  return type;
}

export function isRealExpense(type) {
  return normalizeType(type) === 'depense';
}
