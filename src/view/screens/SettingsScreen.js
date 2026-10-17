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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dropdown } from 'react-native-element-dropdown';

let LocalAuthentication = null;
if (Platform.OS !== 'web') {
  try { LocalAuthentication = require('expo-local-authentication'); } catch (_) {}
}
import { Palette, Globe, User, LogOut, Edit2, Check, X, Info, Lock, Shield, Users, Handshake, RefreshCw, Calculator, Eye, Download, Trash2 } from 'lucide-react-native';
import { APP_NAME, APP_VERSION } from '../../model/AppConstants';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useAuth } from '../../viewmodel/AuthContext';
import { getStoredPinHash } from '../../utils/security';
import { useTranslation } from '../../utils/LanguageManager';
import { toNumber } from '../../utils/format';
import CrossPlatformDatePicker from '../components/CrossPlatformDatePicker';
import { CollapsingBar, useCollapsingHeader } from '../components';
import PinAuthModal from '../components/PinAuthModal';
import DebtsScreen from './DebtsScreen';
import TontinesScreen from './TontinesScreen';
import { useResponsive } from '../../utils/responsive';
import { useColors } from '../theme';
import { inkOn } from '../theme/colors';
import { ACCENT_COLORS } from '../../model/ThemeModel';
import { Amount, Button, Card, Input, SectionHeader } from '../components/ui';

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
    hasPinCode, saveNewPin, changePinCode, resetPinCodeWithPassword, resetPinCodeDirect, verifyPinOnly,
    toggleDiscreteMode, isDiscreteMode, resetAllTransactions, exportTransactionsAsCSV,
    notificationsEnabled, toggleNotifications,
  } = useFinance();
  const { t, currentLanguage, changeLanguage } = useTranslation();
  const { contentMaxWidth, contentPadding, cardPadding, borderRadius } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding, cardPadding, borderRadius);

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
  const [showCreatePin, setShowCreatePin] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(budgetLimit || ''));
  const [showDebts, setShowDebts] = useState(false);
  const [showTontines, setShowTontines] = useState(false);
  // Bascule de compte : e-mail cible en attente de vérification du PIN.
  const [switchTarget, setSwitchTarget] = useState(null);

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
  const deviseSymbol = devise?.split(' ')[0] || '€';

  const colors = useColors();
  const header = useCollapsingHeader();

  const themesList = [t('sombre'), t('clair'), t('systeme')];

  // L'accent est au choix de l'utilisateur parmi vingt nuances. Ces vingt
  // nuances vivent dans ThemeModel (ACCENT_COLORS) : les dupliquer ici
  // produirait deux listes à tenir à jour, et c'est cette liste d'autre part
  // qui a été vérifiée — chaque teinte lisible sur fond sombre, et capable de
  // porter une encre claire ou foncée selon son contraste.
  const colorsList = ACCENT_COLORS;

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
      await exportTransactionsAsCSV();
    } catch (err) {
      Alert.alert(t('erreur'), err.message || t('erreur_export'));
    }
  };

  const handleDeleteData = () => {
    Alert.alert(
      t('supprimer_mes_donnees'),
      t('supprimer_donnees_msg'),
      [
        { text: t('annuler'), style: 'cancel' },
        {
          text: t('tout_supprimer'),
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAllTransactions();
              Alert.alert(t('donnees_supprimees'), t('donnees_supprimees_msg'));
            } catch (err) {
              Alert.alert(t('erreur'), err.message || t('erreur_suppression_donnees'));
            }
          },
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      APP_NAME,
      `Version ${APP_VERSION}\n\n© 2026 Jhpy. Tous droits réservés.\n\nUne expérience de gestion budgétaire fluide, visuelle et respectueuse de votre vie privée.\n\n🔒 Confidentialité : Vos données financières sont chiffrées sur votre appareil. Elles peuvent être synchronisées, de façon sécurisée, vers votre espace personnel Supabase lorsque vous vous connectez, afin de vous suivre sur plusieurs appareils.`,
      [{ text: 'Fermer', style: 'cancel' }]
    );
  };

  const handleStartChangePin = () => {
    setChangeStep('verify');
    setShowChangePin(true);
  };

  const handleChangePinOldVerify = async (pin) => {
    // `verifyPinOnly` et non `unlockDiscreteMode` : vérifier l'ancien PIN pour
    // le changer ne doit pas désactiver le mode discret au passage.
    const ok = await verifyPinOnly(pin);
    if (ok) {
      setVerifiedOldPin(pin);
      setChangeStep('new');
    }
    return ok;
  };

  // Bascule vers un autre compte. Un compte protégé ouvre d'abord la
  // vérification du PIN ; un compte SANS PIN bascule directement (la modale
  // afficherait sinon un cadenas sur un compte ouvert, à saisir sans effet).
  const handleSwitchAccount = async (email) => {
    try {
      const hasPin = !!(await getStoredPinHash(email));
      if (!hasPin) {
        await switchToUser(email);
        return;
      }
      setSwitchTarget(email);
    } catch (e) {
      Alert.alert(t('erreur'), e.message || t('bascule_impossible'));
    }
  };

  // `onUnlock` doit renvoyer `true` en cas de succès : sinon PinAuthModal
  // affiche « PIN incorrect » alors que la bascule a réussi. En cas d'échec,
  // on relance l'erreur pour que la modale affiche le message (rate-limit…).
  const handleSwitchConfirm = async (pin) => {
    await switchToUser(switchTarget, pin);
    setSwitchTarget(null);
    return true;
  };

  const handleChangePinNewSave = async (newPin) => {
    const ok = await changePinCode(verifiedOldPin, newPin);
    setShowChangePin(false);
    setVerifiedOldPin('');
    setChangeStep('verify');
    if (ok) {
      Alert.alert(t('code_pin_modifie'), t('code_pin_modifie_msg'));
    } else {
      Alert.alert(t('erreur'), t('erreur_modif_pin'));
    }
  };

  const handleCreatePinSave = async (newPin) => {
    await saveNewPin(newPin);
    setShowCreatePin(false);
    Alert.alert(t('code_pin_cree'), t('code_pin_cree_msg'));
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
      Alert.alert(t('champ_requis'), t('veuillez_mdp'));
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
      Alert.alert(t('code_pin_reinitialise'), t('code_pin_reinitialise_msg'));
    } else {
      Alert.alert(t('erreur'), t('erreur_mdp_incorrect'));
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
      Alert.alert(t('montant_invalide'), t('veuillez_montant'));
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
    Alert.alert(t('budget_defini'), msg);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Animated.ScrollView (et non ScrollView) : `header.onScroll` est un
            AnimatedEvent NATIF (useNativeDriver) renvoyé sous forme d'objet —
            seul un composant animé le convertit en fonction via `__getHandler()`. */}
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          onScroll={header.onScroll}
          scrollEventThrottle={16}
        >
          <Animated.Text style={[styles.pageTitle, { color: colors.text }, header.largeStyle]}>
            {t('settings')}
          </Animated.Text>

          <Card padding={cardPadding} radius={borderRadius}>
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
                }} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                  accessibilityRole="button"
                  accessibilityLabel={t('modifier')}
                >
                  <Edit2 size={16} color={accentColor} />
                </TouchableOpacity>
              )}
            </View>

            {!isEditing ? (
              <View style={styles.profileRow}>
                <View style={[styles.avatarCircle, { backgroundColor: accentColor }]}>
                  <Text style={[styles.avatarLetter, { color: colors.accentFg }]}>
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
                    icon={<Check size={16} color={colors.accentFg} />}
                  />
                </View>
              </View>
            )}
          </Card>

          {allUsers.length > 1 && (
            <Card padding={cardPadding} radius={borderRadius}>
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
                      <View style={[styles.accountAvatar, { backgroundColor: isActive ? colors.income : colors.unselectedPill }]}>
                        <Text style={[styles.accountAvatarText, { color: isActive ? colors.incomeFg : colors.subText }]}>
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
                        <Text style={[styles.activeLabel, { color: colors.income }]}>
                          Compte Actif
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.switchBtn, { backgroundColor: accentColor }]}
                        onPress={() => handleSwitchAccount(account.email)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.switchBtnText}>{t('basculer')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </Card>
          )}

          <Card padding={cardPadding} radius={borderRadius}>
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
                    <Text style={[styles.pillText, { color: isActive ? colors.accentFg : colors.subText }]}>
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
                      {/* La coche est posée sur la nuance elle-même : toutes ne portent pas du
                        blanc. `inkOn` tranche, comme pour les boutons. */}
                      {isSelected && (
                        <Text style={[styles.checkmark, { color: inkOn(c) }]}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </Card>

          <Card padding={cardPadding} radius={borderRadius}>
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

          </Card>

          <Card padding={cardPadding} radius={borderRadius}>
            <SectionHeader
              icon={<Calculator size={20} color={colors.subText} />}
              title={t('budget_rappels')}
            />

            <Text style={[styles.label, { color: colors.subText }]}>{t('periode_budget')}</Text>
            <View style={styles.pillRow}>
              {['day', 'week', 'month'].map((p) => {
                const labels = { day: t('jour'), week: t('semaine'), month: t('mois') };
                const isActive = budgetPeriod === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.pillBtn, { backgroundColor: isActive ? accentColor : colors.unselectedPill }]}
                    onPress={() => setBudgetPeriod(p)}
                  >
                    <Text style={[styles.pillText, { color: isActive ? colors.accentFg : colors.subText }]}>
                      {labels[p]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {budgetPeriod !== 'day' && (
              <>
                <Text style={[styles.label, { color: colors.subText, marginTop: 16 }]}>{t('date_debut')}</Text>
                <CrossPlatformDatePicker
                  value={budgetStartDate ? new Date(budgetStartDate) : new Date()}
                  mode="date"
                  onChange={(_, d) => {
                    if (d) {
                      // Formatage LOCAL : `toISOString()` passe en UTC et
                      // reculait d'un jour en fuseau positif (UTC+1 …).
                      const p = (n) => String(n).padStart(2, '0');
                      setBudgetStartDate(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
                    }
                  }}
                />
              </>
            )}

            <Text style={[styles.label, { color: colors.subText, marginTop: 16 }]}>{t('montant_maximum')}</Text>
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
                <View style={styles.budgetRow}>
                  <Amount
                    value={getPeriodExpenses()}
                    size="amountSm"
                    tone="mid"
                    align="left"
                    currency={deviseSymbol}
                  />
                  <Amount
                    value={budgetLimit}
                    size="amountSm"
                    tone="mid"
                    align="right"
                    currency={deviseSymbol}
                  />
                </View>
                <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{
                    height: '100%',
                    width: `${Math.min((getPeriodExpenses() / budgetLimit) * 100, 100)}%`,
                    backgroundColor: getPeriodExpenses() >= budgetLimit ? colors.danger : getPeriodExpenses() >= budgetLimit * 0.8 ? colors.warning : colors.income,
                    borderRadius: 4,
                  }} />
                </View>
                {/* L'emoji d'alerte disparait au profit de l'encre : un budget
                    dépassé se dit par la couleur du chiffre, pas par un glyphe
                    qui change de forme selon la police. */}
                <Amount
                  value={Math.max(budgetLimit - getPeriodExpenses(), 0)}
                  size="amountSm"
                  tone={budgetLimit - getPeriodExpenses() > 0 ? 'mid' : 'expense'}
                  align="right"
                  currency={deviseSymbol}
                  style={{ marginTop: 4 }}
                />
              </View>
            )}

            <Text style={[styles.label, { color: colors.subText, marginTop: 16 }]}>
              {t('rappel_quotidien')} ({String(reminderHour).padStart(2, '0')}h{String(reminderMinute).padStart(2, '0')})
            </Text>
            <TouchableOpacity
              style={[styles.securityRow, { borderColor: colors.border }]}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.aboutLabel, { color: colors.text }]}>{t('changer_heure_rappel')}</Text>
              <Text style={{ color: colors.subText, fontSize: 16 }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.securityRow, { borderColor: colors.border, marginTop: 10 }]}
              onPress={toggleNotifications}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text style={[styles.aboutLabel, { color: colors.text }]}>
                  Notifications {notificationsEnabled ? t('notifications_activees') : t('notifications_desactivees')}
                </Text>
              </View>
              <View style={[styles.toggleTrack, { backgroundColor: notificationsEnabled ? accentColor : colors.unselectedPill }]}>
                <View style={[styles.toggleThumb, { alignSelf: notificationsEnabled ? 'flex-end' : 'flex-start' }]} />
              </View>
            </TouchableOpacity>

            {showTimePicker && (
              <CrossPlatformDatePicker
                value={new Date(2024, 0, 1, reminderHour, reminderMinute)}
                mode="time"
                onChange={handleTimeChange}
              />
            )}
          </Card>

          <Card padding={cardPadding} radius={borderRadius}>
            <SectionHeader
              icon={<Lock size={20} color={colors.subText} />}
              title={t('securite_pin')}
             />

            {/* Le cadenas est un glyphe, pas une icône : il change de forme selon la
                police et se lit mal sur Android. L'état se dit par l'encre. */}
            <Text style={[styles.pinStatus, { color: hasPinCode ? colors.income : colors.subText }]}>
              {hasPinCode ? t('pin_actif') : t('pin_aucun')}
            </Text>

            {hasPinCode && (
              <TouchableOpacity
                style={[styles.securityRow, { borderColor: colors.border }]}
                onPress={handleStartChangePin}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Shield size={18} color={accentColor} style={{ marginRight: 10 }} />
                  <Text style={[styles.aboutLabel, { color: colors.text }]}>{t('modifier_code_pin')}</Text>
                </View>
                <Text style={{ color: colors.subText, fontSize: 16 }}>›</Text>
              </TouchableOpacity>
            )}

            {!hasPinCode && (
              <TouchableOpacity
                style={[styles.securityRow, { borderColor: colors.border }]}
                onPress={() => setShowCreatePin(true)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Shield size={18} color={accentColor} style={{ marginRight: 10 }} />
                  <Text style={[styles.aboutLabel, { color: colors.text }]}>{t('creer_code_pin')}</Text>
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
                  {t('pin_oublie_reinit')}
                </Text>
              </View>
              <Text style={{ color: colors.subText, fontSize: 16 }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.securityRow, { borderColor: colors.border, marginTop: 10 }]}
              onPress={toggleDiscreteMode}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Eye size={18} color={isDiscreteMode ? colors.income : colors.subText} style={{ marginRight: 10 }} />
                <Text style={[styles.aboutLabel, { color: colors.text }]}>
                  {isDiscreteMode ? t('mode_discret_active') : t('mode_discret_desactive')}
                </Text>
              </View>
              <View style={[styles.toggleTrack, { backgroundColor: isDiscreteMode ? accentColor : colors.unselectedPill }]}>
                <View style={[styles.toggleThumb, { alignSelf: isDiscreteMode ? 'flex-end' : 'flex-start' }]} />
              </View>
            </TouchableOpacity>
          </Card>

          <TouchableOpacity
            style={[styles.aboutRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => setShowDebts(true)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Handshake size={18} color={accentColor} style={{ marginRight: 10 }} />
              <Text style={[styles.aboutLabel, { color: colors.text }]}>{t('dettes_prets')}</Text>
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
              <Text style={[styles.aboutLabel, { color: colors.text }]}>{t('tontine_epargne')}</Text>
            </View>
            <Text style={{ color: colors.subText, fontSize: 16 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.aboutRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={handleExport}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Download size={18} color={accentColor} style={{ marginRight: 10 }} />
              <Text style={[styles.aboutLabel, { color: colors.text }]}>{t('exporter_csv')}</Text>
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
              <Text style={[styles.aboutLabel, { color: colors.text }]}>{t('a_propos_app')}</Text>
            </View>
            <Text style={{ color: colors.subText, fontSize: 16 }}>›</Text>
          </TouchableOpacity>

          {/* Actions destructives — isolées en bas avec séparateur */}
          <View style={[styles.destructiveSection, { marginTop: 24, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.logoutBtn, { borderColor: colors.danger, backgroundColor: colors.cardBg }]}
              onPress={handleDeleteData}
              activeOpacity={0.8}
            >
              <Trash2 size={16} color={colors.danger} style={{ marginRight: 8 }} />
              <Text style={[styles.logoutText, { color: colors.danger }]}>
                {t('supprimer_mes_donnees')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.logoutBtn, { borderColor: colors.danger, backgroundColor: colors.cardBg }]}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <LogOut size={16} color={colors.danger} style={{ marginRight: 8 }} />
              <Text style={[styles.logoutText, { color: colors.danger }]}>
                {t('se_deconnecter')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </Animated.ScrollView>
        <CollapsingBar title={t('settings')} style={header.compactStyle} />
      </KeyboardAvoidingView>

      <Modal visible={showResetModal && resetStep === 'password'} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.pwdModal, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.pwdTitle, { color: colors.text }]}>{t('reinit_code_pin')}</Text>
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
        visible={(showChangePin && changeStep === 'new') || (showResetModal && resetStep === 'new') || showCreatePin}
        onClose={() => {
          setShowChangePin(false);
          setShowResetModal(false);
          setShowCreatePin(false);
          setChangeStep('verify');
          setResetStep('password');
          setIsDeviceVerified(false);
        }}
        onUnlock={() => true}
        onSaveNewPin={(pin) => {
          if (showChangePin) handleChangePinNewSave(pin);
          if (showResetModal) handleResetNewPinSave(pin);
          if (showCreatePin) handleCreatePinSave(pin);
        }}
        hasPin={false}
        isDark={isDark}
        accentColor={accentColor}
        remainingText=""
      />

      {/* Vérification du PIN avant de basculer — ouverte uniquement pour un
          compte effectivement protégé par un PIN (voir handleSwitchAccount). */}
      <PinAuthModal
        visible={!!switchTarget}
        onClose={() => setSwitchTarget(null)}
        onUnlock={(pin) => handleSwitchConfirm(pin)}
        onSaveNewPin={() => {}}
        hasPin={true}
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
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 20, fontWeight: 'bold' },
  profileInfo: { marginLeft: 16, flex: 1 },
  // Gestion des comptes (section multi-profils)
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  accountInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  accountAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  accountAvatarText: { fontSize: 16, fontWeight: '700' },
  accountName: { fontSize: 15, fontWeight: '600' },
  accountEmail: { fontSize: 13, marginTop: 2 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  activeLabel: { fontSize: 12, fontWeight: '600' },
  switchBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  switchBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
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
  },
  exportText: { fontSize: 15, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  logoutText: { fontSize: 15, fontWeight: '600' },
  toggleTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  destructiveSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
  },
  label: { fontSize: 14, marginBottom: 8, marginTop: 12 },
  pillRow: { flexDirection: 'row', gap: 10 },
  pillBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  pillText: { fontSize: 14, fontWeight: '500' },
  colorRowContainer: { paddingVertical: 4 },
  colorRow: { flexDirection: 'row', gap: 14 },
  colorCircleOuter: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  colorCircleInner: { width: 26, height: 26, borderRadius: 13 },
  checkmark: { fontSize: 12, position: 'absolute', fontWeight: 'bold' },
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
