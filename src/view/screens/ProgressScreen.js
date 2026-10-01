import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useGamification } from '../../viewmodel/GamificationContext';
import { useTranslation } from '../../utils/LanguageManager';
import { useResponsive } from '../../utils/responsive';
import { BADGE_DEFS, STREAK_DEFS } from '../../model/GamificationModel';

export default function ProgressScreen({ onClose }) {
  const { isDark, accentColor } = useFinance();
  const { t } = useTranslation();
  const { contentMaxWidth, contentPadding, cardPadding, borderRadius } = useResponsive();
  const { levelInfo, streaks, badges, challenges } = useGamification();
  const styles = createStyles(contentMaxWidth, contentPadding, cardPadding, borderRadius);

  const colors = {
    bg: isDark ? '#0f1015' : '#f5f6fa',
    card: isDark ? '#16171f' : '#ffffff',
    text: isDark ? '#ffffff' : '#131419',
    subText: isDark ? '#8c8e9b' : '#6a6c7a',
    border: isDark ? '#2a2b38' : '#e8eaef',
    input: isDark ? '#1c1d28' : '#f0f1f6',
  };

  const unlockedIds = new Set((badges || []).map((b) => b.id));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('progres')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.levelHeader}>
            <View style={[styles.levelBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.levelBadgeText}>{levelInfo.level}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.levelTitle, { color: colors.text }]}>{t('niveau')} {levelInfo.level}</Text>
              <Text style={[styles.levelSub, { color: colors.subText }]}>
                {levelInfo.xpInCurrentLevel} / {levelInfo.xpToNextLevel} XP
              </Text>
            </View>
            <Text style={[styles.levelTotal, { color: accentColor }]}>{levelInfo.totalXp} XP</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.input }]}>
            <View style={[styles.progressFill, { backgroundColor: accentColor, width: `${Math.round(levelInfo.progress * 100)}%` }]} />
          </View>
          <Text style={[styles.progressHint, { color: colors.subText }]}>
            {levelInfo.xpToNextLevel - levelInfo.xpInCurrentLevel} XP avant le niveau {levelInfo.level + 1}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('series')}</Text>
        {STREAK_DEFS.map((def) => {
          const s = streaks[def.key];
          if (!s) return null;
          return (
            <View key={def.key} style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.streakRow}>
                <Text style={styles.streakIcon}>{def.icon}</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.streakName, { color: colors.text }]}>{t(def.tKey)}</Text>
                    {def.comingSoon && <Text style={[styles.comingSoon, { backgroundColor: colors.input, color: colors.subText }]}>{t('bientot')}</Text>}
                  </View>
                  <Text style={[styles.streakDesc, { color: colors.subText }]}>{t(def.descKey)}</Text>
                </View>
              </View>
              <View style={styles.streakStats}>
                <View style={[styles.streakStat, { backgroundColor: colors.input }]}>
                  <Text style={[styles.streakStatLabel, { color: colors.subText }]}>{t('actuel')}</Text>
                  <Text style={[styles.streakStatValue, { color: colors.text }]}>🔥 {s.current}</Text>
                </View>
                <View style={[styles.streakStat, { backgroundColor: colors.input }]}>
                  <Text style={[styles.streakStatLabel, { color: colors.subText }]}>{t('record')}</Text>
                  <Text style={[styles.streakStatValue, { color: colors.text }]}>🏆 {s.best}</Text>
                </View>
              </View>
            </View>
          );
        })}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('badges')}</Text>
        <View style={styles.badgeGrid}>
          {BADGE_DEFS.map((def) => {
            const unlocked = unlockedIds.has(def.id);
            const entry = (badges || []).find((b) => b.id === def.id);
            return (
              <View key={def.id} style={[styles.badgeCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: unlocked ? 1 : 0.45 }]}>
                <Text style={[styles.badgeIcon, { opacity: unlocked ? 1 : 0.5 }]}>{def.icon}</Text>
                <Text style={[styles.badgeName, { color: colors.text }]}>{t(def.tKey)}</Text>
                <Text style={[styles.badgeDesc, { color: colors.subText }]}>{t(def.descKey)}</Text>
                <Text style={[styles.badgeStatus, { color: unlocked ? '#2ecc71' : colors.subText }]}>
                  {unlocked ? `${t('debloque')} · ${new Date(entry.unlockedAt).toLocaleDateString('fr-FR')}` : t('verrouille')}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('defis_semaine')}</Text>
        {(challenges || []).map((c) => {
          const pct = c.target > 0 ? Math.min(1, c.progress / c.target) : 0;
          const done = c.status === 'done';
          return (
            <View key={c.id} style={[styles.card, { backgroundColor: colors.card, borderColor: done ? '#2ecc71' : colors.border, borderWidth: done ? 1.5 : 1 }]}>
              <View style={styles.challengeHeader}>
                <Text style={styles.challengeIcon}>{c.icon}</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.challengeTitle, { color: colors.text }]}>{t(c.tKey)}</Text>
                  <Text style={[styles.challengeDesc, { color: colors.subText }]}>{t(c.descKey)}</Text>
                </View>
                <View style={[styles.challengeBadge, { backgroundColor: done ? '#2ecc71' : colors.input }]}>
                  <Text style={[styles.challengeBadgeText, { color: done ? '#fff' : colors.subText }]}>{done ? t('termine') : t('a_faire')}</Text>
                </View>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.input, marginTop: 12 }]}>
                <View style={[styles.progressFill, { backgroundColor: done ? '#2ecc71' : accentColor, width: `${Math.round(pct * 100)}%` }]} />
              </View>
              <View style={styles.challengeFooter}>
                <Text style={[styles.challengeProgress, { color: colors.subText }]}>{c.progress} / {c.target}</Text>
                <Text style={[styles.challengeXp, { color: done ? '#2ecc71' : accentColor }]}>+{c.xpReward} XP</Text>
              </View>
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (cp, cpad, cardP, br) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: cpad, paddingVertical: 16, borderBottomWidth: 1,
    maxWidth: cp, width: '100%', alignSelf: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scroll: { paddingHorizontal: cpad, paddingBottom: 40, maxWidth: cp, width: '100%', alignSelf: 'center' },
  card: { padding: cardP, borderRadius: br, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 8, marginBottom: 8 },
  levelHeader: { flexDirection: 'row', alignItems: 'center' },
  levelBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  levelBadgeText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  levelTitle: { fontSize: 16, fontWeight: '800' },
  levelSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  levelTotal: { fontSize: 16, fontWeight: '800' },
  progressTrack: { height: 10, borderRadius: 999, overflow: 'hidden', marginTop: 12 },
  progressFill: { height: 10, borderRadius: 999 },
  progressHint: { fontSize: 11, fontWeight: '600', marginTop: 8 },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  streakIcon: { fontSize: 22 },
  streakName: { fontSize: 14, fontWeight: '700' },
  comingSoon: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  streakDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  streakStats: { flexDirection: 'row', gap: 8, marginTop: 12 },
  streakStat: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  streakStatLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  streakStatValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: { width: '48%', padding: 14, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  badgeIcon: { fontSize: 28, marginBottom: 6 },
  badgeName: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  badgeDesc: { fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 14 },
  badgeStatus: { fontSize: 10, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  challengeHeader: { flexDirection: 'row', alignItems: 'center' },
  challengeIcon: { fontSize: 20 },
  challengeTitle: { fontSize: 13, fontWeight: '700' },
  challengeDesc: { fontSize: 11, marginTop: 2, lineHeight: 14 },
  challengeBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  challengeBadgeText: { fontSize: 10, fontWeight: '800' },
  challengeFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  challengeProgress: { fontSize: 11, fontWeight: '700' },
  challengeXp: { fontSize: 12, fontWeight: '800' },
});
