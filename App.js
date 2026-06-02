import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FinanceProvider, useFinance } from './src/context/FinanceContext';

// Import des écrans principaux
import HomeScreen from './src/screens/HomeScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Import des icônes
import { Home, PlusCircle, PieChart, Settings as SettingsIcon } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

// 1. On crée un composant de navigation interne qui a accès au Contexte Finance
function AppNavigator() {
  const { isDark, accentColor } = useFinance();

  // Palette dynamique pour la barre d'onglets (Bottom Tab)
  const tabColors = {
    barBg: isDark ? '#16171f' : '#ffffff',
    inactive: isDark ? '#555660' : '#8c8e9b',
    border: isDark ? '#1e202c' : '#eef0f5',
  };

  return (
    <NavigationContainer>
      {/* Configuration de la barre de statut du téléphone (Heure, Batterie...) */}
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={isDark ? '#0f1015' : '#f5f6fa'} 
      />

      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: tabColors.barBg,
            borderTopWidth: isDark ? 0 : 1,
            borderTopColor: tabColors.border,
            elevation: isDark ? 0 : 4,
            shadowColor: '#000',
            shadowOpacity: isDark ? 0 : 0.05,
            shadowRadius: 10,
            height: 65,
            paddingBottom: 12,
            paddingTop: 8,
          },
          tabBarActiveTintColor: accentColor || '#3b82f6', // Utilise la couleur principale choisie par l'utilisateur
          tabBarInactiveTintColor: tabColors.inactive,
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

// 2. Le composant racine encapsule le tout dans le Provider
export default function App() {
  return (
    <FinanceProvider>
      <AppNavigator />
    </FinanceProvider>
  );
}