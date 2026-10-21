import './src/utils/cryptoPolyfill';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StatusBar, View, StyleSheet, Animated, Keyboard, Modal,
  TouchableOpacity, Text,
} from 'react-native';
import CrossPlatformPager from './src/view/components/CrossPlatformPager';
import TabBar from './src/view/components/TabBar';
import QuickAddFab from './src/view/components/QuickAddFab';
import SplashAnimated from './src/view/components/SplashAnimated';
import TransactionSheet from './src/view/components/TransactionSheet';
import { QuickAddProvider, useQuickAdd } from './src/view/components/QuickAddContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import ErrorBoundary from './src/view/components/ErrorBoundary';

SplashScreen.hideAsync();

import { useScreenCapturePolicy } from './src/utils/screenCapture';
import { AuthProvider, useAuth } from './src/viewmodel/AuthContext';
import { FinanceProvider, useFinance } from './src/viewmodel/FinanceContext';
import { DebtProvider } from './src/viewmodel/DebtContext';
import { TontineProvider } from './src/viewmodel/TontineContext';
import { useTranslation } from './src/utils/LanguageManager';

import HomeScreen from './src/view/screens/HomeScreen';
import AddTransactionScreen from './src/view/screens/AddTransactionScreen';
import StatsScreen from './src/view/screens/StatsScreen';
import SettingsScreen from './src/view/screens/SettingsScreen';
import LoginScreen from './src/view/screens/LoginScreen';
import RegisterScreen from './src/view/screens/RegisterScreen';
import OnboardingScreen from './src/view/screens/OnboardingScreen';

import { buildColors, ThemeProvider } from './src/view/theme';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Sora_600SemiBold,
  Sora_700Bold,
} from '@expo-google-fonts/sora';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';

const LOADING_TIMEOUT = 5000;

/** Pages du pager ciblées par les 3 onglets (Accueil, Stats, Réglages).
 *  La page Ajout n'est plus dans le pager : c'est un modal distinct. */
const TAB_PAGES = [0, 1, 2];

function LoadingScreen({ onSkip }) {
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0e1014' }}>
      <SplashAnimated />
      {showSkip && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 120,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#FFF7E8',
          }}
          onPress={onSkip}
        >
          <Text style={{ color: '#FFF7E8', fontWeight: '600' }}>Passer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);

  if (isLogin) {
    return <LoginScreen onSwitchToRegister={() => setIsLogin(false)} />;
  }
  return <RegisterScreen onSwitchToLogin={() => setIsLogin(true)} />;
}

function MainTabs() {
  return (
    <QuickAddProvider>
      <MainTabsBody />
    </QuickAddProvider>
  );
}

function MainTabsBody() {
  useScreenCapturePolicy();
  const pagerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [keyboardHidden, setKeyboardHidden] = useState(false);
  const { isDark, accentColor, editingTransaction, setEditingTransaction } = useFinance();
  const { t } = useTranslation();

  const screens = [
    { key: 'Accueil', component: HomeScreen },
    { key: 'Stats', component: StatsScreen },
    { key: 'Paramètres', component: SettingsScreen },
  ];

  // 3 onglets (Accueil, Stats, Paramètres) — la page Ajout n'est plus dans
  // le pager : c'est un modal distinct (édition + ajout rapide).
  const tabLabels = [t('home'), t('stats'), t('settings')];

  // Clavier ouvert → la barre se retire, le pager reprend l'espace
  // (convention tabBarHideOnKeyboard). Les actions restent atteignables
  // à la fermeture du clavier, toujours en zone du pouce.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardHidden(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHidden(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const quick = useQuickAdd();

  const onTabPress = useCallback((page) => {
    // L'onglet « Ajouter » n'existe plus : la création passe par la modale
    // `TransactionSheet` (bouton « + » de la rangée d'actions rapides sur
    // l'Accueil). Ici, simple navigation vers la page du pager.
    pagerRef.current?.setPage(page);
    setActiveIndex(page);
  }, []);

  const navigateToTab = useCallback((name) => {
    const idx = screens.findIndex(s => s.key === name);
    if (idx >= 0) {
      pagerRef.current?.setPage(idx);
      setActiveIndex(idx);
    }
  }, []);

  const tabNav = useCallback((name) => {
    navigateToTab(name);
  }, [navigateToTab]);

  const tabNavigation = { navigate: tabNav, goBack: () => navigateToTab('Accueil') };

  const colors = useMemo(() => buildColors(isDark, accentColor), [isDark, accentColor]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <CrossPlatformPager
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => setActiveIndex(e.nativeEvent.position)}
      >
        {screens.map(({ key, component: ScreenComp }) => (
          <View key={key} style={{ flex: 1 }}>
            <ScreenComp navigation={tabNavigation} />
          </View>
        ))}
      </CrossPlatformPager>
      <TabBar
        labels={tabLabels}
        pages={TAB_PAGES}
        activeIndex={activeIndex}
        onTabPress={onTabPress}
        hidden={keyboardHidden}
      />
      {/* Ajout rapide : bouton flottant bas-droite de la page Accueil
          (remplace l'onglet « Ajouter » retiré). Masqué dès qu'on quitte
          l'Accueil ou que le clavier s'ouvre — même convention que la
          barre d'onglets. */}
      {activeIndex === TAB_PAGES[0] && !keyboardHidden && (
        <QuickAddFab onPress={() => quick.open('expense')} />
      )}
      <TransactionSheet
        visible={quick.visible}
        initialType={quick.initialType}
        onClose={quick.close}
      />

      {/* Édition d'une opération — vrai Modal React Native, hors du pager :
          non accessible par balayage. Ouvert via setEditingTransaction. */}
      <Modal
        visible={!!editingTransaction}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingTransaction(null)}
      >
        <AddTransactionScreen
          onClose={() => setEditingTransaction(null)}
        />
      </Modal>
    </View>
  );
}

/**
 * Ordre contractuel du premier lancement :
 *   1. l'onboarding — **une seule fois**, flag persisté avant d'avancer ;
 *   2. l'authentification (Login / Inscription) ;
 *   3. les onglets.
 * L'onboarding est donc rendu **avant tout test d'authentification**,
 * même si l'état auth/finance n'est pas encore prêt : tant que le flag
 * est inconnu, on reste sur l'écran de chargement — jamais sur l'auth.
 *
 * « Une seule fois » : la valeur lue ne régresse JAMAIS vers « non vu »
 * (garde-fou `seenRef`), et tous les filets de secours (lenteur,
 * stockage injoignable) tombent côté « vu » : au pire on saute
 * l'onboarding, on ne le répète jamais.
 */
function RootNavigator() {
  const { user, loading } = useAuth();
  const { isLoaded, isUserDataLoaded } = useFinance();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null); // null = en lecture
  const [forceReady, setForceReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const seenRef = useRef(false); // « vu » mémorisé : empêche toute régression

  // Fin d'onboarding : état mémoire d'abord (la session ne le rejoue
  // pas), puis écriture persistante — l'écran écrit aussi la clé, les
  // deux écritures se couvrent si l'une échoue.
  const markOnboardingSeen = useCallback(() => {
    seenRef.current = true;
    setHasSeenOnboarding(true);
    AsyncStorage.setItem('@oraned_onboarding_seen', 'true').catch(() => {});
  }, []);

  // Lecture du flag, 3 tentatives rapprochées — aucune devinette : si le
  // stockage ne répond pas, on reste sur le chargement (l'ordre
  // onboarding → auth est ainsi garanti, pas seulement espéré).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const value = await AsyncStorage.getItem('@oraned_onboarding_seen');
          if (cancelled) return;
          // `seenRef` : si un filet de sécurité a déjà tranché « vu »,
          // une réponse tardive et vide ne doit pas réactiver l'onboarding.
          setHasSeenOnboarding(seenRef.current ? true : value === 'true');
          return;
        } catch (e) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
      // Stockage injoignable après 3 essais → « vu » : jamais de seconde
      // onboarding sur une panne.
      if (!cancelled) {
        seenRef.current = true;
        setHasSeenOnboarding(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Filet de sécurité : au-delà de LOADING_TIMEOUT sans réponse du
  // stockage, on décide sans attendre — en favor de « vu » (jamais de
  // répétition) — pour ne pas rester bloqué sur le chargement.
  // Met aussi seenRef.current = true : une lecture tardive avec null
  // ne doit pas réactiver l'onboarding (le safety a déjà décidé « vu »).
  useEffect(() => {
    const safety = setTimeout(() => {
      seenRef.current = true;
      setHasSeenOnboarding((prev) => (prev === null ? true : prev));
    }, LOADING_TIMEOUT);
    return () => clearTimeout(safety);
  }, []);

  // Force l'affichage de l'app au-delà de 15 s (données lentes) : ne
  // touche PAS au flag d'onboarding — décider de l'onboarding sur une
  // lenteur était la cause des répétitions.
  useEffect(() => {
    const force = setTimeout(() => setForceReady(true), 15000);
    return () => clearTimeout(force);
  }, []);

  const isReady = (forceReady || (!loading && isLoaded && (!user || isUserDataLoaded)));

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isReady, fadeAnim]);

  // 1) Onboarding — avant tout, y compris avant l'authentification.
  if (hasSeenOnboarding === false) {
    return <OnboardingScreen onComplete={markOnboardingSeen} />;
  }

  // 2) Chargement (flag ou données) : l'auth ne peut pas se glisser avant.
  if (!isReady || hasSeenOnboarding === null) return <LoadingScreen onSkip={() => { seenRef.current = true; setHasSeenOnboarding(true); }} />;

  // 3) Authentification, puis onglets.
  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      {!user ? <AuthScreen /> : <MainTabs />}
    </Animated.View>
  );
}

export default function App() {
  // Space Grotesk porte tous les chiffres de l'app, Sora les titres,
  // Inter le texte courant. On attend leur chargement avant de rendre
  // quoi que ce soit : afficher une frame en police système puis basculer
  // fait sauter toute la mise en page, et une colonne de montants qui se
  // recompose est exactement ce qu'on cherche à éviter ici.
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Sora_600SemiBold,
    Sora_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded && !fontError) {
    // Repli : fond de la palette, même en clair, pour éviter le flash blanc
    // au démarrage.
    return <View style={{ flex: 1, backgroundColor: '#0e1014' }} />;
  }
  if (fontError) console.warn('Space Grotesk indisponible, retour à la police système', fontError);

  return (
    // Requis pour les gestes (swipe des dettes/tontines, Phase 6) : sans
    // lui, les gestes natifs ne sont pas routés sur Android. Pure coquille
    // visuelle, aucune logique métier dedans.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <AuthProvider>
            <FinanceProvider>
              <DebtProvider>
                <TontineProvider>
                  <ThemeProvider>
                    <RootNavigator />
                  </ThemeProvider>
                </TontineProvider>
              </DebtProvider>
            </FinanceProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
