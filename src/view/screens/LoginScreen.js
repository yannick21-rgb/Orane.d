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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useAuth } from '../../viewmodel/AuthContext';
import { useTranslation } from '../../utils/LanguageManager';
import { Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen({ onSwitchToRegister }) {
  const { isDark, accentColor } = useFinance();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const colors = {
    bg:      isDark ? '#0f1015' : '#f5f6fa',
    card:    isDark ? '#16171f' : '#ffffff',
    text:    isDark ? '#ffffff' : '#131419',
    subText: isDark ? '#8c8e9b' : '#6a6c7a',
    input:   isDark ? '#1c1d28' : '#f0f1f6',
    border:  isDark ? '#2a2b38' : '#e8eaef',
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('erreur'), 'Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password.trim());
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
            <Text style={[styles.logo]}>{'💰'}</Text>
            <Text style={[styles.appName, { color: colors.text }]}>Orane.d</Text>
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
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{t('Se connecter') || 'Se connecter'}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: { fontSize: 48, marginBottom: 12 },
  appName: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 6 },
  card: {
    padding: 24,
    borderRadius: 28,
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
    borderRadius: 16,
    fontSize: 16,
    fontWeight: '500',
    borderWidth: 1,
  },
  pwContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
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
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  primaryBtnText: {
    color: '#fff',
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
