import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, Alert, StatusBar, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

let LocalAuthentication = null;
if (Platform.OS !== 'web') {
  try { LocalAuthentication = require('expo-local-authentication'); } catch (_) {}
}
import { useAuth } from '../../viewmodel/AuthContext';
import { useResponsive } from '../../utils/responsive';
import { useColors } from '../theme';
import { radius } from '../theme/tokens';
import { type } from '../theme/type';

const PIN_LENGTH = 5;

export default function ProfileSelectorScreen({ navigation }) {
  const { accountsIndex, loginToUser } = useAuth();
  const { contentMaxWidth, contentPadding, cardPadding, borderRadius } = useResponsive();
  const colors = useColors();
  const styles = createStyles(contentMaxWidth, contentPadding, cardPadding, borderRadius, colors);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedName, setSelectedName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const biometricAttempted = useRef(false);

  useEffect(() => {
    if (!LocalAuthentication) return;
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometrics(compatible && enrolled);
    })();
  }, []);

  const handleProfilePress = async (id, name) => {
    biometricAttempted.current = false;
    if (hasBiometrics && LocalAuthentication) {
      biometricAttempted.current = true;
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authentification requise pour ouvrir ce compte',
        fallbackLabel: 'Utiliser le code PIN',
        cancelLabel: 'Annuler',
      });
      if (result.success) {
        await loginToUser(id, '');
        return;
      }
    }
    setSelectedId(id);
    setSelectedName(name);
    setPin('');
    setModalVisible(true);
  };

  const pressDigit = (d) => {
    if (pin.length < PIN_LENGTH) setPin((p) => p + d);
  };

  const deleteDigit = () => setPin((p) => p.slice(0, -1));

  useEffect(() => {
    if (pin.length !== PIN_LENGTH || loading) return;
    (async () => {
      setLoading(true);
      try {
        await loginToUser(selectedId, pin);
        setModalVisible(false);
      } catch (e) {
        Alert.alert('Code incorrect', e.message || 'Le code PIN saisi ne correspond pas à ce compte.');
        setPin('');
      } finally {
        setLoading(false);
      }
    })();
  }, [pin]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle={colors.isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <View style={styles.head}>
        <Image source={require('../../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>Connecte-toi pour continuer</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {accountsIndex.map((acct) => (
          <TouchableOpacity
            key={acct.id}
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => handleProfilePress(acct.id, acct.name)}
          >
            <View style={styles.avatar}>
              <Text style={[styles.avatarText, { color: colors.accentFg }]}>{acct.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.cardName} numberOfLines={1}>{acct.name}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.card, styles.addCard]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Register')}
        >
          <View style={[styles.avatar, styles.addAvatar]}>
            <Text style={styles.addIcon}>+</Text>
          </View>
          <Text style={styles.addLabel}>Ajouter un compte</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={[styles.avatar, { width: 64, height: 64, borderRadius: radius.pill }]}>
              <Text style={[styles.avatarText, { fontSize: 24, color: colors.accentFg }]}>
                {selectedName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.modalTitle}>{selectedName}</Text>
            <Text style={styles.modalSub}>Saisis ton code PIN {PIN_LENGTH} chiffres</Text>

            <View style={styles.dots}>
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View key={i} style={[styles.dot, pin[i] && styles.dotFill]} />
              ))}
            </View>

            <View style={styles.pad}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <TouchableOpacity key={n} style={styles.key} onPress={() => pressDigit(String(n))}>
                  <Text style={styles.keyText}>{n}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.key} onPress={deleteDigit}>
                <Text style={[styles.keyText, { color: colors.inkMid }]}>⌫</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.key} onPress={() => pressDigit('0')}>
                <Text style={styles.keyText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.key} onPress={() => setModalVisible(false)}>
                <Text style={[styles.keyText, { color: colors.danger }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (cp, cpad, cardP, br, colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  head: { alignItems: 'center', paddingTop: 50, paddingBottom: 32 },
  logo: { width: 140, height: 140, marginBottom: 8 },
  tagline: { fontSize: 14, color: colors.inkMid, marginTop: 6 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: cpad,
    gap: 18,
    maxWidth: cp,
    width: '100%',
    alignSelf: 'center',
  },

  card: {
    width: 100,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addCard: { borderStyle: 'dashed' },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 22, fontWeight: 'bold' },
  addAvatar: { backgroundColor: colors.sunken },
  addIcon: { fontSize: 24, color: colors.inkMid, fontWeight: '300' },

  cardName: { fontSize: 13, fontWeight: '600', color: colors.ink, textAlign: 'center', maxWidth: 84 },
  addLabel: { ...type.micro, color: colors.inkMid, textAlign: 'center' },

  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: 300,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: 28,
    alignItems: 'center',
  },
  modalTitle: { ...type.title, color: colors.ink, marginTop: 10, marginBottom: 4 },
  modalSub: { fontSize: 13, color: colors.inkMid, marginBottom: 22 },

  dots: { flexDirection: 'row', gap: 12, marginBottom: 26 },
  dot: {
    width: 14, height: 14, borderRadius: radius.pill,
    backgroundColor: colors.sunken,
    borderWidth: 1.5, borderColor: colors.accent,
  },
  dotFill: { backgroundColor: colors.accent },

  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    maxWidth: 240,
  },
  key: {
    width: 70, height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.sunken,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: { fontSize: 22, fontWeight: '600', color: colors.ink },
});
