import './src/utils/cryptoPolyfill';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StatusBar, ActivityIndicator, View, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import CrossPlatformPager from './src/view/components/CrossPlatformPager';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.hideAsync();

let usePreventScreenCapture = () => {};
try {
  const sc = require('expo-screen-capture');
  usePreventScreenCapture = sc.usePreventScreenCapture || (() => {});
} catch (e) {}
import { AuthProvider, useAuth } from './src/viewmodel/AuthContext';
import { FinanceProvider, useFinance } from './src/viewmodel/FinanceContext';
import { DebtProvider } from './src/viewmodel/DebtContext';
import { TontineProvider } from './src/viewmodel/TontineContext';
import { GamificationProvider } from './src/viewmodel/GamificationContext';
import { useTranslation } from './src/utils/LanguageManager';
import GamificationToast from './src/view/components/GamificationToast';

import HomeScreen from './src/view/screens/HomeScreen';
import AddTransactionScreen from './src/view/screens/AddTransactionScreen';
import StatsScreen from './src/view/screens/StatsScreen';
import SettingsScreen from './src/view/screens/SettingsScreen';
import LoginScreen from './src/view/screens/LoginScreen';
import RegisterScreen from './src/view/screens/RegisterScreen';
import OnboardingScreen from './src/view/screens/OnboardingScreen';

import { Home, PlusCircle, PieChart, Settings as SettingsIcon } from 'lucide-react-native';
import { buildColors, useColors } from './src/view/theme';

const LOADING_TIMEOUT = 5000;

function LoadingScreen() {
  const { bg, accent } = useColors();
  return (
    <View style={[styles.centered, { backgroundColor: bg }]}>
      <ActivityIndicator size="large" color={accent} />
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

const TAB_BAR_HEIGHT = 60;

function MainTabs() {
  usePreventScreenCapture();
  const pagerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { isDark, accentColor } = useFinance();
  const { t } = useTranslation();

  const screens = [
    { key: 'Accueil', component: HomeScreen },
    { key: 'Ajout', component: AddTransactionScreen },
    { key: 'Stats', component: StatsScreen },
    { key: 'Paramètres', component: SettingsScreen },
  ];

  const icons = [Home, PlusCircle, PieChart, SettingsIcon];
  const tabLabels = [t('home'), t('add'), t('stats'), t('settings')];

  const scaleAnims = useRef(screens.map(() => new Animated.Value(1))).current;

  const onTabPress = (i) => {
    pagerRef.current?.setPage(i);
    setActiveIndex(i);
    Animated.sequence([
      Animated.spring(scaleAnims[i], { toValue: 1.15, useNativeDriver: true, friction: 3 }),
      Animated.spring(scaleAnims[i], { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
  };

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

  const insets = useSafeAreaInsets();

  // Écarts conservés : la barre d'onglets a sa propre teinte de bordure et
  // un gris inactif plus contrasté que le `subText` de la palette.
  const colors = useMemo(() => {
    const base = buildColors(isDark, accentColor);
    return {
      ...base,
      barBg: base.card,
      inactive: isDark ? '#555660' : '#8c8e9b',
      border: isDark ? '#1e202c' : base.borderSoft,
    };
  }, [isDark, accentColor]);

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
      <GamificationToast />
      <View style={{
        flexDirection: 'row',
        backgroundColor: colors.barBg,
        borderTopWidth: isDark ? 0 : 1,
        borderTopColor: colors.border,
        height: TAB_BAR_HEIGHT + insets.bottom,
        paddingBottom: insets.bottom + 8,
        paddingTop: 6,
      }}>
        {screens.map((s, i) => {
          const focused = activeIndex === i;
          const IconComp = icons[i];
          return (
            <TouchableOpacity
              key={s.key}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => onTabPress(i)}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnims[i] }] }}>
                <IconComp color={focused ? accentColor : colors.inactive} size={22} />
              </Animated.View>
              <Text style={{
                fontSize: 11,
                fontWeight: '600',
                color: focused ? accentColor : colors.inactive,
                marginTop: 2,
              }}>
                {tabLabels[i]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const { isLoaded, isUserDataLoaded } = useFinance();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const [forceReady, setForceReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasSeenOnboarding((prev) => (prev === null ? false : prev));
    }, LOADING_TIMEOUT);

    AsyncStorage.getItem('@oraned_onboarding_seen')
      .then((value) => {
        clearTimeout(timer);
        setHasSeenOnboarding(value === 'true');
      })
      .catch(() => {
        clearTimeout(timer);
        setHasSeenOnboarding(false);
      });

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const force = setTimeout(() => {
      setForceReady(true);
      setHasSeenOnboarding(prev => prev === null ? false : prev);
    }, 15000);
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

  if (hasSeenOnboarding === false) {
    return (
      <OnboardingScreen
        onComplete={() => setHasSeenOnboarding(true)}
      />
    );
  }

  if (!isReady || hasSeenOnboarding === null) return <LoadingScreen />;

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      {!user ? <AuthScreen /> : <MainTabs />}
    </Animated.View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FinanceProvider>
          <DebtProvider>
            <TontineProvider>
              <GamificationProvider>
                <RootNavigator />
              </GamificationProvider>
            </TontineProvider>
          </DebtProvider>
        </FinanceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
