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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useAuth } from '../../viewmodel/AuthContext';
import { useTranslation } from '../../utils/LanguageManager';
import { Eye, EyeOff } from 'lucide-react-native';
import { useResponsive } from '../../utils/responsive';
import { radius } from '../theme/tokens';
import { useColors } from '../theme';

export default function LoginScreen({ onSwitchToRegister }) {
  const { accentColor } = useFinance();
  const { login } = useAuth();
  const { t } = useTranslation();
  const { contentMaxWidth, contentPadding, cardPadding, borderRadius } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding, cardPadding, borderRadius);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const colors = useColors();

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !password.trim()) {
      Alert.alert(t('erreur'), 'Veuillez remplir tous les champs.');
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      Alert.alert(t('erreur'), "Format d'email invalide.");
      return;
    }
    setLoading(true);
    try {
      await login(cleanEmail, password.trim());
    } catch (e) {
      Alert.alert(t('erreur'), e.message || 'Identifiants invalides.');
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
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <Image source={require('../../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.subtitle, { color: colors.subText }]}>{t('Bienvenue') || 'Bienvenue'}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.subText }]}>Email</Text>
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

            <Text style={[styles.label, { color: colors.subText, marginTop: 16 }]}>{t('Mot de passe') || 'Mot de passe'}</Text>
            <View style={[styles.pwContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <TextInput
                style={[styles.pwInput, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.subText}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                {showPassword ? <EyeOff size={20} color={colors.subText} /> : <Eye size={20} color={colors.subText} />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accentColor }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.accentFg} />
              ) : (
                <Text style={[styles.primaryBtnText, { color: colors.accentFg }]}>{t('Se connecter') || 'Se connecter'}</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onSwitchToRegister} style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.subText }]}>
              {t('Pas de compte ?') || "Pas encore de compte ?"}
            </Text>
            <Text style={[styles.switchLink, { color: accentColor }]}> {t("S'inscrire") || "S'inscrire"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (cp, cpad, cardP, br) => StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: cpad,
    maxWidth: cp,
    width: '100%',
    alignSelf: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: { width: 120, height: 120, marginBottom: 16 },
  subtitle: { fontSize: 14, marginTop: 6 },
  card: {
    padding: cardP,
    borderRadius: br,
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
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
