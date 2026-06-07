import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { Dropdown } from 'react-native-element-dropdown';

const LANGUAGES = [
  { label: 'Français', value: 'fr' },
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
];

const CURRENCIES = [
  { label: 'F (CFA)', value: 'F (XOF)' },
  { label: '€ (EUR)', value: '€ (EUR)' },
  { label: '$ (USD)', value: '$ (USD)' },
];

export default function OnboardingScreen() {
  const { 
    isDark, 
    accentColor, 
    setDevise, 
    devise, 
    locale, 
    changeGlobalLanguage,
    setUserName,
    userName,
    setHasSeenOnboarding 
  } = useFinance();

  const [currentStep, setCurrentStep] = useState(0);
  
  const [localLang, setLocalLang] = useState(locale || 'fr');
  const [localDevise, setLocalDevise] = useState(devise || '€ (EUR)');

  const colors = {
    bg: isDark ? '#090a0f' : '#f8f9fc', // Plus profond pour l'esprit Luma
    card: isDark ? '#12131a' : '#ffffff',
    text: isDark ? '#ffffff' : '#0a0b10',
    subText: isDark ? '#7e8194' : '#626575',
    inputBg: isDark ? '#1a1b26' : '#f1f3f7',
    border: isDark ? '#222433' : '#e2e5ed',
  };

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      if (!userName || userName.trim() === '') {
        setUserName('Utilisateur');
      }
      setHasSeenOnboarding(true);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          
          {/* TOP BAR: Barre de progression discrète inspirée de Luma */}
          <View style={styles.progressContainer}>
            {[0, 1, 2].map((index) => (
              <View 
                key={index} 
                style={[
                  styles.dot, 
                  { 
                    backgroundColor: currentStep === index ? accentColor : colors.border,
                    flex: currentStep === index ? 2 : 1 
                  }
                ]} 
              />
            ))}
          </View>

          {/* SLIDER / FORMULAIRES */}
          <View style={styles.mainCard}>
            {/* ÉTAPE 0 : Style Luma Premium — Logo et Proposition de valeur */}
            {currentStep === 0 && (
              <View style={styles.slide}>
                <View style={[styles.logoPlaceholder, { backgroundColor: accentColor + '15' }]}>
                  <Text style={[styles.logoIcon, { color: accentColor }]}>💸</Text>
                </View>
                <Text style={[styles.heroTitle, { color: colors.text }]}>
                  Vos finances,{"\n"}<Text style={{ color: accentColor }}>parfaitement cadrées.</Text>
                </Text>
                <Text style={[styles.subtitle, { color: colors.subText }]}>
                  Suivez vos transactions, maîtrisez vos budgets mobile money et suivez vos prêts en temps réel. Local, privé et sécurisé.
                </Text>
              </View>
            )}

            {/* ÉTAPE 1 : Configuration des préférences épurées */}
            {currentStep === 1 && (
              <View style={styles.slideLeft}>
                <Text style={[styles.title, { color: colors.text }]}>Vos préférences</Text>
                <Text style={[styles.subtitleStep, { color: colors.subText }]}>Configurez l'affichage de base selon vos besoins.</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.subText }]}>Langue</Text>
                  <Dropdown
                    style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                    placeholderStyle={{ color: colors.subText }}
                    selectedTextStyle={{ color: colors.text }}
                    containerStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }}
                    itemTextStyle={{ color: colors.text }}
                    activeColor={colors.inputBg}
                    data={LANGUAGES}
                    labelField="label"
                    valueField="value"
                    value={localLang}
                    onChange={(item) => {
                      setLocalLang(item.value);
                      if (item.value !== locale) changeGlobalLanguage(item.value);
                    }}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.subText }]}>Devise Principale</Text>
                  <Dropdown
                    style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                    placeholderStyle={{ color: colors.subText }}
                    selectedTextStyle={{ color: colors.text }}
                    containerStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }}
                    itemTextStyle={{ color: colors.text }}
                    activeColor={colors.inputBg}
                    data={CURRENCIES}
                    labelField="label"
                    valueField="value"
                    value={localDevise}
                    onChange={(item) => {
                      setLocalDevise(item.value);
                      if (item.value !== status) setDevise(item.value);
                    }}
                  />
                </View>
              </View>
            )}

            {/* ÉTAPE 2 : Personnalisation Profil */}
            {currentStep === 2 && (
              <View style={styles.slideLeft}>
                <Text style={[styles.title, { color: colors.text }]}>Faisons connaissance</Text>
                <Text style={[styles.subtitleStep, { color: colors.subText }]}>Comment devrions-nous vous appeler sur votre tableau de bord ?</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.subText }]}>Prénom ou Pseudo</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    placeholder="Ex: Mathieu"
                    placeholderTextColor={colors.subText + '80'}
                    value={userName}
                    onChangeText={setUserName}
                    maxLength={20}
                  />
                </View>
                <Text style={styles.privacyNote}>🔒 Vos données restent exclusivement stockées sur votre appareil.</Text>
              </View>
            )}
          </View>

          {/* ACTIONS: Gros bouton d'action bas style Luma */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: accentColor }]} 
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {currentStep === 0 ? 'Commencer' : currentStep === 2 ? 'Lancer l\'application' : 'Continuer'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  progressContainer: { flexDirection: 'row', gap: 6, marginTop: 16, height: 4, width: '100%' },
  dot: { height: '100%', borderRadius: 2 },
  mainCard: { flex: 1, justifyContent: 'center', width: '100%' },
  slide: { alignItems: 'center', textAlign: 'center' },
  slideLeft: { width: '100%', paddingHorizontal: 4 },
  logoPlaceholder: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  logoIcon: { fontSize: 36 },
  heroTitle: { fontSize: 32, fontWeight: '800', textAlign: 'center', lineHeight: 40, marginBottom: 16, letterSpacing: -0.5 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 8 },
  subtitleStep: { fontSize: 15, lineHeight: 22, marginBottom: 32 },
  inputGroup: { width: '100%', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  dropdown: { width: '100%', height: 56, borderRadius: 14, paddingHorizontal: 16, borderWidth: 1 },
  input: { width: '100%', height: 56, borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, fontSize: 16 },
  privacyNote: { fontSize: 12, color: '#8c8e9b', textAlign: 'center', marginTop: 12 },
  footer: { marginBottom: 24, width: '100%' },
  primaryButton: { width: '100%', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700', letterSpacing: -0.1 },
});