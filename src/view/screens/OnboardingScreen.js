import React, { useState, useRef } from 'react';
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
import Constants from 'expo-constants';

const slides = [
  {
    id: '1',
    icon: Wallet,
    title: `Bienvenue sur ${APP_NAME}`,
    description: 'Gérez vos finances au quotidien\nen toute simplicité',
    accent: '#3b82f6',
  },
  {
    id: '2',
    icon: Repeat,
    title: 'Le Double Portefeuille',
    description:
      'Un système de vases communicants\nentre Mobile Money et Cash/Espèces\nlors de vos retraits et transactions',
    accent: '#8b5cf6',
  },
  {
    id: '3',
    icon: Shield,
    title: 'Contrôle & Sécurité',
    description:
      'Alertes de budget personnalisées\net Mode Discret activable\navec votre code PIN à 5 chiffres',
    accent: '#06b6d4',
  },
];

export default function OnboardingScreen({ onComplete }) {
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { isDark } = useFinance();
  const insets = useSafeAreaInsets();
  const { width, contentMaxWidth, contentPadding, cardPadding, borderRadius } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding, cardPadding, borderRadius);

  const isLast = currentIndex === slides.length - 1;

  const colors = {
    bg: isDark ? '#0f1015' : '#ffffff',
    text: isDark ? '#ffffff' : '#131419',
    subText: isDark ? '#8c8e9b' : '#6a6c7a',
    dot: isDark ? '#2a2b38' : '#d1d5db',
  };

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
            { backgroundColor: slide.accent + '20' },
          ]}
        >
          <IconComp size={64} color={slide.accent} strokeWidth={1.5} />
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
                      ? slides[currentIndex].accent
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
            { backgroundColor: slides[currentIndex].accent },
          ]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
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
    borderRadius: 70,
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
    borderRadius: 4,
    marginHorizontal: 4,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
});
