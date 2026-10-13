/**
 * Onboarding premium en 3 étapes.
 *
 * LOGIQUE INCHANGÉE : persistance `@oraned_onboarding_seen`, demande de
 * permission notifications à la fin (les permissions existantes restent
 * en place), callback `onComplete`. Nouveau rendu : visuels animés
 * (anneaux pulsants + icône flottante, driver natif), progression animée
 * pilotée par le scroll, bouton « Passer », textes via LanguageManager.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { Wallet, Zap, ShieldCheck } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useTranslation } from '../../utils/LanguageManager';
import { useResponsive } from '../../utils/responsive';
import { useReduceMotion } from '../../utils/useReduceMotion';
import Constants from 'expo-constants';
import { useColors } from '../theme';
import { typography, maxFontScale } from '../theme/typography';
import { Button } from '../components/ui';

let Haptics = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  Haptics = null;
}

/** Anneau qui respire en boucle (statique si réduit). */
function PulseRing({ size, color, delay = 0, style = null }) {
  const reduce = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  React.useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.12, duration: 1600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.12, duration: 1600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 1600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 1600, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity, delay, reduce]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: color,
          opacity,
          transform: [{ scale }],
        },
        style,
      ]}
    />
  );
}

function SlideVisual({ IconComp, colors }) {
  const reduce = useReduceMotion();
  const float = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -10, duration: 1800, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [float, reduce]);

  return (
    <View style={visualStyles.stage} accessible={false} importantForAccessibility="no">
      <PulseRing size={208} color={colors.accent} />
      <PulseRing size={208} color={colors.accent} delay={800} style={visualStyles.ring2} />
      <Animated.View style={{ transform: [{ translateY: float }] }}>
        <LinearGradient
          colors={colors.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[visualStyles.orb, { borderColor: colors.gold }]}
        >
          <IconComp size={64} color={colors.gold} strokeWidth={1.4} />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const visualStyles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center', height: 260, marginBottom: 40 },
  ring2: { position: 'absolute' },
  orb: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    top: -66,
  },
});

export default function OnboardingScreen({ onComplete }) {
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const { isDark } = useFinance();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsive();

  const colors = useColors();
  const slideWidth = contentMaxWidth;

  const slides = [
    { id: '1', IconComp: Wallet, title: t('ob1_titre'), description: t('ob1_desc') },
    { id: '2', IconComp: Zap, title: t('ob2_titre'), description: t('ob2_desc') },
    { id: '3', IconComp: ShieldCheck, title: t('ob3_titre'), description: t('ob3_desc') },
  ];

  const isLast = currentIndex === slides.length - 1;

  const handleNext = () => {
    try {
      Haptics?.selectionAsync?.().catch(() => {});
    } catch (e) {}
    if (isLast) {
      handleComplete();
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
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
    const index = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
    setCurrentIndex(index);
  };

  const renderSlide = ({ item: slide }) => (
    <View style={[styles.slide, { width: slideWidth }]}>
      <SlideVisual IconComp={slide.IconComp} colors={colors} />
      <Text
        maxFontSizeMultiplier={maxFontScale}
        style={[typography.title, styles.title, { color: colors.ink }]}
      >
        {slide.title}
      </Text>
      <Text
        maxFontSizeMultiplier={maxFontScale}
        style={[typography.body, styles.description, { color: colors.inkMid }]}
      >
        {slide.description}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      {!isLast && (
        <TouchableOpacity
          onPress={handleComplete}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={t('passer')}
          style={[styles.skip, { top: insets.top + 8 }]}
        >
          <Text style={[typography.bodyStrong, { color: colors.inkFaint }]}>{t('passer')}</Text>
        </TouchableOpacity>
      )}
      <View style={{ width: slideWidth, flex: 1, alignSelf: 'center' }}>
        <Animated.FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumScrollEnd}
        />
      </View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dotsContainer}>
          {slides.map((s, index) => {
            const scale = scrollX.interpolate({
              inputRange: [(index - 1) * slideWidth, index * slideWidth, (index + 1) * slideWidth],
              outputRange: [1, 1.7, 1],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange: [(index - 1) * slideWidth, index * slideWidth, (index + 1) * slideWidth],
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={s.id}
                style={[
                  styles.dot,
                  { backgroundColor: colors.accent, transform: [{ scale }], opacity },
                ]}
              />
            );
          })}
        </View>
        <Button
          label={isLast ? t('commencer') : t('suivant')}
          size="lg"
          fullWidth
          onPress={handleNext}
          accessibilityLabel={isLast ? t('commencer') : t('suivant')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skip: { position: 'absolute', right: 20, zIndex: 10, minHeight: 44, justifyContent: 'center' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  title: { textAlign: 'center', marginBottom: 14 },
  description: { textAlign: 'center', lineHeight: 23 },
  footer: { paddingHorizontal: 24, paddingTop: 16, maxWidth: 480, width: '100%', alignSelf: 'center' },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24, minHeight: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 5 },
});
