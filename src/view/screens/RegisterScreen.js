import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useAuth } from '../../viewmodel/AuthContext';
import { useTranslation } from '../../utils/LanguageManager';
import { Eye, EyeOff } from 'lucide-react-native';
import { useResponsive } from '../../utils/responsive';
import { radius } from '../theme/tokens';
import { type } from '../theme/type';
import { useColors } from '../theme';

export default function RegisterScreen({ onSwitchToLogin }) {
  const { accentColor } = useFinance();
  const { register } = useAuth();
  const { t } = useTranslation();
  const { contentMaxWidth, contentPadding, cardPadding, borderRadius } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding, cardPadding, borderRadius);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const colors = useColors();

  const validatePassword = (pw) => {
    if (pw.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères.';
    if (!/[a-zA-Z]/.test(pw)) return 'Le mot de passe doit contenir au moins une lettre.';
    if (!/[0-9]/.test(pw)) return 'Le mot de passe doit contenir au moins un chiffre.';
    return null;
  };

  const handleRegister = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanName || !cleanEmail || !password.trim() || !confirmPassword.trim()) {
      Alert.alert(t('erreur'), 'Veuillez remplir tous les champs.');
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      Alert.alert(t('erreur'), "Format d'email invalide.");
      return;
    }
    if (cleanName.length < 2) {
      Alert.alert(t('erreur'), 'Le nom doit contenir au moins 2 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('erreur'), 'Les mots de passe ne correspondent pas.');
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      Alert.alert('Mot de passe faible', pwError);
      return;
    }
    setLoading(true);
    try {
      const result = await register(cleanName, cleanEmail, password);
      if (result?.needsConfirmation) {
        Alert.alert(
          'Vérifie ton email',
          "Un email de confirmation a été envoyé à " + cleanEmail + ". Clique sur le lien puis connecte-toi."
        );
      } else {
        Alert.alert('Bienvenue', 'Compte créé avec succès !');
      }
      onSwitchToLogin();
    } catch (e) {
      Alert.alert(t('erreur'), e.message || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSection}>
            <Image source={require('../../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.subtitle, { color: colors.subText }]}>
              {t('Créer un compte') || 'Créez votre compte'}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.subText }]}>
              {t('Nom complet') || 'Nom complet'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              placeholder={t('votre_nom')}
              placeholderTextColor={colors.subText}
              returnKeyType="next"
              autoCorrect={false}
            />

            <Text style={[styles.label, { color: colors.subText, marginTop: 16 }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="email@exemple.com"
              placeholderTextColor={colors.subText}
              returnKeyType="next"
            />

            <Text style={[styles.label, { color: colors.subText, marginTop: 16 }]}>
              {t('Mot de passe') || 'Mot de passe'}
            </Text>
            <View style={[styles.pwContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <TextInput
                style={[styles.pwInput, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.subText}
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                {showPassword ? <EyeOff size={20} color={colors.subText} /> : <Eye size={20} color={colors.subText} />}
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.subText, marginTop: 16 }]}>
              {t('Confirmer le mot de passe') || 'Confirmer le mot de passe'}
            </Text>
            <View style={[styles.pwContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <TextInput
                style={[styles.pwInput, { color: colors.text }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.subText}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                {showConfirmPassword ? <EyeOff size={20} color={colors.subText} /> : <Eye size={20} color={colors.subText} />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accentColor }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.accentFg} />
              ) : (
                <Text style={[styles.primaryBtnText, { color: colors.accentFg }]}>
                  {t("S'inscrire") || "S'inscrire"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onSwitchToLogin} style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.subText }]}>
              {t('Déjà un compte ?') || 'Déjà un compte ?'}
            </Text>
            <Text style={[styles.switchLink, { color: accentColor }]}>
              {' '}{t('Se connecter') || 'Se connecter'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (cp, cpad, cardP, br) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: cpad,
    paddingTop: 40,
    maxWidth: cp,
    width: '100%',
    alignSelf: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: { width: 120, height: 120, marginBottom: 16 },
  subtitle: { ...type.label, fontSize: 14, marginTop: 6 },
  card: {
    padding: cardP,
    borderRadius: br,
    borderWidth: 1,
  },
  label: {
    ...type.label,
    marginBottom: 8,
  },
  input: {
    padding: 16,
    borderRadius: radius.md,
    fontSize: 16,
    fontWeight: '500',
    borderWidth: 1,
  },
  pwContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  pwInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 8,
  },
  primaryBtn: {
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchText: { fontSize: 14 },
  switchLink: { fontSize: 14, fontWeight: '700' },
});
