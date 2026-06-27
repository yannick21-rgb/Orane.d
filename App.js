import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StatusBar, ActivityIndicator, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/viewmodel/AuthContext';
import { FinanceProvider, useFinance } from './src/viewmodel/FinanceContext';
import { useTranslation } from './src/utils/LanguageManager';

import HomeScreen from './src/view/screens/HomeScreen';
import AddTransactionScreen from './src/view/screens/AddTransactionScreen';
import StatsScreen from './src/view/screens/StatsScreen';
import SettingsScreen from './src/view/screens/SettingsScreen';
import LoginScreen from './src/view/screens/LoginScreen';
import RegisterScreen from './src/view/screens/RegisterScreen';

import { Home, PlusCircle, PieChart, Settings as SettingsIcon } from 'lucide-react-native';

function LoadingScreen() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#3b82f6" />
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

  const colors = {
    bg: isDark ? '#0f1015' : '#f5f6fa',
    barBg: isDark ? '#16171f' : '#ffffff',
    inactive: isDark ? '#555660' : '#8c8e9b',
    border: isDark ? '#1e202c' : '#eef0f5',
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <PagerView
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
      </PagerView>
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
              onPress={() => { pagerRef.current?.setPage(i); setActiveIndex(i); }}
            >
              <IconComp color={focused ? accentColor : colors.inactive} size={22} />
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
  const { isLoaded } = useFinance();
  const [forceShow, setForceShow] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mountedRef.current) setForceShow(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (forceShow) {
    if (!user) return <AuthScreen />;
    return <MainTabs />;
  }

  if (loading || !isLoaded) return <LoadingScreen />;
  if (!user) return <AuthScreen />;
  return <MainTabs />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FinanceProvider>
          <RootNavigator />
        </FinanceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1015' },
});
