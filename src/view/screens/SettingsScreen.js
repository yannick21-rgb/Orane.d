import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dropdown } from 'react-native-element-dropdown';

let LocalAuthentication = null;
if (Platform.OS !== 'web') {
  try { LocalAuthentication = require('expo-local-authentication'); } catch (_) {}
}
import { Palette, Globe, User, LogOut, Edit2, Check, X, Info, Download, Lock, Shield, Users, Handshake, RefreshCw, Calculator } from 'lucide-react-native';
import { APP_NAME, APP_VERSION } from '../../model/AppConstants';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useAuth } from '../../viewmodel/AuthContext';
import { useTranslation } from '../../utils/LanguageManager';
import { toNumber } from '../../utils/format';
import { exportTransactionsToCSV } from '../../service/exportCSV';
import CrossPlatformDatePicker from '../components/CrossPlatformDatePicker';
import PinAuthModal from '../components/PinAuthModal';
import DebtsScreen from './DebtsScreen';
import TontinesScreen from './TontinesScreen';
import { useResponsive } from '../../utils/responsive';
import { useColors } from '../theme';
import { Button, Card, Input } from '../components/ui';

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
  const {
    transactions, theme, setTheme, isDark, accentColor, setAccentColor,
    devise, setDevise, budgetLimit, setBudgetLimit,
    budgetPeriod, setBudgetPeriod, budgetStartDate, setBudgetStartDate, reminderHour, reminderMinute,
    checkBudgetPeriodAlert, getPeriodExpenses, updateDailyReminderTime, scheduleMonthlyReview,
    hasPinCode, saveNewPin, changePinCode, resetPinCodeWithPassword, resetPinCodeDirect, unlockDiscreteMode,
  } = useFinance();
  const { t, currentLanguage, changeLanguage } = useTranslation();
  const { contentMaxWidth, contentPadding, cardPadding, borderRadius } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding, cardPadding, borderRadius);

  const [pays, setPays] = useState('BJ');
  const [isReady, setIsReady] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const [showChangePin, setShowChangePin] = useState(false);
  const [changeStep, setChangeStep] = useState('verify');
  const [verifiedOldPin, setVerifiedOldPin] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetStep, setResetStep] = useState('password');
  const [isDeviceVerified, setIsDeviceVerified] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(budgetLimit || ''));
  const [showDebts, setShowDebts] = useState(false);
  const [showTontines, setShowTontines] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const sp = await AsyncStorage.getItem('@pays');
        if (isMounted && sp) setPays(sp);
      } catch (err) {
        console.error('[Settings] Erreur chargement :', err);
      } finally {
        if (isMounted) setIsReady(true);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (isReady) AsyncStorage.setItem('@pays', pays).catch(console.error);
  }, [pays, isReady]);

  useEffect(() => {
    setBudgetInput(String(budgetLimit || ''));
  }, [budgetLimit]);

  useEffect(() => {
    if (!LocalAuthentication) return;
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometrics(compatible && enrolled);
    })();
  }, []);

  const deviseDropdownValue = DEVISES_DU_MONDE.find(d => devise?.includes(d.value))?.value || 'EUR';

  const colors = useColors();

  const themesList = [t('sombre'), t('clair'), t('systeme')];

  const colorsList = [
    '#3b82f6', '#9b59b6', '#2ecc71', '#ed4c67',
    '#f39c12', '#00d2d3', '#f78fb3', '#2c3e50',
    '#4a5568', '#718096', '#a0aec0', '#1a365d',
    '#2b6cb0', '#4eb3a2', '#81e6d9', '#dd6b20',
    '#e53e3e', '#b7791f', '#d69e2e', '#6b46c1',
  ];

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert(t('erreur'), t('champ_vide'));
      return;
    }
    try {
      await updateProfile(editName.trim());
      setIsEditing(false);
    } catch (error) {
      console.error("Erreur sauvegarde profil :", error);
      Alert.alert(t('erreur'), t('sauvegarde_impossible'));
    }
  };

  const handleCancelEdit = () => {
    setEditName(authUser?.name || '');
    setEditEmail(authUser?.email || '');
    setIsEditing(false);
  };

  const { user: authUser, allUsers, switchToUser, logout, updateProfile } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      t('deconnexion'),
      t('message_deconnexion'),
      [
        { text: t('annuler'), style: 'cancel' },
        {
          text: t('oui_deconnecter'),
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  const handleExport = async () => {
    try {
      await exportTransactionsToCSV(transactions, devise);
    } catch (err) {
      Alert.alert('Erreur', err.message || 'Impossible d\'exporter les transactions.');
    }
  };

  const handleAbout = () => {
    Alert.alert(
      APP_NAME,
      `Version ${APP_VERSION}\n\n© 2026 Jhpy. Tous droits réservés.\n\nUne expérience de gestion budgétaire fluide, visuelle et respectueuse de votre vie privée.\n\n🔒 Confidentialité : Vos données financières restent exclusivement stockées en local sur votre appareil (AsyncStorage). L'application ne collecte, ne stocke, ni ne transmet aucune information personnelle ou bancaire.`,
      [{ text: 'Fermer', style: 'cancel' }]
    );
  };

  const handleStartChangePin = () => {
    setChangeStep('verify');
    setShowChangePin(true);
  };

  const handleChangePinOldVerify = async (pin) => {
    try {
      const ok = await unlockDiscreteMode(pin);
      if (ok) {
        setVerifiedOldPin(pin);
        setChangeStep('new');
      }
      return ok;
    } catch (e) {
      throw e;
    }
  };

  const handleChangePinNewSave = async (newPin) => {
    const ok = await changePinCode(verifiedOldPin, newPin);
    setShowChangePin(false);
    setVerifiedOldPin('');
    setChangeStep('verify');
    if (ok) {
      Alert.alert('Code PIN modifié', 'Votre code PIN a été mis à jour avec succès.');
    } else {
      Alert.alert('Erreur', 'Impossible de modifier le code PIN.');
    }
  };

  const handleStartResetPin = async () => {
    setResetPassword('');
    setIsDeviceVerified(false);
    if (hasBiometrics && LocalAuthentication) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authentifiez-vous pour réinitialiser le code PIN',
          fallbackLabel: 'Utiliser le mot de passe',
          cancelLabel: 'Annuler',
        });
        if (result.success) {
          setIsDeviceVerified(true);
          setResetStep('new');
          setShowResetModal(true);
          return;
        }
      } catch (_) {}
    }
    setResetStep('password');
    setShowResetModal(true);
  };

  const handleResetPasswordSubmit = async () => {
    if (!resetPassword.trim()) {
      Alert.alert('Champ requis', 'Veuillez entrer votre mot de passe.');
      return;
    }
    setResetStep('new');
  };

  const handleResetNewPinSave = async (newPin) => {
    let ok;
    if (isDeviceVerified) {
      ok = await resetPinCodeDirect(newPin);
    } else {
      ok = await resetPinCodeWithPassword(resetPassword, newPin);
    }
    setShowResetModal(false);
    setResetPassword('');
    setResetStep('password');
    setIsDeviceVerified(false);
    if (ok) {
      Alert.alert('Code PIN réinitialisé', 'Votre nouveau code PIN est en place.');
    } else {
      Alert.alert('Erreur', 'Mot de passe incorrect. Réinitialisation impossible.');
    }
  };

  const handleTimeChange = (event, selectedDate) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      updateDailyReminderTime(selectedDate.getHours(), selectedDate.getMinutes());
    }
  };

  const handleBudgetSave = () => {
    const amount = toNumber(budgetInput);
    if (amount < 0) {
      Alert.alert('Montant invalide', 'Veuillez entrer un montant valide.');
      return;
    }
    setBudgetLimit(amount);
    const currentExpenses = getPeriodExpenses();
    const symbol = devise?.split(' ')[0] || '€';
    const periodLabel = budgetPeriod === 'day' ? 'journalier' : budgetPeriod === 'week' ? 'hebdomadaire' : 'mensuel';
    const remaining = amount - currentExpenses;
    let msg = `Budget ${periodLabel} : ${amount}${symbol}`;
    if (amount > 0) {
      msg += `\n\nDépenses actuelles : ${currentExpenses.toFixed(2)}${symbol}`;
      msg += `\nReste : ${remaining > 0 ? remaining.toFixed(2) : '0'}${symbol}`;
      if (remaining < 0) msg += '\n⚠️ Budget déjà dépassé !';
    }
    Alert.alert('Budget défini', msg);
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
            {t('settings')}
          </Text>

          <Card padding={cardP} radius={br}>
            <View style={styles.sectionHeaderBetween}>
              <View style={styles.sectionHeaderLeft}>
                <User size={20} color={colors.subText} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('mon_compte')}
                </Text>
              </View>
              {!isEditing && (
                <TouchableOpacity onPress={() => {
                  setEditName(authUser?.name || '');
                  setEditEmail(authUser?.email || '');
                  setIsEditing(true);
                }} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <Edit2 size={16} color={accentColor} />
                </TouchableOpacity>
              )}
            </View>

            {!isEditing ? (
              <View style={styles.profileRow}>
                <View style={[styles.avatarCircle, { backgroundColor: accentColor }]}>
                  <Text style={styles.avatarLetter}>
                    {(authUser?.name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={[styles.userName, { color: colors.text }]}>{authUser?.name || ''}</Text>
                  <Text style={[styles.userEmail, { color: colors.subText }]}>{authUser?.email || ''}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.editForm}>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>{t('nom')}</Text>
                <Input
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={t('votre_nom')}
                />

                <Text style={[styles.inputLabel, { color: colors.subText, marginTop: 10 }]}>{t('adresse_email')}</Text>
                <Input
                  value={editEmail}
                  editable={false}
                  textColor="subText"
                  placeholder={t('votre_email')}
                />

                <View style={styles.actionFormRow}>
                  <Button
                    label={t('annuler')}
                    variant="secondary"
                    onPress={handleCancelEdit}
                    icon={<X size={16} color={colors.subText} />}
                  />
                  <Button
                    label={t('enregistrer')}
                    onPress={handleSaveProfile}
                    icon={<Check size={16} color="#fff" />}
                  />
                </View>
              </View>
            )}
          </Card>

          {allUsers.length > 1 && (
            <Card padding={cardP} radius={br}>
              <SectionHeader
                icon={<Users size={20} color={colors.subText} />}
                title={`Gestion des Comptes`}
               />
              {allUsers.map((account) => {
                const isActive = account.email === authUser?.email;
                return (
                  <View
                    key={account.email}
                    style={[styles.accountRow, { borderColor: colors.border }]}
                  >
                    <View style={styles.accountInfo}>
                      <View style={[styles.accountAvatar, { backgroundColor: isActive ? '#2ecc71' : colors.unselectedPill }]}>
                        <Text style={[styles.accountAvatarText, { color: isActive ? '#fff' : colors.subText }]}>
                          {account.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.accountName, { color: colors.text }]}>
                          {account.name}
                        </Text>
                        <Text style={[styles.accountEmail, { color: colors.subText }]}>
                          {account.email}
                        </Text>
                      </View>
                    </View>
                    {isActive ? (
                      <View style={styles.activeBadge}>
                        <View style={styles.activeDot} />
                        <Text style={[styles.activeLabel, { color: '#2ecc71' }]}>
                          Compte Actif
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.switchBtn, { backgroundColor: accentColor }]}
                        onPress={() => switchToUser(account.email)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.switchBtnText}>Basculer</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </Card>
          )}

          <Card padding={cardP} radius={br}>
            <SectionHeader
              icon={<Palette size={20} color={colors.subText} />}
              title={t('visualCustom')}
             />

            <Text style={[styles.label, { color: colors.subText }]}>{t('theme')}</Text>
            <View style={styles.pillRow}>
              {themesList.map((label, index) => {
                const rawThemes = ['Sombre', 'Clair', 'Système'];
                const isActive = theme === rawThemes[index];
                return (
                  <TouchableOpacity
                    key={rawThemes[index]}
                    style={[styles.pillBtn, { backgroundColor: isActive ? accentColor : colors.unselectedPill }]}
                    onPress={() => setTheme(rawThemes[index])}
                  >
                    <Text style={[styles.pillText, { color: isActive ? '#fff' : colors.subText }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.subText }]}>{t('couleur_principale')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRowContainer}>
              <View style={styles.colorRow}>
                {colorsList.map((c) => {
                  const isSelected = accentColor === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorCircleOuter, isSelected && { borderColor: c, borderWidth: 2.5 }]}
                      onPress={() => setAccentColor(c)}
                    >
                      <View style={[styles.colorCircleInner, { backgroundColor: c }]} />
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </Card>

          <Card padding={cardP} radius={br}>
            <SectionHeader
              icon={<Globe size={20} color={colors.subText} />}
              title={t('locPreferences')}
             />

            <Text style={[styles.label, { color: colors.subText }]}>{t('language')}</Text>
            <Dropdown
              key={`lang-${currentLanguage}`}
              style={[styles.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              placeholderStyle={[styles.placeholderStyle, { color: colors.subText }]}
              selectedTextStyle={[styles.selectedTextStyle, { color: colors.text }]}
              containerStyle={[styles.dropdownContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              itemTextStyle={{ color: colors.text }}
              activeColor={colors.inputBg}
              data={LANGUES_DISPONIBLES}
              labelField="label"
              valueField="value"
              placeholder={t('choisir_langue')}
              value={currentLanguage}
              onChange={(item) => changeLanguage(item.value)}
            />

            <Text style={[styles.label, { color: colors.subText }]}>{t('currency')}</Text>
            <Dropdown
              key={`devise-${currentLanguage}`}
              style={[styles.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              placeholderStyle={[styles.placeholderStyle, { color: colors.subText }]}
              selectedTextStyle={[styles.selectedTextStyle, { color: colors.text }]}
              containerStyle={[styles.dropdownContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              itemTextStyle={{ color: colors.text }}
              activeColor={colors.inputBg}
              data={DEVISES_DU_MONDE}
              labelField="label"
              valueField="value"
              placeholder={t('choisir_devise')}
              value={deviseDropdownValue}
              onChange={(item) => setDevise(item.label)}
            />

            <Text style={[styles.label, { color: colors.subText }]}>{t('country')}</Text>
            <Dropdown
              key={`pays-${currentLanguage}`}
              style={[styles.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              placeholderStyle={[styles.placeholderStyle, { color: colors.subText }]}
              selectedTextStyle={[styles.selectedTextStyle, { color: colors.text }]}
              containerStyle={[styles.dropdownContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              itemTextStyle={{ color: colors.text }}
              activeColor={colors.inputBg}
              data={PAYS_DU_MONDE}
              labelField="label"
              valueField="value"
              placeholder={t('choisir_pays')}
              value={pays}
              onChange={(item) => setPays(item.value)}
            />
          </Card>

          <Card padding={cardP} radius={br}>
            <SectionHeader title="Budget & Rappels" />

            <Text style={[styles.label, { color: colors.subText }]}>Période du budget</Text>
            <View style={styles.pillRow}>
              {['day', 'week', 'month'].map((p) => {
                const labels = { day: 'Jour', week: 'Semaine', month: 'Mois' };
                const isActive = budgetPeriod === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.pillBtn, { backgroundColor: isActive ? accentColor : colors.unselectedPill }]}
                    onPress={() => setBudgetPeriod(p)}
                  >
                    <Text style={[styles.pillText, { color: isActive ? '#fff' : colors.subText }]}>
                      {labels[p]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {budgetPeriod !== 'day' && (
              <>
                <Text style={[styles.label, { color: colors.subText, marginTop: 16 }]}>Date de début</Text>
                <CrossPlatformDatePicker
                  value={budgetStartDate ? new Date(budgetStartDate) : new Date()}
                  mode="date"
                  isDark={isDark}
                  colors={{
                    inputBg: colors.inputBg,
                    border: colors.border,
                    text: colors.text,
                  }}
                  onChange={(_, d) => {
                    if (d) setBudgetStartDate(d.toISOString().split('T')[0]);
                  }}
                />
              </>
            )}

            <Text style={[styles.label, { color: colors.subText, marginTop: 16 }]}>Montant maximum</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Input
                style={{ flex: 1 }}
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="numeric"
                placeholder="0"
              />
              <Button label="OK" onPress={handleBudgetSave} />
            </View>

            {budgetLimit > 0 && (
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: colors.subText, fontSize: 13 }}>
                    Dépenses: {getPeriodExpenses().toFixed(2)} {devise?.split(' ')[0] || '€'}
                  </Text>
                  <Text style={{ color: colors.subText, fontSize: 13 }}>
                    Limite: {budgetLimit} {devise?.split(' ')[0] || '€'}
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{
                    height: '100%',
                    width: `${Math.min((getPeriodExpenses() / budgetLimit) * 100, 100)}%`,
                    backgroundColor: getPeriodExpenses() >= budgetLimit ? '#ef4444' : getPeriodExpenses() >= budgetLimit * 0.8 ? '#f59e0b' : '#2ecc71',
                    borderRadius: 4,
                  }} />
                </View>
                <Text style={{ color: colors.subText, fontSize: 12, marginTop: 4, textAlign: 'right' }}>
                  {budgetLimit - getPeriodExpenses() > 0
                    ? `Reste: ${(budgetLimit - getPeriodExpenses()).toFixed(2)} ${devise?.split(' ')[0] || '€'}`
                    : '⚠️ Budget dépassé'}
                </Text>
              </View>
            )}

            <Text style={[styles.label, { color: colors.subText, marginTop: 16 }]}>
              Rappel quotidien ({String(reminderHour).padStart(2, '0')}h{String(reminderMinute).padStart(2, '0')})
            </Text>
            <TouchableOpacity
              style={[styles.securityRow, { borderColor: colors.border }]}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.aboutLabel, { color: colors.text }]}>Changer l'heure du rappel</Text>
              <Text style={{ color: colors.subText, fontSize: 16 }}>›</Text>
            </TouchableOpacity>

            {showTimePicker && (
              <CrossPlatformDatePicker
                value={new Date(2024, 0, 1, reminderHour, reminderMinute)}
                mode="time"
                isDark={isDark}
                colors={{
                  inputBg: colors.inputBg,
                  border: colors.border,
                  text: colors.text,
                }}
                onChange={handleTimeChange}
              />
            )}
          </Card>

          <Card padding={cardP} radius={br}>
            <SectionHeader
              icon={<Lock size={20} color={colors.subText} />}
              title={`Sécurité & Code PIN`}
             />

            <Text style={[styles.pinStatus, { color: hasPinCode ? '#2ecc71' : colors.subText }]}>
              {hasPinCode ? '🔒 Code PIN actif' : '🔓 Aucun code PIN configuré'}
            </Text>

            {hasPinCode && (
              <TouchableOpacity
                style={[styles.securityRow, { borderColor: colors.border }]}
                onPress={handleStartChangePin}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Shield size={18} color={accentColor} style={{ marginRight: 10 }} />
                  <Text style={[styles.aboutLabel, { color: colors.text }]}>Modifier le code PIN</Text>
                </View>
                <Text style={{ color: colors.subText, fontSize: 16 }}>›</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.securityRow, { borderColor: colors.border, marginTop: 10 }]}
              onPress={handleStartResetPin}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Lock size={18} color={colors.danger} style={{ marginRight: 10 }} />
                <Text style={[styles.aboutLabel, { color: colors.text }]}>
                  Code PIN oublié ? Réinitialiser
                </Text>
              </View>
              <Text style={{ color: colors.subText, fontSize: 16 }}>›</Text>
            </TouchableOpacity>
          </Card>

          <TouchableOpacity
            style={[styles.aboutRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => setShowDebts(true)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Handshake size={18} color={accentColor} style={{ marginRight: 10 }} />
              <Text style={[styles.aboutLabel, { color: colors.text }]}>Dettes & Prêts</Text>
            </View>
            <Text style={{ color: colors.subText, fontSize: 16 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.aboutRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => setShowTontines(true)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <RefreshCw size={18} color={accentColor} style={{ marginRight: 10 }} />
              <Text style={[styles.aboutLabel, { color: colors.text }]}>Tontine / Épargne</Text>
            </View>
            <Text style={{ color: colors.subText, fontSize: 16 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.aboutRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={handleAbout}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Info size={18} color={colors.subText} style={{ marginRight: 10 }} />
              <Text style={[styles.aboutLabel, { color: colors.text }]}>À propos de l'application</Text>
            </View>
            <Text style={{ color: colors.subText, fontSize: 16 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: accentColor }]}
            onPress={handleExport}
            activeOpacity={0.8}
          >
            <Download size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.exportText}>
              Exporter les transactions (CSV)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LogOut size={16} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>
              {t('se_deconnecter')}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showResetModal && resetStep === 'password'} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.pwdModal, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.pwdTitle, { color: colors.text }]}>Réinitialisation du code PIN</Text>
            <Text style={[styles.pwdSubtitle, { color: colors.subText }]}>
              {hasBiometrics
                ? 'L\'authentification biométrique a échoué. Entrez votre mot de passe de session pour vérifier votre identité.'
                : 'Aucune donnée biométrique disponible. Entrez votre mot de passe de session pour vérifier votre identité.'}
            </Text>
            <Input
              height={48}
              radius={12}
              paddingHorizontal={14}
              style={{ width: '100%' }}
              value={resetPassword}
              onChangeText={setResetPassword}
              placeholder="Mot de passe"
              secureTextEntry
              autoCapitalize="none"
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Button
                label="Annuler"
                variant="secondary"
                flex
                onPress={() => { setShowResetModal(false); setResetPassword(''); setIsDeviceVerified(false); }}
              />
              <Button label="Vérifier" flex onPress={handleResetPasswordSubmit} />
            </View>
          </View>
        </View>
      </Modal>

      <PinAuthModal
        visible={showChangePin && changeStep === 'verify'}
        onClose={() => { setShowChangePin(false); setChangeStep('verify'); }}
        onUnlock={(pin) => handleChangePinOldVerify(pin)}
        onSaveNewPin={() => {}}
        hasPin={true}
        isDark={isDark}
        accentColor={accentColor}
        remainingText=""
      />

      <PinAuthModal
        visible={(showChangePin && changeStep === 'new') || (showResetModal && resetStep === 'new')}
        onClose={() => {
          setShowChangePin(false);
          setShowResetModal(false);
          setChangeStep('verify');
          setResetStep('password');
          setIsDeviceVerified(false);
        }}
        onUnlock={() => true}
        onSaveNewPin={(pin) => {
          if (showChangePin) handleChangePinNewSave(pin);
          if (showResetModal) handleResetNewPinSave(pin);
        }}
        hasPin={false}
        isDark={isDark}
        accentColor={accentColor}
        remainingText=""
      />

      {showDebts && (
        <View style={StyleSheet.absoluteFill}>
          <DebtsScreen onClose={() => setShowDebts(false)} />
        </View>
      )}

      {showTontines && (
        <View style={StyleSheet.absoluteFill}>
          <TontinesScreen onClose={() => setShowTontines(false)} />
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (cp, cpad, cardP, br) => StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { paddingHorizontal: cpad, paddingBottom: 40, maxWidth: cp, width: '100%', alignSelf: 'center' },
  pageTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  sectionHeaderBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  profileInfo: { marginLeft: 16, flex: 1 },
  userName: { fontSize: 17, fontWeight: '600' },
  userEmail: { fontSize: 14, marginTop: 2 },
  editForm: { marginTop: 4 },
  inputLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  actionFormRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: cardP,
    borderRadius: br,
    borderWidth: 1,
    marginBottom: 10,
  },
  aboutLabel: { fontSize: 15, fontWeight: '500' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  exportText: { color: '#fff', fontSize: 15, fontWeight: '600' },
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
  colorRowContainer: { paddingVertical: 4 },
  colorRow: { flexDirection: 'row', gap: 14 },
  colorCircleOuter: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  colorCircleInner: { width: 26, height: 26, borderRadius: 13 },
  checkmark: { color: '#fff', fontSize: 12, position: 'absolute', fontWeight: 'bold' },
  dropdown: { height: 50, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, marginTop: 4 },
  placeholderStyle: { fontSize: 15 },
  selectedTextStyle: { fontSize: 15 },
  dropdownContainer: { borderRadius: 8, borderWidth: 1 },

  pinStatus: { fontSize: 14, fontWeight: '600', marginBottom: 14, marginLeft: 4 },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pwdModal: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
  },
  pwdTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  pwdSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
});
