import React from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FinanceProvider, useFinance } from './src/context/FinanceContext';

// Import des écrans principaux
import HomeScreen from './src/screens/HomeScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

// Import des icônes
import { Home, PlusCircle, PieChart, Settings as SettingsIcon } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  const { isDark, accentColor, hasSeenOnboarding, isLoaded } = useFinance();

  const themeColors = {
    bg: isDark ? '#0f1015' : '#f5f6fa',
    barBg: isDark ? '#16171f' : '#ffffff',
    inactive: isDark ? '#555660' : '#8c8e9b',
    border: isDark ? '#1e202c' : '#eef0f5',
  };

  // 1. Écran de chargement initial sécurisé
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.bg }}>
        <ActivityIndicator size="large" color={accentColor || '#3b82f6'} />
      </View>
    );
  }

  // 2. Affichage prioritaire de l'onboarding
  if (!hasSeenOnboarding) {
    return (
      <>
        <StatusBar 
          barStyle={isDark ? 'light-content' : 'dark-content'} 
          backgroundColor={themeColors.bg} 
        />
        <OnboardingScreen />
      </>
    );
  }

  // 3. Rendu de la navigation une fois l'onboarding validé
  return (
    <NavigationContainer>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={themeColors.bg} 
      />

      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: themeColors.barBg,
            borderTopWidth: isDark ? 0 : 1,
            borderTopColor: themeColors.border,
            height: 65,
            paddingBottom: 12,
            paddingTop: 8,
            // 💡 Suppression des props "shadow*" obsolètes sur le Web pour éviter les avertissements
          },
          tabBarActiveTintColor: accentColor || '#3b82f6',
          tabBarInactiveTintColor: themeColors.inactive,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          }
        }}
      >
        <Tab.Screen 
          name="Accueil" 
          component={HomeScreen} 
          options={{
            tabBarIcon: ({ color }) => <Home color={color} size={22} />,
          }}
        />
        <Tab.Screen 
          name="Ajout" 
          component={AddTransactionScreen} 
          options={{
            tabBarIcon: ({ color }) => <PlusCircle color={color} size={22} />,
          }}
        />
        <Tab.Screen 
          name="Stats" 
          component={StatsScreen} 
          options={{
            tabBarIcon: ({ color }) => <PieChart color={color} size={22} />,
          }}
        />
        <Tab.Screen 
          name="Paramètres" 
          component={SettingsScreen} 
          options={{
            tabBarIcon: ({ color }) => <SettingsIcon color={color} size={22} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <AppNavigator />
    </FinanceProvider>
  );
}