import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dropdown } from 'react-native-element-dropdown';
import { Palette, Globe, User, LogOut, Edit2, Check, X } from 'lucide-react-native';
import { useFinance } from '../context/FinanceContext';
import { LanguageManager } from './LanguageManager'; 

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
  { label: 'Armenian (Հայereﻨ)',       value: 'hy' },
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
  { label: 'Hebrew (עבריit)',          value: 'he' },
  { label: 'Hindi (हिन्दी)',           value: 'hi' },
  { label: 'Hungarian (Magyar)',      value: 'hu' },
  { label: 'Icelandic (Íslenska)',    value: 'is' },
  { label: 'Indonesian (Bahasa)',     value: 'id' },
  { label: 'Irish (Gaeilge)',         value: 'ga' },
  { label: 'Italiano',                value: 'it' },
  { label: 'Japanese (日本語)',        value: 'ja' },
  { label: 'Kannada (ಕನ್ನಡ)',          value: 'kn' },
  { label: 'Kazakh (Қαзақ)',          value: 'kk' },
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
  { label: 'Punjabi (ภัญจาบี)',        value: 'pa' },
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
  const { theme, setTheme, isDark, accentColor, setAccentColor } = useFinance();

  const [currentLang, setCurrentLang] = useState(LanguageManager.currentLanguage);
  const [devise,      setDevise]      = useState('EUR');
  const [pays,        setPays]        = useState('BJ');
  const [isReady,     setIsReady]     = useState(false);

  // États pour le profil et l'édition
  const [userProfile, setUserProfile] = useState({ name: 'Mathieu', email: 'contact@finance.com' });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

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
        const [sd, sp, sName, sEmail] = await Promise.all([
          AsyncStorage.getItem('@devise'),
          AsyncStorage.getItem('@pays'),
          AsyncStorage.getItem('@user_name'),
          AsyncStorage.getItem('@user_email'),
        ]);
        if (isMounted) {
          if (sd) setDevise(sd);
          if (sp) setPays(sp);
          
          const finalName = sName || 'Mathieu';
          const finalEmail = sEmail || 'contact@finance.com';
          setUserProfile({ name: finalName, email: finalEmail });
          setEditName(finalName);
          setEditEmail(finalEmail);
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
    danger:         '#ef4444',
  };

  const themesList  = [
    currentLang === 'en' ? 'Dark' : (currentLang === 'es' ? 'Oscuro' : 'Sombre'),
    currentLang === 'en' ? 'Light' : (currentLang === 'es' ? 'Claro' : 'Clair'),
    currentLang === 'en' ? 'System' : (currentLang === 'es' ? 'Sistema' : 'Système')
  ];
  
  // Palette de 20 couleurs : Les 8 premières basiques + 12 nouvelles nuances minimalistes, sobres et modernes
  const colorsList  = [
    // ── Les 8 premières originales ──
    '#3b82f6', // Bleu standard
    '#9b59b6', // Violet classique
    '#2ecc71', // Vert émeraude
    '#ed4c67', // Rouge rubis
    '#f39c12', // Orange corail
    '#00d2d3', // Cyan
    '#f78fb3', // Rose fuchsia
    '#2c3e50', // Ardoise foncé

    // ── Les 12 nouvelles ajouts minimalistes & esthétiques ──
    '#4a5568', // Gris Ardoise moyen
    '#718096', // Gris Acier bleuté
    '#a0aec0', // Gris Galet clair
    '#1a365d', // Bleu Marine Profond
    '#2b6cb0', // Bleu Denim adouci
    '#4eb3a2', // Vert Sauge / Eucalyptus
    '#81e6d9', // Vert Menthe pastel doux
    '#dd6b20', // Terre cuite / Terracotta
    '#e53e3e', // Rouge Brique mat
    '#b7791f', // Vieux Doré / Moutarde
    '#d69e2e', // Sable chaud
    '#6b46c1'  // Violet Aubergine feutré
  ];

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      Alert.alert("Erreur", "Les champs ne peuvent pas être vides.");
      return;
    }
    try {
      await Promise.all([
        AsyncStorage.setItem('@user_name', editName.trim()),
        AsyncStorage.setItem('@user_email', editEmail.trim()),
      ]);
      setUserProfile({ name: editName.trim(), email: editEmail.trim() });
      setIsEditing(false);
    } catch (error) {
      console.error("Erreur sauvegarde profil :", error);
      Alert.alert("Erreur", "Impossible de sauvegarder les modifications.");
    }
  };

  const handleCancelEdit = () => {
    setEditName(userProfile.name);
    setEditEmail(userProfile.email);
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      currentLang === 'en' ? 'Logout' : 'Déconnexion',
      currentLang === 'en' ? 'Are you sure you want to log out?' : 'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: currentLang === 'en' ? 'Cancel' : 'Annuler', style: 'cancel' },
        { 
          text: currentLang === 'en' ? 'Yes, Logout' : 'Oui, me déconnecter', 
          style: 'destructive',
          onPress: async () => {
            Alert.alert("Info", "Redirection vers l'écran d'inscription/connexion...");
          }
        }
      ]
    );
  };

  const changeLanguage = async (langValue) => {
    try {
      if (typeof LanguageManager.changeLanguage === 'function') {
        await LanguageManager.changeLanguage(langValue);
      } else if (typeof LanguageManager.setLanguage === 'function') {
        await LanguageManager.setLanguage(langValue);
      } else {
        LanguageManager.currentLanguage = langValue;
        await AsyncStorage.setItem('@app_language', langValue);
      }

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
      setCurrentLang(langValue);
    } catch (error) {
      console.error("Erreur lors du changement de langue :", error);
      Alert.alert("Erreur", "Impossible de changer la langue.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.pageTitle, { color: colors.text }]}>
            {LanguageManager.t('settings')}
          </Text>

          {/* ── SECTION COMPTE ET ÉDITION ───────────────────────────────── */}
          <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
            <View style={styles.sectionHeaderBetween}>
              <View style={styles.sectionHeaderLeft}>
                <User size={20} color={colors.subText} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {currentLang === 'en' ? 'My Account' : (currentLang === 'es' ? 'Mi cuenta' : 'Mon compte')}
                </Text>
              </View>
              
              {!isEditing && (
                <TouchableOpacity onPress={() => setIsEditing(true)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <Edit2 size={16} color={accentColor} />
                </TouchableOpacity>
              )}
            </View>

            {!isEditing ? (
              /* Mode Affichage Normal */
              <View style={styles.profileRow}>
                <View style={[styles.avatarCircle, { backgroundColor: accentColor }]}>
                  <Text style={styles.avatarLetter}>
                    {userProfile.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={[styles.userName, { color: colors.text }]}>{userProfile.name}</Text>
                  <Text style={[styles.userEmail, { color: colors.subText }]}>{userProfile.email}</Text>
                </View>
              </View>
            ) : (
              /* Mode Formulaire d'Édition */
              <View style={styles.editForm}>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>Nom</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Votre nom"
                  placeholderTextColor={colors.subText}
                />

                <Text style={[styles.inputLabel, { color: colors.subText, marginTop: 10 }]}>Adresse Email</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Votre email"
                  placeholderTextColor={colors.subText}
                />

                <View style={styles.actionFormRow}>
                  <TouchableOpacity style={[styles.formBtn, { backgroundColor: colors.unselectedPill }]} onPress={handleCancelEdit}>
                    <X size={16} color={colors.subText} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.subText, fontWeight: '600' }}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.formBtn, { backgroundColor: accentColor }]} onPress={handleSaveProfile}>
                    <Check size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
              {themesList.map((t, index) => {
                const rawThemes = ['Sombre', 'Clair', 'Système'];
                const isActive = theme === rawThemes[index] || theme === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.pillBtn,
                      { backgroundColor: isActive ? accentColor : colors.unselectedPill },
                    ]}
                    onPress={() => setTheme(rawThemes[index])}
                  >
                    <Text style={[styles.pillText, { color: isActive ? '#fff' : colors.subText }]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.subText }]}>
              {currentLang === 'en' ? 'Main Color' : (currentLang === 'es' ? 'Color principal' : 'Couleur principale')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRowContainer}>
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
            </ScrollView>
          </View>

          {/* ── Localisation & Région ───────────────── */}
          <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
            <View style={styles.sectionHeader}>
              <Globe size={20} color={colors.subText} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {LanguageManager.t('locPreferences')}
              </Text>
            </View>

            {/* SÉLECTEUR DE LANGUE */}
            <Text style={[styles.label, { color: colors.subText }]}>{LanguageManager.t('language')}</Text>
            <Dropdown
              key={`lang-${currentLang}`}
              style={[styles.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              placeholderStyle={[styles.placeholderStyle, { color: colors.subText }]}
              selectedTextStyle={[styles.selectedTextStyle, { color: colors.text }]}
              containerStyle={[styles.dropdownContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              itemTextStyle={{ color: colors.text }}
              activeColor={colors.inputBg}
              data={LANGUES_DISPONIBLES}
              labelField="label"
              valueField="value"
              placeholder={currentLang === 'en' ? 'Choose a language' : (currentLang === 'es' ? 'Elegir un idioma' : 'Choisir une langue')}
              value={currentLang}
              onChange={(item) => changeLanguage(item.value)}
            />

            {/* SÉLECTEUR DE DEVISE */}
            <Text style={[styles.label, { color: colors.subText }]}>{LanguageManager.t('currency')}</Text>
            <Dropdown
              key={`devise-${currentLang}`}
              style={[styles.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              placeholderStyle={[styles.placeholderStyle, { color: colors.subText }]}
              selectedTextStyle={[styles.selectedTextStyle, { color: colors.text }]}
              containerStyle={[styles.dropdownContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              itemTextStyle={{ color: colors.text }}
              activeColor={colors.inputBg}
              data={DEVISES_DU_MONDE}
              labelField="label"
              valueField="value"
              placeholder={currentLang === 'en' ? 'Choose a currency' : (currentLang === 'es' ? 'Elegir una moneda' : 'Choisir une devise')}
              value={devise}
              onChange={(item) => setDevise(item.value)}
            />

            {/* SÉLECTEUR DE PAYS */}
            <Text style={[styles.label, { color: colors.subText }]}>{LanguageManager.t('country')}</Text>
            <Dropdown
              key={`pays-${currentLang}`}
              style={[styles.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              placeholderStyle={[styles.placeholderStyle, { color: colors.subText }]}
              selectedTextStyle={[styles.selectedTextStyle, { color: colors.text }]}
              containerStyle={[styles.dropdownContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              itemTextStyle={{ color: colors.text }}
              activeColor={colors.inputBg}
              data={PAYS_DU_MONDE}
              labelField="label"
              valueField="value"
              placeholder={currentLang === 'en' ? 'Choose a country' : (currentLang === 'es' ? 'Elegir un país' : 'Choisir un pays')}
              value={pays}
              onChange={(item) => setPays(item.value)}
            />
          </View>

          {/* ── BOUTON SE DÉCONNECTER TOUT EN BAS ──────────────────────── */}
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LogOut size={16} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>
              {currentLang === 'en' ? 'Log Out' : (currentLang === 'es' ? 'Cerrar sesión' : 'Se déconnecter')}
            </Text>
          </TouchableOpacity>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { padding: 16 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionHeaderBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  
  // Profil normal
  profileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  profileInfo: { marginLeft: 16, flex: 1 },
  userName: { fontSize: 17, fontWeight: '600' },
  userEmail: { fontSize: 14, marginTop: 2 },

  // Édition formulaire
  editForm: { marginTop: 4 },
  inputLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  textInput: { height: 44, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  actionFormRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  formBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },

  // Déconnexion
  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 14, 
    borderRadius: 12, 
    borderWidth: 1, 
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  logoutText: { fontSize: 15, fontWeight: '600' },

  label: { fontSize: 14, marginBottom: 8, marginTop: 12 },
  pillRow: { flexDirection: 'row', gap: 10 },
  pillBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  pillText: { fontSize: 14, fontWeight: '500' },
  
  // Gestion du défilement horizontal si la liste de couleurs s'allonge
  colorRowContainer: { paddingVertical: 4 },
  colorRow: { flexDirection: 'row', gap: 14 },
  colorCircleOuter: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  colorCircleInner: { width: 26, height: 26, borderRadius: 13 },
  checkmark: { color: '#fff', fontSize: 12, position: 'absolute', fontWeight: 'bold' },
  
  dropdown: { height: 50, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, marginTop: 4 },
  placeholderStyle: { fontSize: 15 },
  selectedTextStyle: { fontSize: 15 },
  dropdownContainer: { borderRadius: 8, borderWidth: 1 },
});