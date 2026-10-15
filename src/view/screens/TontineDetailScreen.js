/**
 * Détail tontine premium.
 *
 * LOGIQUE INCHANGÉE : marquer payé / reçu (avec les mêmes Alertes et les
 * mêmes écritures de transactions). Nouveau rendu : carte héro en dégradé
 * avec compte à rebours, frise horizontale des tours (tour en cours cerclé
 * d'or), timeline des versements avec pastilles de statut, avatars à
 * initiales, swipe vers la gauche pour marquer payé.
 */
import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import { Check, ChevronLeft } from 'lucide-react-native';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useTontines } from '../../viewmodel/TontineContext';
import { ROUND_STATUS, computeTontineSummary } from '../../model/TontineModel';
import { useResponsive } from '../../utils/responsive';
import { useTranslation } from '../../utils/LanguageManager';
import { useColors } from '../theme';
import { typography } from '../theme/typography';
import { radius } from '../theme/tokens';
import { shadows } from '../theme/shadows';
import { AmountText, Avatar, Badge } from '../components/ui';
import { nextRoundInfo } from '../../model/TontineModel';
import { generateId } from '../../utils/id';

export default function TontineDetailScreen({ group, onClose }) {
  const { accentColor, devise, addTransaction, isDiscreteMode } = useFinance();
  const { markRoundPaid, markRoundReceived } = useTontines();
  const { t, currentLanguage } = useTranslation();
  const { contentMaxWidth, contentPadding } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding);
  const deviseSymbol = devise?.split(' ')[0] || 'F';
  const colors = useColors();
  const swipeRefs = useRef({});
  const locale = currentLanguage === 'en' ? 'en-US' : currentLanguage === 'es' ? 'es-ES' : 'fr-FR';

  const summary = computeTontineSummary(group);
  const info = nextRoundInfo(group);
  const sortedRounds = [...(Array.isArray(group.rounds) ? group.rounds : [])].sort(
    (a, b) => a.roundNumber - b.roundNumber
  );

  const closeSwipe = (n) => swipeRefs.current[n]?.close?.();

  const handleMarkPaid = (round) => {
    closeSwipe(round.roundNumber);
    Alert.alert(
      t('marquer_paiement_tour'),
      `${group.amountPerTour.toLocaleString('fr-FR')} ${deviseSymbol} ?`,
      [
        { text: t('non'), onPress: async () => { await markRoundPaid(group.id, round.roundNumber); } },
        {
          text: t('oui_creer_depense'),
          onPress: async () => {
            await markRoundPaid(group.id, round.roundNumber);
            addTransaction({
              id: generateId(),
              title: `Cotisation tontine — ${group.groupName} (tour ${round.roundNumber})`,
              amount: group.amountPerTour,
              type: 'expense',
              wallet: 'cash',
              category: 'Épargne',
              note: `Tontine ${group.groupName} — tour ${round.roundNumber}/${group.totalParticipants}`,
              date: new Date().toISOString(),
            });
          },
        },
      ]
    );
  };

  const handleMarkReceived = (round) => {
    closeSwipe(round.roundNumber);
    Alert.alert(
      t('marquer_recu_tour'),
      `${(group.amountPerTour * group.totalParticipants).toLocaleString('fr-FR')} ${deviseSymbol} ?`,
      [
        { text: t('non'), style: 'cancel', onPress: () => markRoundReceived(group.id, round.roundNumber) },
        {
          text: 'MoMo',
          onPress: async () => {
            await markRoundReceived(group.id, round.roundNumber);
            addTransaction({
              id: generateId(),
              title: `Réception tontine — ${group.groupName}`,
              amount: group.amountPerTour * group.totalParticipants,
              type: 'income',
              wallet: 'momo',
              category: 'Épargne',
              note: `Tour de tontine ${group.groupName} — tour ${round.roundNumber}/${group.totalParticipants}`,
              date: new Date().toISOString(),
            });
          },
        },
        {
          text: t('pocket_especes'),
          onPress: async () => {
            await markRoundReceived(group.id, round.roundNumber);
            addTransaction({
              id: generateId(),
              title: `Réception tontine — ${group.groupName}`,
              amount: group.amountPerTour * group.totalParticipants,
              type: 'income',
              wallet: 'cash',
              category: 'Épargne',
              note: `Tour de tontine ${group.groupName} — tour ${round.roundNumber}/${group.totalParticipants}`,
              date: new Date().toISOString(),
            });
          },
        },
      ]
    );
  };

  const actOn = (round) => {
    if (round.status !== ROUND_STATUS.A_PAYER) return;
    if (round.isMyTurnToReceive) handleMarkReceived(round);
    else handleMarkPaid(round);
  };

  const roundTone = (round) => {
    if (round.status === ROUND_STATUS.PAYE) return 'income';
    if (round.status === ROUND_STATUS.RECU) return 'warning';
    if (new Date(round.dueDate) < new Date()) return 'expense';
    return 'neutral';
  };

  const roundLabel = (round) => {
    if (round.status === ROUND_STATUS.PAYE) return t('paye');
    if (round.status === ROUND_STATUS.RECU) return t('recu');
    if (new Date(round.dueDate) < new Date()) return t('en_retard');
    return t('a_payer');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.rule }]}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={t('annuler')}>
          <ChevronLeft size={22} color={colors.ink} />
        </TouchableOpacity>
        <Avatar name={group.groupName} size={32} />
        <Text style={[typography.title, styles.headerTitle, { color: colors.ink }]} numberOfLines={1}>
          {group.groupName}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* Héro : le prochain tour */}
        <LinearGradient
          colors={colors.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, shadows.raised]}
        >
          {info ? (
            <>
              <Text style={[typography.micro, { color: 'rgba(255,247,232,0.72)' }]}>
                {info.days < 0 ? t('en_retard') : t('prochain_tour')} · {t('tour')} {info.round.roundNumber}
              </Text>
              <Text style={[styles.countdown, { color: '#FFF7E8' }]}>
                {info.days < 0 ? `J+${-info.days}` : `J-${info.days}`}
              </Text>
              <Text style={[typography.caption, { color: 'rgba(255,247,232,0.72)' }]}>
                {new Date(info.round.dueDate).toLocaleDateString(locale)} · {Number(group.amountPerTour).toLocaleString('fr-FR')} {deviseSymbol}
              </Text>
            </>
          ) : (
            <>
              <Text style={[typography.micro, { color: 'rgba(255,247,232,0.72)' }]}>{t('recu')}</Text>
              <AmountText value={summary.totalReceived} size="figure" currency={deviseSymbol} masked={isDiscreteMode} />
            </>
          )}
        </LinearGradient>

        {/* Résumé chiffré */}
        <View style={styles.summaryRow}>
          {[
            { label: t('cotise'), value: summary.totalPaid, tone: 'ink' },
            { label: t('recu'), value: summary.totalReceived, tone: 'income' },
            {
              label: t('total_a_recevoir'),
              value: summary.hasReceived ? 0 : summary.totalToReceiveAtMyTurn,
              tone: summary.hasReceived ? 'faint' : 'transfer',
            },
          ].map((s) => (
            <View key={s.label} style={[styles.summaryBadge, { backgroundColor: colors.card }]}>
              <Text style={[typography.micro, { color: colors.inkMid }]} numberOfLines={1}>{s.label}</Text>
              <AmountText value={s.value} size="amountSm" tone={s.tone} currency={deviseSymbol} masked={isDiscreteMode} />
            </View>
          ))}
        </View>

        {/* Frise des tours */}
        <Text style={[typography.caption, styles.sectionLabel, { color: colors.inkMid }]}>
          {t('tour')}s · {t('position')} {group.myPosition}/{group.totalParticipants}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.frise}>
          {sortedRounds.map((r) => {
            const past = new Date(r.dueDate) < new Date();
            const ring = r.status === ROUND_STATUS.PAYE ? colors.income
              : r.status === ROUND_STATUS.RECU ? colors.warning
              : r.status === ROUND_STATUS.A_PAYER && past ? colors.expense
              : colors.ruleStrong;
            return (
              <View
                key={r.roundNumber}
                accessible
                accessibilityLabel={`${t('tour')} ${r.roundNumber} : ${roundLabel(r)}`}
                style={[
                  styles.tourDot,
                  { borderColor: ring, backgroundColor: r.isMyTurnToReceive ? colors.goldSoft : colors.card },
                  r.isMyTurnToReceive && { borderColor: colors.gold, borderWidth: 2.5 },
                ]}
              >
                <Text style={[typography.bodyStrong, { color: r.isMyTurnToReceive ? colors.gold : colors.ink }]}>
                  {r.roundNumber}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Timeline des versements */}
        <Text style={[typography.caption, styles.sectionLabel, { color: colors.inkMid }]}>
          {t('historique')}
        </Text>
        {sortedRounds.map((round) => {
          const actionable = round.status === ROUND_STATUS.A_PAYER;
          return (
            <Swipeable
              key={round.roundNumber}
              ref={(ref) => { if (ref) swipeRefs.current[round.roundNumber] = ref; }}
              enabled={actionable}
              overshootRight={false}
              onSwipeableOpen={() => actOn(round)}
              renderRightActions={() => (
                <TouchableOpacity
                  style={[styles.swipePay, { backgroundColor: colors.income }]}
                  onPress={() => actOn(round)}
                  accessibilityRole="button"
                  accessibilityLabel={t('paye')}
                >
                  <Check size={20} color="#ffffff" />
                </TouchableOpacity>
              )}
            >
              <View style={[styles.roundCard, { backgroundColor: colors.card }]}>
                <View style={[styles.rail, { backgroundColor: colors[roundTone(round)] || colors.inkFaint }]} />
                <View style={styles.roundMain}>
                  <Text style={[typography.bodyStrong, { color: colors.ink }]}>
                    {t('tour')} {round.roundNumber}
                    {round.isMyTurnToReceive && (
                      <Text style={{ color: colors.gold }}> · {t('mon_tour')}</Text>
                    )}
                  </Text>
                  <Text style={[typography.caption, { color: colors.inkMid }]}>
                    {new Date(round.dueDate).toLocaleDateString(locale)}
                  </Text>
                </View>
                <View style={styles.roundRight}>
                  <AmountText
                    value={round.isMyTurnToReceive
                      ? group.amountPerTour * group.totalParticipants
                      : group.amountPerTour}
                    size="amountSm"
                    currency={deviseSymbol}
                    masked={isDiscreteMode}
                  />
                  <Badge label={roundLabel(round)} tone={roundTone(round)} />
                </View>
                {actionable && (
                  <TouchableOpacity
                    style={[styles.payBtn, { backgroundColor: `${colors.income}22` }]}
                    onPress={() => actOn(round)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('paye')}
                  >
                    <Check size={16} color={colors.income} />
                  </TouchableOpacity>
                )}
              </View>
            </Swipeable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (cp, cpad) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: cpad, paddingVertical: 14, borderBottomWidth: 1,
    maxWidth: cp, width: '100%', alignSelf: 'center',
  },
  headerTitle: { flex: 1, minWidth: 0 },
  list: { paddingHorizontal: cpad, paddingTop: 14, paddingBottom: 40, maxWidth: cp, width: '100%', alignSelf: 'center' },
  hero: { borderRadius: 20, padding: 20, marginBottom: 14 },
  countdown: { fontSize: 44, fontWeight: '700', letterSpacing: -1 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  summaryBadge: { flex: 1, minWidth: 0, padding: 12, borderRadius: radius.md, alignItems: 'center', gap: 4 },
  sectionLabel: { marginTop: 16, marginBottom: 10 },
  frise: { gap: 10, paddingRight: 8 },
  tourDot: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  roundCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: radius.md, marginBottom: 8,
  },
  rail: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  roundMain: { flex: 1, minWidth: 0 },
  roundRight: { alignItems: 'flex-end', gap: 4 },
  payBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  swipePay: { width: 72, borderRadius: radius.md, marginBottom: 8, alignItems: 'center', justifyContent: 'center' },
});
