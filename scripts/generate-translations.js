const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// ── 1. Langues cibles (codes ISO) ────────────────────────────────────────
const TARGET_LANGS = [
  'af','sq','am','ar','hy','az','bn','bs','bg','ca','zh','hr','cs','da',
  'nl','en','et','fi','fr','ka','de','el','gu','ht','he','hi','hu','is',
  'id','ga','it','ja','kn','kk','ko','lv','lt','mk','ms','ml','mt','mr',
  'mn','no','ps','fa','pl','pt','pa','ro','ru','sr','sk','sl','es','sw',
  'sv','ta','te','th','tr','uk','ur','uz','vi','cy',
];

// ── 2. Texte source (français) — toutes les clés ─────────────────────────
// Format: clé → valeur, extrait de LanguageManager.js
const FRENCH_ENTRIES = [
  // Général
  ["settings","Paramètres"],
  ["home","Accueil"],
  ["add","Ajouter"],
  ["stats","Stats"],
  ["supprimer","Supprimer"],
  ["annuler","Annuler"],
  ["enregistrer","Enregistrer"],
  ["valide","Validé"],
  ["info","Info"],
  ["erreur","Erreur"],
  ["general","Général"],
  ["oui","Oui"],
  ["non","Non"],

  // HomeScreen
  ["solde_total","Solde Total"],
  ["revenus","▲ Revenus"],
  ["depenses","▼ Dépenses"],
  ["toutes_operations","Toutes les opérations"],
  ["appuie_poubelle","Appuie sur la poubelle pour supprimer"],
  ["aucune_operation","Aucune opération pour le moment."],
  ["ajouter_premiere","Ajouter ma première transaction"],
  ["cette_operation","cette opération"],

  // AddTransactionScreen
  ["nouvelle_operation","Nouvelle Opération"],
  ["type_operation","TYPE D'OPÉRATION"],
  ["depense","▼ Dépense"],
  ["revenu","▲ Revenu"],
  ["regularite_revenu","RÉGULARITÉ DU REVENU"],
  ["non_fixe","Non fixe"],
  ["hebdo","Hebdo"],
  ["mensuel","Mensuel"],
  ["retrait_mobile","RETRAIT MOBILE MONEY"],
  ["calculer_frais","Calculer et inclure les frais réseau"],
  ["choix_reseau","CHOIX DU RÉSEAU (BÉNIN)"],
  ["mtn_momo","MTN MoMo"],
  ["moov_money","Moov Money"],
  ["celtiis_cash","Celtiis Cash"],
  ["titre","TITRE"],
  ["placeholder_titre","Ex : Courses, Loyer, Virement..."],
  ["montant","MONTANT"],
  ["note","NOTE"],
  ["placeholder_note","Ex : Courses semaine, Facture..."],
  ["categorie","CATÉGORIE"],
  ["enregistrer_operation","Enregistrer l'opération"],
  ["champ_requis","Champ requis"],
  ["veuillez_titre","Veuillez saisir un titre."],
  ["montant_invalide","Montant invalide"],
  ["veuillez_montant","Veuillez saisir un montant supérieur à 0."],
  ["frais_retrait","Frais de retrait"],

  // Catégories dépenses
  ["alimentation","Alimentation"],
  ["transport","Transport"],
  ["logement","Logement"],
  ["sante","Santé"],
  ["loisirs","Loisirs"],
  ["vetements","Vêtements"],
  ["epargne","Épargne"],
  ["abonnements_tech","Abonnements & Tech"],
  ["sport","Sport"],
  ["habillement","Habillement"],
  ["remboursement","Remboursement"],
  ["frais_retraits_cat","Frais & Retraits"],
  ["education_formation","Education/Formation"],
  ["autres","Autres"],

  // Catégories revenus
  ["salaire_coaching","Salaire / Coaching"],
  ["freelance_dev","Freelance / Dev"],
  ["projets_web","Projets Web"],
  ["cadeau","Cadeau"],
  ["emprunt","Emprunt"],
  ["ventes","Ventes"],

  // SettingsScreen
  ["visualCustom","Personnalisation Visuelle"],
  ["locPreferences","Localisation & Préférences"],
  ["theme","Thème"],
  ["language","Langue"],
  ["currency","Devise"],
  ["country","Pays"],
  ["mon_compte","Mon compte"],
  ["nom","Nom"],
  ["votre_nom","Votre nom"],
  ["adresse_email","Adresse Email"],
  ["votre_email","Votre email"],
  ["couleur_principale","Couleur principale"],
  ["sombre","Sombre"],
  ["clair","Clair"],
  ["systeme","Système"],
  ["choisir_langue","Choisir une langue"],
  ["choisir_devise","Choisir une devise"],
  ["choisir_pays","Choisir un pays"],
  ["se_deconnecter","Se déconnecter"],
  ["deconnexion","Déconnexion"],
  ["message_deconnexion","Êtes-vous sûr de vouloir vous déconnecter ?"],
  ["oui_deconnecter","Oui, me déconnecter"],
  ["redirection","Redirection vers l'écran d'inscription/connexion..."],
  ["champ_vide","Les champs ne peuvent pas être vides."],
  ["sauvegarde_impossible","Impossible de sauvegarder les modifications."],
  ["langue_impossible","Impossible de changer la langue."],
  ["saveSalary","Enregistrer le salaire"],
  ["renewBudget","Renouveler le budget"],
  ["lastSalary","Dernier salaire : "],

  // StatsScreen
  ["statsTitle","Bilans & Analyses"],
  ["jour","Jour"],
  ["7j","7 jours"],
  ["semaine","Semaine"],
  ["mois","Mois"],
  ["perso","Perso"],
  ["tout","Tout"],
  ["otherPeriodPlaceholder","Autre période..."],
  ["startDateLabel","Début"],
  ["endDateLabel","Fin"],
  ["incomeLabel","▲ Revenus"],
  ["expenseLabel","▼ Dépenses"],
  ["netBalanceLabel","Solde Net"],
  ["operationLabel","opération"],
  ["operationsLabel","opérations"],
  ["emptyTransactions","Aucune transaction pour cette période."],
  ["chartTitle","DÉPENSES PAR CATÉGORIE"],
  ["distributionTitle","RÉPARTITION DU BUDGET"],
  ["noDataLabel","Aucune"],
  ["suivi_dettes","SUIVI DES PRÊTS & DETTES"],
  ["emprunte","Emprunté"],
  ["rembourse","Remboursé"],
  ["reste_rembourser","Reste à rembourser :"],
  ["frais_retrait_mobiles","FRAIS DE RETRAIT MOBILES"],
  ["activite_quotidienne","ACTIVITÉ DES DÉPENSES QUOTIDIENNES (7J)"],

  // Gamification
  ["niveau","Niveau"],
  ["xp","XP"],
  ["progression","Progression"],
  ["progres","Progrès"],
  ["voir_progres","Voir mes progrès"],
  ["series","Séries"],
  ["badges","Badges"],
  ["defis_semaine","Défis de la semaine"],
  ["bientot","Bientôt"],
  ["verrouille","Verrouillé"],
  ["debloque","Débloqué"],
  ["a_faire","À faire"],
  ["termine","Terminé"],
  ["niveau_xp_label","Niveau {level} — {current} / {total} XP"],
  ["streak_budget","Budget maîtrisé"],
  ["streak_budget_desc","Mois consécutifs sans dépassement"],
  ["streak_balanced","Mois équilibré"],
  ["streak_balanced_desc","Mois où les dépenses n'ont pas dépassé les revenus"],
  ["streak_categorization","Catégorisation"],
  ["streak_categorization_desc","Jours consécutifs avec dépenses catégorisées"],
  ["streak_review","Revue hebdo"],
  ["streak_review_desc","Semaines consécutives avec revue (bientôt)"],
  ["badge_first_expense","Premier pas"],
  ["badge_first_expense_desc","Première dépense ajoutée"],
  ["badge_organized_50","Organisé"],
  ["badge_organized_50_desc","50 dépenses catégorisées"],
  ["badge_budget_master","Budget master"],
  ["badge_budget_master_desc","3 mois consécutifs sans dépassement"],
  ["badge_balanced_3m","Équilibre"],
  ["badge_balanced_3m_desc","3 mois équilibrés d'affilée"],
  ["badge_tontine_pro","Tontine pro"],
  ["badge_tontine_pro_desc","6 tours de tontine payés à l'heure"],
  ["badge_debts_check","Dettes sous contrôle"],
  ["badge_debts_check_desc","5 dettes remboursées"],
  ["badge_level_5","Niveau 5"],
  ["badge_level_5_desc","Atteint le niveau 5"],
  ["badge_level_10","Niveau 10"],
  ["badge_level_10_desc","Atteint le niveau 10"],
  ["challenge_c1_title","15 opérations cette semaine"],
  ["challenge_c1_desc","Ajoute 15 opérations d'ici dimanche"],
  ["challenge_c2_title","3 jours d'activité"],
  ["challenge_c2_desc","Enregistre des opérations 3 jours différents"],
  ["challenge_c3_title","Tout catégorisé"],
  ["challenge_c3_desc","Aucune dépense non catégorisée cette semaine"],
  ["xp_gagne","+{amount} XP"],
  ["dette_remboursee_xp","Dette remboursée à temps"],
  ["tontine_payee_xp","Tontine payée à l'heure"],
  ["defi_termine","Défi terminé !"],
  ["record","Record"],
  ["actuel","Actuel"],
];

const FR_KEYS = FRENCH_ENTRIES.map(e => e[0]);
const FR_VALS = FRENCH_ENTRIES.map(e => e[1]);
const SEP = "\n===\n";

// ── 3. Fonction de traduction via Google Translate (API gratuite) ────────
async function translate(text, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url, { timeout: 15000 });
    const data = await res.json();
    // data = [[["translated","original",...],...], null, detectedLang]
    let result = '';
    for (const segment of data[0]) {
      result += segment[0];
    }
    return result;
  } catch (err) {
    console.error(`  Erreur pour ${targetLang}: ${err.message}`);
    return null;
  }
}

// ── 4. Génération ────────────────────────────────────────────────────────
async function generateAll() {
  const sourceText = FR_VALS.join(SEP);
  const allTranslations = {};

  for (let i = 0; i < TARGET_LANGS.length; i++) {
    const lang = TARGET_LANGS[i];
    process.stdout.write(`[${i+1}/${TARGET_LANGS.length}] ${lang}... `);

    if (lang === 'fr') {
      allTranslations['fr'] = {};
      FR_KEYS.forEach((key, idx) => { allTranslations['fr'][key] = FR_VALS[idx]; });
      console.log('OK (source)');
      continue;
    }

    const translated = await translate(sourceText, lang);
    if (!translated) {
      console.log('ÉCHEC');
      continue;
    }

    const parts = translated.split(SEP);
    const result = {};
    // Certaines langues peuvent avoir des différences dans le split
    // On prend les N premières parties correspondant au nombre de clés
    for (let j = 0; j < FR_KEYS.length && j < parts.length; j++) {
      result[FR_KEYS[j]] = parts[j].trim();
    }
    allTranslations[lang] = result;
    console.log('OK (' + Object.keys(result).length + ' clés)');

    // Petit délai pour ne pas surcharger l'API
    await new Promise(r => setTimeout(r, 300));
  }

  return allTranslations;
}

// ── 5. Génération du fichier ─────────────────────────────────────────────
function generateFileContent(allTranslations) {
  let code = `// LanguageManager.js — Généré automatiquement (${new Date().toISOString()})\n`;
  code += `// Traductions pour ${Object.keys(allTranslations).length} langues\n\n`;
  code += `import AsyncStorage from '@react-native-async-storage/async-storage';\n`;
  code += `import { useState, useEffect } from 'react';\n\n`;
  code += `export const translations = {\n`;

  for (const [lang, entries] of Object.entries(allTranslations)) {
    code += `  ${lang}: {\n`;
    for (const [key, val] of Object.entries(entries)) {
      const escaped = val.replace(/'/g, "\\'");
      const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
    code += `    ${keyStr}: '${escaped}',\n`;
    }
    code += `  },\n`;
  }

  code += `};\n\n`;
  code += `export const LanguageManager = {\n`;
  code += `  currentLanguage: 'fr',\n`;
  code += `  listeners: [],\n\n`;
  code += `  async init() {\n`;
  code += `    try {\n`;
  code += `      const saved = await AsyncStorage.getItem('@langue');\n`;
  code += `      if (saved && translations[saved]) {\n`;
  code += `        this.currentLanguage = saved;\n`;
  code += `      }\n`;
  code += `    } catch (e) {\n`;
  code += `      console.error(e);\n`;
  code += `    }\n`;
  code += `    this.listeners.forEach(callback => callback(this.currentLanguage));\n`;
  code += `  },\n\n`;
  code += `  async changeLanguage(newLang) {\n`;
  code += `    this.currentLanguage = newLang;\n`;
  code += `    try {\n`;
  code += `      await AsyncStorage.setItem('@langue', newLang);\n`;
  code += `    } catch (e) {\n`;
  code += `      console.error(e);\n`;
  code += `    }\n`;
  code += `    this.listeners.forEach(callback => callback(newLang));\n`;
  code += `  },\n\n`;
  code += `  t(key) {\n`;
  code += `    return translations[this.currentLanguage]?.[key] || translations['fr'][key] || key;\n`;
  code += `  },\n\n`;
  code += `  subscribe(callback) {\n`;
  code += `    this.listeners.push(callback);\n`;
  code += `  },\n`;
  code += `  unsubscribe(callback) {\n`;
  code += `    this.listeners = this.listeners.filter(cb => cb !== callback);\n`;
  code += `  }\n`;
  code += `};\n\n`;
  code += `export function useTranslation() {\n`;
  code += `  const [lang, setLang] = useState(LanguageManager.currentLanguage);\n\n`;
  code += `  useEffect(() => {\n`;
  code += `    const handleLanguageChange = (newLang) => setLang(newLang);\n`;
  code += `    LanguageManager.subscribe(handleLanguageChange);\n`;
  code += `    return () => LanguageManager.unsubscribe(handleLanguageChange);\n`;
  code += `  }, []);\n\n`;
  code += `  return {\n`;
  code += `    t: (key) => LanguageManager.t(key),\n`;
  code += `    currentLanguage: lang,\n`;
  code += `    changeLanguage: (newLang) => LanguageManager.changeLanguage(newLang)\n`;
  code += `  };\n`;
  code += `}\n`;

  return code;
}

// ── MAIN ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== GÉNÉRATION DES TRADUCTIONS POUR ' + TARGET_LANGS.length + ' LANGUES ===\n');
  console.log('Source: ' + FR_KEYS.length + ' clés en français\n');

  const allTranslations = await generateAll();
  const code = generateFileContent(allTranslations);

  const outputPath = path.join(__dirname, '..', 'src', 'screens', 'LanguageManager.js');
  fs.writeFileSync(outputPath, code, 'utf8');
  console.log('\n✅ Fichier généré: ' + outputPath);
  console.log('📊 ' + Object.keys(allTranslations).length + ' langues, ' + FR_KEYS.length + ' clés chacune');
}

main().catch(console.error);
