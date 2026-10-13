/**
 * Splash animé « Old Money » — le moment marque.
 *
 * Logo qui se dépose en fondu + léger zoom (driver natif), nom de marque
 * en Sora, indicateur or. Fond nuit fixe dans les deux thèmes : c'est un
 * moment de marque, pas un écran de contenu. Aucun texte traduit ici :
 * le gestionnaire de langue n'est pas forcément initialisé à cet instant.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, ActivityIndicator, StyleSheet } from 'react-native';
import { GOLD } from '../theme/colors';
import { displayFonts } from '../theme/typography';

const NIGHT = '#0e1014';
const CREAM = '#FFF7E8';

export function SplashAnimated() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.brand, { opacity, transform: [{ scale }] }]}>
        <Image source={require('../../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.wordmark}>Orane.d</Text>
      </Animated.View>
      <ActivityIndicator size="small" color={GOLD.champagne} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NIGHT, alignItems: 'center', justifyContent: 'center' },
  brand: { alignItems: 'center' },
  logo: { width: 96, height: 96, borderRadius: 24 },
  wordmark: {
    fontFamily: displayFonts.bold,
    fontSize: 32,
    letterSpacing: -0.8,
    color: CREAM,
    marginTop: 16,
  },
  loader: { position: 'absolute', bottom: 72 },
});

export default SplashAnimated;
