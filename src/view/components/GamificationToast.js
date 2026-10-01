import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGamification } from '../../viewmodel/GamificationContext';
import { useFinance } from '../../viewmodel/FinanceContext';

export default function GamificationToast() {
  const { notifications, dismissNotification } = useGamification();
  const { isDark, accentColor } = useFinance();
  const insets = useSafeAreaInsets();
  const note = notifications.length ? notifications[notifications.length - 1] : null;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!note) return;
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => dismissNotification(note.id));
  }, [note?.id]);

  if (!note) return null;

  const bg = note.kind === 'level' ? accentColor : note.kind === 'badge' ? '#f59e0b' : isDark ? '#1e293b' : '#ffffff';
  const fg = note.kind === 'level' || note.kind === 'badge' ? '#fff' : isDark ? '#fff' : '#131419';
  const subFg = note.kind === 'level' || note.kind === 'badge' ? 'rgba(255,255,255,0.9)' : isDark ? '#94a3b8' : '#6a6c7a';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { top: insets.top + 8, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] },
      ]}
    >
      <View style={[styles.card, { backgroundColor: bg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#eef0f5' }]}>
        <Text style={styles.icon}>{note.icon || '⭐'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: fg }]}>{note.title}</Text>
          {!!note.subtitle && <Text style={[styles.sub, { color: subFg }]}>{note.subtitle}</Text>}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 9999, alignItems: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 420,
    width: '100%',
  },
  icon: { fontSize: 22 },
  title: { fontSize: 14, fontWeight: '800' },
  sub: { fontSize: 12, fontWeight: '600', marginTop: 1 },
});
