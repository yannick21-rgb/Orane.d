import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dropdown } from 'react-native-element-dropdown';
import { Palette, Globe } from 'lucide-react-native';
import { useFinance } from '../context/FinanceContext';
import { LanguageManager } from './LanguageManager'; // ✅ Un seul point pour rester dans "screens"

const PAYS_DU_MONDE = [
  { label: 'Afghanistan',           value: 'AF' },
  { label: 'Afrique du Sud',        value: 'ZA' },
  { label: 'Algérie',               value: 'DZ' },
  { label: 'Allemagne',             value: 'DE' },
  { label: 'Angola',                value: 'AO' },
  { label: 'Arabie Saoudite',       value: 'SA' },
  { label: 'Argentine',             value: 'AR' },
  { label: 'Australie',             value: 'AU' },
  { label: 'Autriche',              value: 'AT' },
  { label: 'Belgique',              value: 'BE' },
  { label: 'Bénin',                 value: 'BJ' },
  { label: 'Brésil',                value: 'BR' },
  { label: 'Burkina Faso',          value: 'BF' },
  { label: 'Burundi',               value: 'BI' },
  { label: 'Cameroun',              value: 'CM' },
  { label: 'Canada',                value: 'CA' },
  { label: 'Chili',                 value: 'CL' },
  { label: 'Chine',                 value: 'CN' },
  { label: 'Colombie',              value: 'CO' },
  { label: 'Congo (Brazzaville)',   value: 'CG' },
  { label: 'Congo (Kinshasa)',      value: 'CD' },
  { label: "Côte d'Ivoire",         value: 'CI' },
  { label: 'Corée du Sud',          value: 'KR' },
  { label: 'Cuba',                  value: 'CU' },
  { label: 'Danemark',              value: 'DK' },
  { label: 'Égypte',                value: 'EG' },
  { label: 'Émirats Arabes Unis',   value: 'AE' },
  { label: 'Espagne',               value: 'ES' },
  { label: 'États-Unis',            value: 'US' },
  { label: 'Éthiopie',              value: 'ET' },
  { label: 'Finlande',              value: 'FI' },
  { label: 'France',                value: 'FR' },
  { label: 'Gabon',                 value: 'GA' },
  { label: 'Ghana',                 value: 'GH' },
  { label: 'Grèce',                 value: 'GR' },
  { label: 'Guinée',                value: 'GN' },
  { label: 'Haïti',                 value: 'HT' },
  { label: 'Inde',                  value: 'IN' },
  { label: 'Indonésie',             value: 'ID' },
  { label: 'Iran',                  value: 'IR' },
  { label: 'Irlande',               value: 'IE' },
  { label: 'Islande',               value: 'IS' },
  { label: 'Italie',                value: 'IT' },
  { label: 'Jamaïque',              value: 'JM' },
  { label: 'Japon',                 value: 'JP' },
  { label: 'Jordanie',              value: 'JO' },
  { label: 'Kenya',                 value: 'KE' },
  { label: 'Liban',                 value: 'LB' },
  { label: 'Madagascar',            value: 'MG' },
  { label: 'Malaisie',              value: 'MY' },
  { label: 'Mali',                  value: 'ML' },
  { label: 'Maroc',                 value: 'MA' },
  { label: 'Maurice',               value: 'MU' },
  { label: 'Mauritanie',            value: 'MR' },
  { label: 'Mexique',               value: 'MX' },
  { label: 'Monaco',                value: 'MC' },
  { label: 'Niger',                 value: 'NE' },
  { label: 'Nigéria',               value: 'NG' },
  { label: 'Norvège',               value: 'NO' },
  { label: 'Nouvelle-Zélande',      value: 'NZ' },
  { label: 'Pays-Bas',              value: 'NL' },
  { label: 'Pérou',                 value: 'PE' },
  { label: 'Philippines',           value: 'PH' },
  { label: 'Pologne',               value: 'PL' },
  { label: 'Portugal',              value: 'PT' },
  { label: 'Qatar',                 value: 'QA' },
  { label: 'Royaume-Uni',           value: 'GB' },
  { label: 'Russie',                value: 'RU' },
  { label: 'Rwanda',                value: 'RW' },
  { label: 'Sénégal',               value: 'SN' },
  { label: 'Singapour',             value: 'SG' },
  { label: 'Suède',                 value: 'SE' },
  { label: 'Suisse',                value: 'CH' },
  { label: 'Tchad',                 value: 'TD' },
  { label: 'Thaïlande',             value: 'TH' },
  { label: 'Togo',                  value: 'TG' },
  { label: 'Tunisie',               value: 'TN' },
  { label: 'Turquie',               value: 'TR' },
  { label: 'Ukraine',               value: 'UA' },
  { label: 'Uruguay',               value: 'UY' },
  { label: 'Venezuela',             value: 'VE' },
  { label: 'Viêt Nam',              value: 'VN' },
  { label: 'Zambie',                value: 'ZM' },
  { label: 'Zimbabwe',              value: 'ZW' },
];

const DEVISES_DU_MONDE = [
  { label: '€ (Euro - EUR)',           value: 'EUR' },
  { label: '$ (Dollar US - USD)',      value: 'USD' },
  { label: '£ (Livre Sterling - GBP)', value: 'GBP' },
  { label: 'CHF (Franc Suisse)',       value: 'CHF' },
  { label: 'FCFA (Franc CFA - XOF)',   value: 'XOF' },
  { label: 'FCFA (Franc CFA - XAF)',   value: 'XAF' },
  { label: '$ (Dollar Canadien - CAD)',value: 'CAD' },
  { label: '¥ (Yen Japonais - JPY)',   value: 'JPY' },
  { label: 'DH (Dirham Marocain - MAD)',value: 'MAD' },
  { label: 'DA (Dinar Algérien - DZD)', value: 'DZD' },
  { label: 'DT (Dinar Tunisien - TND)', value: 'TND' },
];

const LANGUES_DISPONIBLES = [
  { label: 'Albanian (Shqip)',        value: 'sq' },
  { label: 'Afrikaans',               value: 'af' },
  { label: 'Amharic (አማርኛ)',          value: 'am' },
  { label: 'Arabic (العربية)',         value: 'ar' },
  { label: 'Armenian (Հայereն)',       value: 'hy' },
  { label: 'Azerbaijani (Azərbaycan)',value: 'az' },
  { label: 'Bengali (বাংলা)',          value: 'bn' },
  { label: 'Bosnian (Bosanski)',      value: 'bs' },
  { label: 'Bulgarian (Български)',   value: 'bg' },
  { label: 'Catalan (Català)',        value: 'ca' },
  { label: 'Chinese (中文 - Simp)',    value: 'zh' },
  { label: 'Croatian (Hrvatski)',     value: 'hr' },
  { label: 'Czech (Čeština)',         value: 'cs' },
  { label: 'Danish (Dansk)',          value: 'da' },
  { label: 'Dutch (Nederlands)',      value: 'nl' },
  { label: 'English',                 value: 'en' },
  { label: 'Estonian (Eesti)',        value: 'et' },
  { label: 'Finnish (Suomi)',         value: 'fi' },
  { label: 'French (Français)',       value: 'fr' },
  { label: 'Georgian (ქართული)',      value: 'ka' },
  { label: 'German (Deutsch)',        value: 'de' },
  { label: 'Greek (Ελληνικά)',        value: 'el' },
  { label: 'Gujarati (ગુજરાતી)',       value: 'gu' },
  { label: 'Haitian Creole (Kreyòl)', value: 'ht' },
  { label: 'Hebrew (עברית)',          value: 'he' },
  { label: 'Hindi (हिन्दी)',           value: 'hi' },
  { label: 'Hungarian (Magyar)',      value: 'hu' },
  { label: 'Icelandic (Íslenska)',    value: 'is' },
  { label: 'Indonesian (Bahasa)',     value: 'id' },
  { label: 'Irish (Gaeilge)',         value: 'ga' },
  { label: 'Italiano',                value: 'it' },
  { label: 'Japanese (日本語)',        value: 'ja' },
  { label: 'Kannada (ಕನ್ನಡ)',          value: 'kn' },
  { label: 'Kazakh (Қазақ)',          value: 'kk' },
  { label: 'Korean (한국어)',          value: 'ko' },
  { label: 'Latvian (Latviešu)',      value: 'lv' },
  { label: 'Lithuanian (Lietuvių)',   value: 'lt' },
  { label: 'Macedonian (Македонски)', value: 'mk' },
  { label: 'Malay (Bahasa Melayu)',   value: 'ms' },
  { label: 'Malayalam (മലയാളം)',      value: 'ml' },
  { label: 'Maltese (Malti)',         value: 'mt' },
  { label: 'Marathi (मраठी)',         value: 'mr' },
  { label: 'Mongolian (Монгол)',      value: 'mn' },
  { label: 'Norwegian (Norsk)',       value: 'no' },
  { label: 'Pashto (پښتو)',           value: 'ps' },
  { label: 'Persian (فارسی)',         value: 'fa' },
  { label: 'Polish (Polski)',         value: 'pl' },
  { label: 'Portuguese (Português)',  value: 'pt' },
  { label: 'Punjabi (ਪੰਜਾਬੀ)',        value: 'pa' },
  { label: 'Romanian (Română)',       value: 'ro' },
  { label: 'Russian (Русский)',       value: 'ru' },
  { label: 'Serbian (Српски)',        value: 'sr' },
  { label: 'Slovak (Slovenčina)',     value: 'sk' },
  { label: 'Slovenian (Slovenščina)', value: 'sl' },
  { label: 'Spanish (Español)',       value: 'es' },
  { label: 'Swahili (Kiswahili)',     value: 'sw' },
  { label: 'Swedish (Svenska)',       value: 'sv' },
  { label: 'Tamil (தமிழ்)',           value: 'ta' },
  { label: 'Telugu (తెలుగు)',          value: 'te' },
  { label: 'Thai (ภาษาไทย)',          value: 'th' },
  { label: 'Turkish (Türkçe)',        value: 'tr' },
  { label: 'Ukrainian (Українська)',  value: 'uk' },
  { label: 'Urdu (اردو)',             value: 'ur' },
  { label: 'Uzbek (Oʻzbek)',          value: 'uz' },
  { label: 'Vietnamese (Tiếng Việt)', value: 'vi' },
  { label: 'Welsh (Cymraeg)',         value: 'cy' },
];

export default function SettingsScreen({ navigation }) {
  const { theme, setTheme, isDark, accentColor, setAccentColor, addTransaction } = useFinance();

  const [currentLang, setCurrentLang] = useState(LanguageManager.currentLanguage);
  const [devise,      setDevise]      = useState('EUR');
  const [pays,        setPays]        = useState('BJ');
  const [lastSalaire, setLastSalaire] = useState(null);
  const [isReady,     setIsReady]     = useState(false);

  // ── Chargement unique persistant et écoute de langue ─────────────────────
  useEffect(() => {
    let isMounted = true;

    const handleLangChange = (newLang) => {
      if (isMounted) setCurrentLang(newLang);
    };
    LanguageManager.listeners.push(handleLangChange);

    const load = async () => {
      await LanguageManager.init();
      if (!isMounted) return;
      setCurrentLang(LanguageManager.currentLanguage);
      
      try {
        const [sd, sp, sls] = await Promise.all([
          AsyncStorage.getItem('@devise'),
          AsyncStorage.getItem('@pays'),
          AsyncStorage.getItem('@last_salaire'),
        ]);
        if (isMounted) {
          if (sd)  setDevise(sd);
          if (sp)  setPays(sp);
          if (sls) setLastSalaire(sls);
        }
      } catch (err) {
        console.error('[Settings] Erreur chargement :', err);
      } finally {
        if (isMounted) setIsReady(true);
      }
    };
    load();

    return () => {
      isMounted = false;
      LanguageManager.listeners = LanguageManager.listeners.filter(l => l !== handleLangChange);
    };
  }, []);

  // ── Sauvegardes persistantes automatiques ──────────────────────────────────
  useEffect(() => { if (isReady) { AsyncStorage.setItem('@devise', devise).catch(console.error); } }, [devise, isReady]);
  useEffect(() => { if (isReady) { AsyncStorage.setItem('@pays', pays).catch(console.error);     } }, [pays, isReady]);

  const colors = {
    bg:             isDark ? '#0f1015' : '#f5f6fa',
    cardBg:         isDark ? '#16171f' : '#ffffff',
    text:           isDark ? '#ffffff' : '#131419',
    subText:        isDark ? '#8c8e9b' : '#6a6c7a',
    unselectedPill: isDark ? '#232430' : '#eef0f5',
    border:         isDark ? '#2a2b38' : '#e8eaef',
    inputBg:        isDark ? '#1c1d28' : '#f0f1f6',
  };

  const themesList  = ['Sombre', 'Clair', 'Système'];
  const colorsList  = ['#3b82f6', '#9b59b6', '#2ecc71', '#ed4c67', '#f39c12'];

  const handleSalaire = () => {
    if (Platform.OS === 'ios' && Alert.prompt) {
      Alert.prompt(
        LanguageManager.t('saveSalary'),
        'Saisissez le montant du salaire :',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Enregistrer',
            onPress: (value) => {
              const montant = parseFloat(value?.replace(',', '.'));
              if (isNaN(montant) || montant <= 0) {
                Alert.alert('Erreur', 'Montant invalide.');
                return;
              }
              addTransaction({
                id:       Date.now().toString(),
                title:    'Salaire',
                amount:   montant,
                type:     'income',
                category: 'Salaire',
                date:     new Date().toISOString(),
              });
              const now = new Date().toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'long', year: 'numeric',
              });
              setLastSalaire(now);
              AsyncStorage.setItem('@last_salaire', now).catch(console.error);
              Alert.alert('✅ Salaire enregistré', `${montant.toFixed(2)} ${devise} ajouté.`);
            },
          },
        ],
        'plain-text', '', 'decimal-pad'
      );
    } else {
      Alert.alert(
        LanguageManager.t('saveSalary'),
        "Pour enregistrer un salaire sur cet appareil, vous allez être redirigé vers l'écran d'ajout.",
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Continuer', onPress: () => navigation?.navigate('Ajout') },
        ]
      );
    }
  };

  const handleRenouveler = () => {
    Alert.alert(
      LanguageManager.t('renewBudget'),
      'Ajouter le salaire du mois pour démarrer un nouveau cycle ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Aller à Ajout', onPress: () => navigation?.navigate('Ajout') },
      ]
    );
  };

  const changeLanguage = async (langValue) => {
    try {
      // 1. Sauvegarde et mise à jour de la configuration de langue sous-jacente
      if (typeof LanguageManager.changeLanguage === 'function') {
        await LanguageManager.changeLanguage(langValue);
      } else if (typeof LanguageManager.setLanguage === 'function') {
        await LanguageManager.setLanguage(langValue);
      } else {
        LanguageManager.currentLanguage = langValue;
        await AsyncStorage.setItem('@app_language', langValue);
      }

      // 2. Notification de tous les listeners actifs dans l'application
      if (LanguageManager.listeners) {
        LanguageManager.listeners.forEach((listener) => {
          if (typeof listener === 'function') {
            try {
              listener(langValue);
            } catch (e) {
              console.error("Erreur lors de la notification d'un listener :", e);
            }
          }
        });
      }

      // 3. Mise à jour de l'état local pour garantir le rafraîchissement immédiat de cet écran
      setCurrentLang(langValue);

    } catch (error) {
      console.error("Erreur lors du changement de langue :", error);
      Alert.alert("Erreur", "Impossible de changer la langue.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.pageTitle, { color: colors.text }]}>
          {LanguageManager.t('settings')}
        </Text>

        {/* ── Actions budgétaires ──────────────────────────────────────── */}
        <View style={styles.topActionsContainer}>
          <Text style={[styles.infoText, { color: colors.subText }]}>
            {LanguageManager.t('lastSalary')} : {lastSalaire ?? 'Jamais enregistré'}
          </Text>

          <TouchableOpacity
            style={[styles.actionBtnSecondary, { borderColor: colors.border }]}
            onPress={handleSalaire}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionBtnText, { color: colors.text }]}>
              {LanguageManager.t('saveSalary')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtnPrimary, { backgroundColor: accentColor }]}
            onPress={handleRenouveler}
            activeOpacity={0.85}
          >
            <Text style={[styles.actionBtnText, { color: '#ffffff' }]}>
              {LanguageManager.t('renewBudget')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Personnalisation Visuelle ───────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <View style={styles.sectionHeader}>
            <Palette size={20} color={colors.subText} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {LanguageManager.t('visualCustom')}
            </Text>
          </View>
        
          <Text style={[styles.label, { color: colors.subText }]}>{LanguageManager.t('theme')}</Text>
          <View style={styles.pillRow}>
            {themesList.map((t) => {
              const isActive = theme === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.pillBtn,
                    { backgroundColor: isActive ? accentColor : colors.unselectedPill },
                  ]}
                  onPress={() => setTheme(t)}
                >
                  <Text style={[styles.pillText, { color: isActive ? '#fff' : colors.subText }]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.subText }]}>Couleur principale</Text>
          <View style={styles.colorRow}>
            {colorsList.map((c) => {
              const isSelected = accentColor === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircleOuter,
                    isSelected && { borderColor: c, borderWidth: 2.5 },
                  ]}
                  onPress={() => setAccentColor(c)}
                >
                  <View style={[styles.colorCircleInner, { backgroundColor: c }]} />
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Localisation & Région (Réintégrée ici !) ───────────────── */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <View style={styles.sectionHeader}>
            <Globe size={20} color={colors.subText} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Localisation & Région
            </Text>
          </View>

          {/* SÉLECTEUR DE LANGUE */}
          <Text style={[styles.label, { color: colors.subText }]}>Langue de l'application</Text>
          <Dropdown
            style={[styles.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            placeholderStyle={[styles.placeholderStyle, { color: colors.subText }]}
            selectedTextStyle={[styles.selectedTextStyle, { color: colors.text }]}
            containerStyle={[styles.dropdownContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            itemTextStyle={{ color: colors.text }}
            activeColor={colors.inputBg}
            data={LANGUES_DISPONIBLES}
            labelField="label"
            valueField="value"
            placeholder="Choisir une langue"
            value={currentLang}
            onChange={(item) => changeLanguage(item.value)}
          />

          {/* SÉLECTEUR DE DEVISE */}
          <Text style={[styles.label, { color: colors.subText }]}>Devise principale</Text>
          <Dropdown
            style={[styles.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            placeholderStyle={[styles.placeholderStyle, { color: colors.subText }]}
            selectedTextStyle={[styles.selectedTextStyle, { color: colors.text }]}
            containerStyle={[styles.dropdownContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            itemTextStyle={{ color: colors.text }}
            activeColor={colors.inputBg}
            data={DEVISES_DU_MONDE}
            labelField="label"
            valueField="value"
            placeholder="Choisir une devise"
            value={devise}
            onChange={(item) => setDevise(item.value)}
          />

          {/* SÉLECTEUR DE PAYS */}
          <Text style={[styles.label, { color: colors.subText }]}>Pays de résidence</Text>
          <Dropdown
            style={[styles.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            placeholderStyle={[styles.placeholderStyle, { color: colors.subText }]}
            selectedTextStyle={[styles.selectedTextStyle, { color: colors.text }]}
            containerStyle={[styles.dropdownContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            itemTextStyle={{ color: colors.text }}
            activeColor={colors.inputBg}
            data={PAYS_DU_MONDE}
            labelField="label"
            valueField="value"
            placeholder="Choisir un pays"
            value={pays}
            onChange={(item) => setPays(item.value)}
          />
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { padding: 16 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  topActionsContainer: { marginBottom: 24 },
  infoText: { fontSize: 14, marginBottom: 10 },
  actionBtnPrimary: { padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  actionBtnSecondary: { padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, marginTop: 10 },
  actionBtnText: { fontWeight: '600', fontSize: 15 },
  card: { padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  label: { fontSize: 14, marginBottom: 8, marginTop: 12 },
  pillRow: { flexDirection: 'row', gap: 10 },
  pillBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  pillText: { fontSize: 14, fontWeight: '500' },
  colorRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
  colorCircleOuter: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  colorCircleInner: { width: 26, height: 26, borderRadius: 13 },
  checkmark: { color: '#fff', fontSize: 12, position: 'absolute', fontWeight: 'bold' },
  dropdown: { height: 50, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, marginTop: 4 },
  placeholderStyle: { fontSize: 15 },
  selectedTextStyle: { fontSize: 15 },
  dropdownContainer: { borderRadius: 8, borderWidth: 1 },
});