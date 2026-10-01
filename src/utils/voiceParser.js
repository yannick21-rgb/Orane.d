// voiceParser.js — Extraction automatique d'une transaction à partir d'une dictée vocale (français)
// Fonction pure : parseVoiceInput(text) → { amount, type, category, account, note, title, raw }

const ACCENTS = { 'à': 'a', 'â': 'a', 'ä': 'a', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'î': 'i', 'ï': 'i', 'ô': 'o', 'ö': 'o', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ç': 'c', 'œ': 'oe' };

export function normalizeVoice(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/['’`]/g, ' ')
    .replace(/[«»".,!?;:()]/g, ' ')
    .replace(/[àâäéèêëîïôöùûüçœ]/g, (c) => ACCENTS[c] || c)
    .replace(/\s+/g, ' ')
    .trim();
}

//
// Nombre
//

const DIGIT_PATTERN = /\d{1,3}(?:[ \u00A0.,]?\d{3})*(?:[.,]\d{1,2})?(?!\d)|\d+(?!\d)/g;

function parseDigitAmount(rawText) {
  const normalized = String(rawText).replace(/[ \u00A0]/g, ' ');
  const matches = [...normalized.matchAll(DIGIT_PATTERN)];
  if (!matches.length) return null;

  const parsed = matches
    .map((m) => {
      let s = m[0].replace(/\s/g, '')
        .replace(/,/g, '.')
        .replace(/(\d)\.(\d{3})($|\D)/, '$1$2$3');
      const num = parseFloat(s);
      if (!Number.isFinite(num) || num <= 0) return null;
      const after = normalized.slice(m.index + m[0].length).trim().split(/\s+/)[0] || '';
      const before = normalized.slice(0, m.index).trim().split(/\s+/).slice(-1)[0] || '';
      return { num, after: String(after).toLowerCase(), before: String(before).toLowerCase() };
    })
    .filter(Boolean);

  if (!parsed.length) return null;

  const withCurrency = parsed.filter((p) => CURRENCY_WORDS.has(p.after) || CURRENCY_WORDS.has(p.before));
  const pick = withCurrency.length ? withCurrency : parsed;
  return pick.reduce((best, p) => (p.num > best.num ? p : best), { num: 0 }).num;
}

const NUMBER_WORDS = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9,
  dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
  cent: 100, cents: 100, mille: 1000, mil: 1000, million: 1000000, millions: 1000000,
};

const TEEN_SUFFIX = { dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16 };

function frenchNumberTokens(words) {
  const out = [];
  let i = 0;
  while (i < words.length) {
    const a = words[i];
    const b = words[i + 1];
    const c = words[i + 2];

    if (a === 'quatre' && (b === 'vingt' || b === 'vingts')) {
      out.push(c === 'dix' ? 90 : 80);
      i += c === 'dix' ? 3 : 2;
      continue;
    }
    if (a === 'soixante' && b && b in TEEN_SUFFIX) {
      out.push(60 + TEEN_SUFFIX[b]);
      i += 2;
      continue;
    }
    if (a === 'vingt' && b === 'et' && c === 'un') {
      out.push(21);
      i += 3;
      continue;
    }
    if (a === 'et' && b === 'un' && out.length) {
      out[out.length - 1] += 1;
      i += 2;
      continue;
    }
    if (a in NUMBER_WORDS) {
      out.push(NUMBER_WORDS[a]);
      i += 1;
      continue;
    }
    i += 1;
  }
  return out;
}

function frenchNumberValue(tokens) {
  let total = 0;
  let current = 0;
  for (const val of tokens) {
    if (val >= 100) {
      if (val === 100) {
        current = (current === 0 ? 1 : current) * 100;
      } else {
        current = (current === 0 ? 1 : current) * val;
        total += current;
        current = 0;
      }
    } else {
      current += val;
    }
  }
  return total + current;
}

function parseSpokenAmount(rawText) {
  const normalized = normalizeVoice(rawText);
  const tokens = normalized.split(/[\s-]+/).filter(Boolean);
  const runs = [];
  let run = null;
  for (let i = 0; i < tokens.length; i += 1) {
    const w = tokens[i];
    const isNumberToken = w in NUMBER_WORDS || w === 'et' ||
      ['quatre', 'soixante', 'vingt', 'vingts'].includes(w) ||
      (w in TEEN_SUFFIX && ['soixante', 'quatre'].includes(tokens[i - 1]));
    if (isNumberToken) {
      if (!run) run = [];
      run.push(w);
    } else if (run) {
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  if (!runs.length) return null;

  // On rejette les faux positifs ("un pain" → 1) : un nombre parlé isolé < 10
  // (un, deux, … neuf) n'est pas un montant plausible.
  const candidates = runs
    .map((r) => frenchNumberValue(frenchNumberTokens(r)))
    .filter((v) => v >= 10);
  return candidates.length ? Math.max(...candidates) : null;
}

function isNumberToken(w) {
  const parts = w.split('-');
  return parts.length > 0 && parts.every((p) => p in NUMBER_WORDS || p === 'et' ||
    ['quatre', 'soixante', 'vingt', 'vingts'].includes(p));
}

function extractAmount(rawText) {
  return parseDigitAmount(rawText) ?? parseSpokenAmount(rawText) ?? 0;
}

//
// Mots-clés
//

const TYPE_EXPENSE_KEYWORDS = [
  'depense', 'depenses', 'depenser', 'depens', 'achete', 'acheter', 'achat', 'achats',
  'paye', 'payer', 'pay', 'debit', 'debite', 'debité', 'sortie', 'sortie argent',
  'retire', 'retirer', 'retrait', 'depense', 'a depense', 'j ai depense',
];
const TYPE_INCOME_KEYWORDS = [
  'recu', 'recue', 'recus', 'reçue', 'reçu', 'reçus', 'gagne', 'gagner', 'gagné', 'gagne',
  'gain', 'gains', 'entree', 'entrees', 'encaisser', 'encaissement', 'credite', 'revenu',
  'revenus', 'recueillir', 'recueilli',
];

const ACCOUNT_MOMO = ['mobile money', 'momo', 'mobilemoney', 'mo mo', 'mobile'];
const ACCOUNT_CASH = ['especes', 'liquide', 'cash', 'cach', 'espèces'];
const ACCOUNT_BANK = ['banque', 'bancaire', 'compte banque'];

const EXPENSE_KEYWORDS = {
  'Alimentation': ['alimentation', 'nourriture', 'repas', 'restaurant', 'pain', 'courses', 'marche',
    'supermarch', 'epicerie', 'viande', 'riz', 'poulet', 'banane', 'fruits', 'legumes', 'manger',
    'mange', 'dejeuner', 'diner', 'bouffe', 'farine', 'huile', 'sauce', 'poisson', 'beurre', 'pain'],
  'Transport': ['transport', 'essence', 'carburant', 'taxi', 'moto', 'bus', 'zemidjan', 'voiture',
    'auto', 'station', 'pompiste', 'deplacement', 'trajet', 'mecano', 'mecaniciens', 'course'],
  'Logement': ['loyer', 'logement', 'maison', 'appartement', 'facture', 'electricite', 'eau',
    'gaz', 'locataire', 'location', 'chambre', 'studio', 'loyer'],
  'Abonnements & Tech': ['abonnement', 'forfait', 'internet', 'data', 'recharge', 'credit', 'telephone',
    'telephone', 'phone', 'sim', 'reseau', 'technologie', 'tech', 'fibre', 'wifi', 'airtime', 'appel'],
  'Santé': ['sante', 'medecin', 'docteur', 'medicament', 'hopital', 'pharmacie', 'consultation',
    'soins', 'ordonnance', 'infirmier', 'clinique', 'malade', 'sante'],
  'Loisirs': ['loisir', 'loisirs', 'cinema', 'sortie', 'jeu', 'jeux', 'divertissement', 'concert',
    'fete', 'bar', 'boire', 'danse', 'spectacle'],
  'Habillement': ['habit', 'vetement', 'vetements', 'chaussure', 'chaussures', 'robe', 'pagne',
    'chemise', 'souliers', 'tailleur', 'fringues'],
  'Sport': ['sport', 'gym', 'foot', 'football', 'fitness', 'entrainement', 'match', 'salle de sport'],
  'Épargne': ['epargne', 'epargnes', 'tontine', 'epargner', 'cotisation', 'epargne'],
  'Remboursement': ['remboursement', 'rembourser', 'dette', 'dettes', 'emprunt', 'pret', 'rembourse', 'rete'],
  'Frais & Retraits': ['frais', 'frais de retrait', 'retrait', 'retraits', 'commission', 'deduction'],
  'Education/Formation': ['ecole', 'cours', 'formation', 'education', 'livre', 'scolarite', 'universite',
    'professeur', 'etudes', 'college', 'bourse', 'ecole'],
};

const INCOME_KEYWORDS = {
  'Salaire / Coaching': ['salaire', 'coaching', 'honoraire', 'honoraires'],
  'Freelance / Dev': ['freelance', 'developpeur', 'code', 'developpement', 'mission', 'dev'],
  'Projets Web': ['projet', 'projets', 'web', 'site', 'application', 'design', 'hebergement', 'app'],
  'Cadeau': ['cadeau', 'cadeaux', 'don', 'donation'],
  'Emprunt': ['emprunt', 'emprunts', 'pret', 'prete'],
  'Ventes': ['vente', 'ventes', 'vendu', 'vendue', 'commande', 'marchandise', 'boutique', 'commerce'],
};

const STOP_WORDS = new Set([
  'j', 'je', 'ai', 'a', 'as', 'avons', 'avez', 'ont', 'suis', 'es', 'est', 'sommes', 'etes', 'sont',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
  'le', 'la', 'les', 'un', 'une', 'de', 'des', 'du', 'au', 'aux', 'et', 'ou', 'ou', 'pour', 'avec',
  'sur', 'sous', 'dans', 'en', 'vers', 'ce', 'cette', 'ces', 'que', 'qui', 'quoi', 'dont', 'aujourd',
  'hui', 'hier', 'demain', 'maintenant', 'juste', 'viens', 'vient', 'faire', 'fait', 'fais', 'fait',
  'encore', 'aussi', 'tout', 'tous', 'toute', 'toutes', 'bien', 'tres', 'faut', 'fallait', 'doit',
  'payer', 'paye', 'pay', 'depense', 'depenses', 'depenser', 'achete', 'acheter', 'achat', 'achats',
  'recu', 'recue', 'recus', 'gagne', 'gagner', 'gains', 'entree', 'entrees', 'reçu', 'reçue', 'reçus',
  'chez', 'sur', 'money', 'd', 'l', 'argent', 'espece', 'cents', 'francs',
]);

const CURRENCY_WORDS = new Set(['f', 'fr', 'fcfa', 'f cfa', 'franc', 'francs', 'cfa', 'fcfa', 'xof', 'bif', 'fbu', 'dollars', 'euro', 'euros', 'dirham', 'ariary', 'ngn', 'naira', 'cedis', 'ghs', 'ksh', 'shillings', 'usd', 'eur']);

function includesWord(words, phrase) {
  const parts = phrase.split(' ');
  if (parts.length === 1) return words.includes(parts[0]);
  for (let i = 0; i <= words.length - parts.length; i += 1) {
    if (parts.every((p, k) => words[i + k] === p)) return true;
  }
  return false;
}

function matchedPhraseWords(words, phrases) {
  const found = new Set();
  for (const phrase of phrases) {
    const parts = phrase.split(' ');
    for (let i = 0; i <= words.length - parts.length; i += 1) {
      if (parts.every((p, k) => words[i + k] === p)) {
        parts.forEach((p) => found.add(p));
      }
    }
  }
  return found;
}

//
// Parser principal
//

export function parseVoiceInput(text) {
  const raw = String(text || '').trim();
  const normalized = normalizeVoice(raw);
  const words = normalized.split(' ').filter(Boolean);

  const amount = extractAmount(raw);
  const hasAmount = amount > 0;

  let type = null;
  const typeScore = { expense: 0, income: 0 };
  for (const kw of TYPE_EXPENSE_KEYWORDS) if (includesWord(words, kw)) typeScore.expense += 1;
  for (const kw of TYPE_INCOME_KEYWORDS) if (includesWord(words, kw)) typeScore.income += 1;
  if (typeScore.expense > typeScore.income) type = 'expense';
  else if (typeScore.income > typeScore.expense) type = 'income';

  let account = null;
  let accountPhrase = null;
  for (const kw of ACCOUNT_MOMO) if (includesWord(words, kw)) { account = 'momo'; accountPhrase = kw; break; }
  if (!account) for (const kw of ACCOUNT_CASH) if (includesWord(words, kw)) { account = 'cash'; accountPhrase = kw; break; }
  if (!account) for (const kw of ACCOUNT_BANK) if (includesWord(words, kw)) { account = 'banque'; accountPhrase = kw; break; }

  const categoryList = type === 'income' ? INCOME_KEYWORDS : EXPENSE_KEYWORDS;
  let category = null;
  for (const [catKey, keywords] of Object.entries(categoryList)) {
    if (keywords.some((kw) => includesWord(words, kw))) { category = catKey; break; }
  }
  if (!category && type !== 'income') category = 'Autres';

  const allKeywords = [
    ...TYPE_EXPENSE_KEYWORDS, ...TYPE_INCOME_KEYWORDS,
    ...ACCOUNT_MOMO, ...ACCOUNT_CASH, ...ACCOUNT_BANK,
    ...Object.values(EXPENSE_KEYWORDS).flat(), ...Object.values(INCOME_KEYWORDS).flat(),
  ];
  const removed = new Set(matchedPhraseWords(words, allKeywords));
  if (accountPhrase) accountPhrase.split(' ').forEach((p) => removed.add(p));

  const noteWords = words.filter((w) =>
    !removed.has(w) &&
    !STOP_WORDS.has(w) &&
    !CURRENCY_WORDS.has(w) &&
    !/^\d+$/.test(w) &&
    !isNumberToken(w)
  );
  const note = noteWords.filter((w, i, arr) => arr.indexOf(w) === i).join(' ');

  const title = note || category || '';

  return {
    amount: hasAmount ? amount : 0,
    type,
    category,
    account,
    note,
    title,
    raw,
  };
}
