export const ACCOUNT_CLASSES = {
  1: { label: 'Classe 1 — Ressources durables', type: 'liability' },
  2: { label: 'Classe 2 — Actif immobilisé', type: 'asset' },
  3: { label: 'Classe 3 — Stocks', type: 'asset' },
  4: { label: 'Classe 4 — Tiers', type: 'asset' },
  5: { label: 'Classe 5 — Trésorerie', type: 'asset' },
  6: { label: 'Classe 6 — Charges', type: 'expense' },
  7: { label: 'Classe 7 — Produits', type: 'income' },
  8: { label: 'Classe 8 — Résultats', type: 'equity' },
};

const SYSCOHADA_ACCOUNTS = [
  // === CLASSE 1 — Ressources durables ===
  { code: '101', label: 'Capital social', classId: 1, type: 'liability' },
  { code: '106', label: 'Réserves', classId: 1, type: 'liability' },
  { code: '11', label: 'Report à nouveau', classId: 1, type: 'liability' },
  { code: '12', label: 'Résultat net', classId: 1, type: 'liability' },
  { code: '13', label: 'Subventions d\'investissement', classId: 1, type: 'liability' },
  { code: '15', label: 'Provisions réglementées', classId: 1, type: 'liability' },
  { code: '16', label: 'Emprunts et dettes financières', classId: 1, type: 'liability' },
  { code: '161', label: 'Emprunts bancaires', classId: 1, type: 'liability' },
  { code: '164', label: 'Crédits de trésorerie', classId: 1, type: 'liability' },
  { code: '17', label: 'Dettes de location-acquisition', classId: 1, type: 'liability' },
  { code: '18', label: 'Autres dettes financières', classId: 1, type: 'liability' },

  // === CLASSE 2 — Actif immobilisé ===
  { code: '201', label: 'Frais de développement', classId: 2, type: 'asset' },
  { code: '202', label: 'Brevets et licences', classId: 2, type: 'asset' },
  { code: '203', label: 'Logiciels informatiques', classId: 2, type: 'asset' },
  { code: '21', label: 'Terrains', classId: 2, type: 'asset' },
  { code: '22', label: 'Constructions', classId: 2, type: 'asset' },
  { code: '23', label: 'Installations techniques', classId: 2, type: 'asset' },
  { code: '24', label: 'Matériel et outillage', classId: 2, type: 'asset' },
  { code: '25', label: 'Matériel de transport', classId: 2, type: 'asset' },
  { code: '26', label: 'Matériel informatique', classId: 2, type: 'asset' },
  { code: '27', label: 'Mobilier de bureau', classId: 2, type: 'asset' },
  { code: '28', label: 'Amortissements', classId: 2, type: 'asset' },
  { code: '29', label: 'Provisions pour dépréciation', classId: 2, type: 'asset' },

  // === CLASSE 3 — Stocks ===
  { code: '31', label: 'Marchandises', classId: 3, type: 'asset' },
  { code: '32', label: 'Matières premières', classId: 3, type: 'asset' },
  { code: '33', label: 'Produits finis', classId: 3, type: 'asset' },
  { code: '38', label: 'Stocks en cours', classId: 3, type: 'asset' },
  { code: '39', label: 'Provisions pour dépréciation stocks', classId: 3, type: 'asset' },

  // === CLASSE 4 — Tiers ===
  { code: '401', label: 'Fournisseurs', classId: 4, type: 'liability' },
  { code: '404', label: 'Fournisseurs d\'immobilisations', classId: 4, type: 'liability' },
  { code: '409', label: 'Fournisseurs débiteurs', classId: 4, type: 'asset' },
  { code: '411', label: 'Clients', classId: 4, type: 'asset' },
  { code: '416', label: 'Créances douteuses', classId: 4, type: 'asset' },
  { code: '419', label: 'Clients créditeurs', classId: 4, type: 'liability' },
  { code: '421', label: 'Personnel — Rémunérations', classId: 4, type: 'liability' },
  { code: '431', label: 'Sécurité sociale', classId: 4, type: 'liability' },
  { code: '441', label: 'État — Impôts et taxes', classId: 4, type: 'liability' },
  { code: '444', label: 'État — TVA collectée', classId: 4, type: 'liability' },
  { code: '445', label: 'État — TVA récupérable', classId: 4, type: 'asset' },
  { code: '447', label: 'État — Impôts sur bénéfices', classId: 4, type: 'liability' },
  { code: '451', label: 'Associés — Comptes courants', classId: 4, type: 'liability' },
  { code: '461', label: 'Débiteurs divers', classId: 4, type: 'asset' },
  { code: '462', label: 'Créances sur cessions', classId: 4, type: 'asset' },
  { code: '471', label: 'Créditeurs divers', classId: 4, type: 'liability' },
  { code: '481', label: 'Comptes de régularisation actif', classId: 4, type: 'asset' },
  { code: '482', label: 'Comptes de régularisation passif', classId: 4, type: 'liability' },

  // === CLASSE 5 — Trésorerie ===
  { code: '501', label: 'Banque', classId: 5, type: 'asset' },
  { code: '502', label: 'Compte Mobile Money', classId: 5, type: 'asset' },
  { code: '521', label: 'Caisse', classId: 5, type: 'asset' },
  { code: '53', label: 'Virement interne', classId: 5, type: 'asset' },
  { code: '54', label: 'Régies d\'avance', classId: 5, type: 'asset' },
  { code: '581', label: 'Virements de fonds', classId: 5, type: 'asset' },

  // === CLASSE 6 — Charges ===
  { code: '601', label: 'Achats de marchandises', classId: 6, type: 'expense' },
  { code: '602', label: 'Achats de matières premières', classId: 6, type: 'expense' },
  { code: '603', label: 'Variation des stocks', classId: 6, type: 'expense' },
  { code: '604', label: 'Achats non stockés', classId: 6, type: 'expense' },
  { code: '61', label: 'Services extérieurs', classId: 6, type: 'expense' },
  { code: '611', label: 'Transport', classId: 6, type: 'expense' },
  { code: '612', label: 'Loyer', classId: 6, type: 'expense' },
  { code: '613', label: 'Entretien et réparations', classId: 6, type: 'expense' },
  { code: '614', label: 'Assurances', classId: 6, type: 'expense' },
  { code: '615', label: 'Documentation', classId: 6, type: 'expense' },
  { code: '616', label: 'Publicité', classId: 6, type: 'expense' },
  { code: '617', label: 'Frais de télécommunication', classId: 6, type: 'expense' },
  { code: '618', label: 'Frais bancaires', classId: 6, type: 'expense' },
  { code: '619', label: 'Frais Mobile Money', classId: 6, type: 'expense' },
  { code: '62', label: 'Autres services extérieurs', classId: 6, type: 'expense' },
  { code: '63', label: 'Impôts et taxes', classId: 6, type: 'expense' },
  { code: '64', label: 'Charges de personnel', classId: 6, type: 'expense' },
  { code: '641', label: 'Salaires', classId: 6, type: 'expense' },
  { code: '642', label: 'Charges sociales', classId: 6, type: 'expense' },
  { code: '65', label: 'Autres charges', classId: 6, type: 'expense' },
  { code: '66', label: 'Dotations aux amortissements', classId: 6, type: 'expense' },
  { code: '67', label: 'Dotations aux provisions', classId: 6, type: 'expense' },
  { code: '68', label: 'Charges financières', classId: 6, type: 'expense' },
  { code: '681', label: 'Intérêts bancaires', classId: 6, type: 'expense' },
  { code: '682', label: 'Agios et commissions', classId: 6, type: 'expense' },

  // === CLASSE 7 — Produits ===
  { code: '701', label: 'Ventes de marchandises', classId: 7, type: 'income' },
  { code: '702', label: 'Ventes de produits finis', classId: 7, type: 'income' },
  { code: '703', label: 'Prestations de services', classId: 7, type: 'income' },
  { code: '704', label: 'Travaux', classId: 7, type: 'income' },
  { code: '705', label: 'Produits accessoires', classId: 7, type: 'income' },
  { code: '706', label: 'Revenus Mobile Money', classId: 7, type: 'income' },
  { code: '71', label: 'Subventions d\'exploitation', classId: 7, type: 'income' },
  { code: '72', label: 'Autres produits', classId: 7, type: 'income' },
  { code: '75', label: 'Produits financiers', classId: 7, type: 'income' },
  { code: '78', label: 'Reprises de provisions', classId: 7, type: 'income' },

  // === CLASSE 8 — Résultats ===
  { code: '81', label: 'Résultat d\'exploitation', classId: 8, type: 'equity' },
  { code: '82', label: 'Résultat financier', classId: 8, type: 'equity' },
  { code: '83', label: 'Résultat exceptionnel', classId: 8, type: 'equity' },
  { code: '88', label: 'Résultat net', classId: 8, type: 'equity' },
];

function buildAccountTree(accounts) {
  const map = {};
  const roots = [];

  accounts.forEach((acc) => {
    map[acc.code] = { ...acc, children: [] };
  });

  accounts.forEach((acc) => {
    if (acc.code.length <= 2) {
      roots.push(map[acc.code]);
    } else {
      const parentCode = acc.code.slice(0, -1);
      const parent = map[parentCode];
      if (parent) {
        parent.children.push(map[acc.code]);
      } else {
        const grandParentCode = parentCode.slice(0, -1);
        const grandParent = map[grandParentCode];
        if (grandParent) {
          grandParent.children.push(map[acc.code]);
        } else {
          roots.push(map[acc.code]);
        }
      }
    }
  });

  return roots;
}

export function getDefaultChart() {
  return SYSCOHADA_ACCOUNTS.map((a) => ({ ...a }));
}

export function getAccountByCode(code) {
  return SYSCOHADA_ACCOUNTS.find((a) => a.code === code) || null;
}

export function getAccountsByClass(classId) {
  return SYSCOHADA_ACCOUNTS.filter((a) => a.classId === classId);
}

export function getChartTree() {
  return buildAccountTree(SYSCOHADA_ACCOUNTS);
}

export function isValidAccountCode(code) {
  return SYSCOHADA_ACCOUNTS.some((a) => a.code === code);
}

export function searchAccounts(query) {
  const q = query.toLowerCase();
  return SYSCOHADA_ACCOUNTS.filter(
    (a) => a.code.includes(q) || a.label.toLowerCase().includes(q)
  );
}

export const ACCOUNT_TYPE_LABELS = {
  asset: 'Actif',
  liability: 'Passif',
  equity: 'Capitaux propres',
  expense: 'Charge',
  income: 'Produit',
};

export default SYSCOHADA_ACCOUNTS;
