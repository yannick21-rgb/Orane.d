/**
 * scripts/add-auth-translations.js
 *
 * Ajoute Surgicalement un bloc de clés d'authentification aux 66 dictionnaires
 * de `src/utils/LanguageManager.js`, sans toucher au reste du fichier.
 *
 * Pourquoi : `LoginScreen` / `RegisterScreen` appelaient `t('Bienvenue')`,
 * `t('Se connecter')`… — des chaînes françaises utilisées comme clés. Comme
 * `t()` retombe sur la clé, l'écran s'affichait correctement en français mais
 * restait en français dans les 65 autres langues.
 *
 * Les traductions passent par le même moteur que `generate-translations.js`
 * (Google Translate, client `dict-chrome-ex`), avec MyMemory en secours.
 *
 * Usage : node scripts/add-auth-translations.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'utils', 'LanguageManager.js');
const DRY = process.argv.includes('--dry-run');
const SEP = '\n===\n';

/** Les neuf libellés de l'écran de connexion / inscription. */
const ENTRIES = [
  ['bienvenue', 'Bienvenue'],
  ['mot_de_passe', 'Mot de passe'],
  ['se_connecter', 'Se connecter'],
  ['s_inscrire', "S'inscrire"],
  ['creer_un_compte', 'Créer un compte'],
  ['nom_complet', 'Nom complet'],
  ['confirmer_mot_de_passe', 'Confirmer le mot de passe'],
  ['pas_de_compte', 'Pas de compte ?'],
  ['deja_un_compte', 'Déjà un compte ?'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function google(text, lang) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=fr&tl=' +
    lang +
    '&dt=t&q=' +
    encodeURIComponent(text);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  return data[0].map((seg) => seg[0]).join('');
}

async function myMemory(text, lang) {
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(text) +
    '&langpair=fr|' +
    lang;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (data.quotaFinished) throw new Error('quota');
  return data.responseData.translatedText;
}

/**
 * Les moteurs de traduction collent parfois leur ponctuation de fin de phrase
 * (l'urdu ajoute « ۔ ») ou un tiret insécable de césure (gaélique, gallois).
 * On nettoie : ces libellés sont des titres de bouton, pas des phrases.
 */
function tidy(value, lang) {
  let out = value.replace(/­/g, '').replace(/\s+/g, ' ').trim();
  if (lang === 'ur') out = out.replace(/۔+$/, '').trim();
  return out;
}

async function translate(text, lang) {
  for (const engine of [google, myMemory]) {
    try {
      const out = await engine(text, lang);
      if (out && !/\n/.test(out.trim())) return tidy(out, lang);
    } catch (_) {
      /* moteur suivant */
    }
    await sleep(250);
  }
  return null;
}

/** Bloc `  xx: {` … `  },` dans le source. */
function findBlocks(src) {
  const re = /^ {2}([a-z]{2}(?:-[A-Za-z]+)?): \{$/gm;
  const blocks = [];
  let m;
  while ((m = re.exec(src))) {
    const closeRe = /^ {2}\},$/gm;
    closeRe.lastIndex = m.index + m[0].length;
    const close = closeRe.exec(src);
    if (!close) continue;
    blocks.push({
      lang: m[1],
      start: m.index + m[0].length, // première ligne du corps
      end: close.index, // début de `  },`
    });
  }
  return blocks;
}

(async () => {
  const src = fs.readFileSync(FILE, 'utf8');
  const blocks = findBlocks(src);
  console.log(`${blocks.length} langues trouvées dans LanguageManager.js\n`);

  // les insertions se font de la fin vers le début pour garder les offsets valides
  const insertions = [];
  const skipped = [];
  let failed = 0;

  for (const block of blocks) {
    const body = src.slice(block.start, block.end);
    const missing = ENTRIES.filter(([key]) => !new RegExp(`^ {4}${key}:`, 'm').test(body));
    if (!missing.length) {
      skipped.push(`${block.lang} (déjà à jour)`);
      continue;
    }

    const values = [];
    for (const [key, source] of missing) {
      if (block.lang === 'fr') {
        values.push([key, source]);
        continue;
      }
      process.stdout.write(`  ${block.lang} ${key}… `);
      const out = await translate(source, block.lang);
      if (!out) {
        console.log('ÉCHEC');
        failed++;
        break;
      }
      console.log(out);
      values.push([key, out]);
      await sleep(150);
    }
    if (values.length !== missing.length) {
      skipped.push(`${block.lang} (traduction incomplète — la langue retombe sur le fr)`);
      continue;
    }

    const lines = values
      .map(([key, val]) => `    ${key}: '${val.replace(/'/g, "\\'").replace(/\n/g, ' ')}',\n`)
      .join('');
    insertions.push({ at: block.end, text: lines });
  }

  let out = src;
  for (const ins of insertions.sort((a, b) => b.at - a.at)) {
    out = out.slice(0, ins.at) + ins.text + out.slice(ins.at);
  }

  console.log(`\n${insertions.length} bloc(s) mis à jour, ${skipped.length} inchangé(s).`);
  if (skipped.length) console.log('  ' + skipped.join('\n  '));
  if (failed) console.log(`\n${failed} clé(s) sans traduction : le francais de repli s'appliquera.`);

  if (DRY) {
    console.log('\n--dry-run : aucune écriture.');
  } else {
    fs.writeFileSync(FILE, out);
    console.log(`\nÉcrit : ${path.relative(process.cwd(), FILE)}`);
  }
})();
