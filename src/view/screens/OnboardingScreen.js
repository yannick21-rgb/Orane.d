import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Wallet, Repeat, Shield } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinance } from '../../viewmodel/FinanceContext';
import { APP_NAME } from '../../model/AppConstants';
import { useResponsive } from '../../utils/responsive';
import { radius } from '../theme/tokens';
import Constants from 'expo-constants';
import { buildColors } from '../theme';

const slides = [
  {
    id: '1',
    icon: Wallet,
    title: `Bienvenue sur ${APP_NAME}`,
    description: 'Gérez vos finances au quotidien\nen toute simplicité',
  },
  {
    id: '2',
    icon: Repeat,
    title: 'Le Double Portefeuille',
    description:
      'Un système de vases communicants\nentre Mobile Money et Cash/Espèces\nlors de vos retraits et transactions',
  },
  {
    id: '3',
    icon: Shield,
    title: 'Contrôle & Sécurité',
    description:
      'Alertes de budget personnalisées\net Mode Discret activable\navec votre code PIN à 5 chiffres',
  },
];

export default function OnboardingScreen({ onComplete }) {
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { isDark, accentColor } = useFinance();
  const insets = useSafeAreaInsets();
  const { width, contentMaxWidth, contentPadding, cardPadding, borderRadius } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding, cardPadding, borderRadius);

  const isLast = currentIndex === slides.length - 1;

  // Ecart conservé : l'onboarding a un fond plein blanc en thème clair,
  // là où le reste de l'application utilise le gris très clair. En thème
  // sombre, l'override s'annule — sinon le fond blanc resterait et l'encre
  // claire deviendrait illisible.
  const colors = useMemo(
    () => buildColors(isDark, accentColor, isDark ? {} : { bg: '#ffffff' }),
    [isDark, accentColor]
  );

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('@oraned_onboarding_seen', 'true');
    } catch (_) {}
    try {
      try { if (Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient') return; } catch (_) {}
      const Notifications = require('expo-notifications');
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('[Onboarding] Permission notifications refusée — l\'app fonctionne sans.');
      }
    } catch (e) {
      if (e && e.message && e.message.includes('removed from Expo Go')) return;
    }
    onComplete?.();
  };

  const onMomentumScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / contentMaxWidth);
    setCurrentIndex(index);
  };

  const renderSlide = ({ item: slide }) => {
    const IconComp = slide.icon;
    return (
      <View style={styles.slide}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: accentColor + '20' },
          ]}
        >
          <IconComp size={64} color={accentColor} strokeWidth={1.5} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          {slide.title}
        </Text>
        <Text style={[styles.description, { color: colors.subText }]}>
          {slide.description}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        bounces={false}
      />
      <View
        style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    currentIndex === index
                      ? accentColor
                      : colors.dot,
                  width: currentIndex === index ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: accentColor },
          ]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: colors.accentFg }]}>
            {isLast ? 'Commencer' : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (cp, cpad, cardP, br) => StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width: cp,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: cpad,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: cpad,
    paddingTop: 20,
    maxWidth: cp,
    width: '100%',
    alignSelf: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: radius.pill,
    marginHorizontal: 4,
  },
  button: {
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
  },
});
