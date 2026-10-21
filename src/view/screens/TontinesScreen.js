/**
 * Tontines — liste premium.
 *
 * LOGIQUE INCHANGÉE : groupes, suppression (avec confirmation),
 * formulaire, navigation détail. Nouveau rendu : avatar à initiale,
 * frise de pastilles des tours (tour en cours cerclé d'or, payé vert,
 * en retard rouge), compte à rebours J-n, barre de progression, statuts
 * en pastilles. Textes via LanguageManager (les libellés FR codés en
 * dur ont été externalisés en Phase 6).
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, Trash2, ChevronRight, Users } from 'lucide-react-native';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useTontines } from '../../viewmodel/TontineContext';
import { ROUND_STATUS, computeTontineSummary, nextRoundInfo } from '../../model/TontineModel';
import TontineFormModal from '../components/TontineFormModal';
import TontineDetailScreen from './TontineDetailScreen';
import { useResponsive } from '../../utils/responsive';
import { useTranslation } from '../../utils/LanguageManager';
import { useColors } from '../theme';
import { typography } from '../theme/typography';
import { radius } from '../theme/tokens';
import { AmountText, Avatar, Badge, EmptyState, ProgressBar } from '../components/ui';

export default function TontinesScreen({ onClose }) {
  const { accentColor, devise, isDiscreteMode } = useFinance();
  const { groups, deleteGroup, overallSummary } = useTontines();
  const { t } = useTranslation();
  const { contentMaxWidth, contentPadding } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding);
  const deviseSymbol = devise?.split(' ')[0] || 'F';

  const [showForm, setShowForm] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [detailGroup, setDetailGroup] = useState(null);

  const colors = useColors();

  const handleDelete = (g) => {
    Alert.alert(
      t('supprimer'),
      `"${g.groupName}" ?`,
      [
        { text: t('annuler'), style: 'cancel' },
        { text: t('supprimer'), style: 'destructive', onPress: () => deleteGroup(g.id) },
      ]
    );
  };

  if (detailGroup) {
    // Rafraîchit depuis les groupes (le détail recevait une photo figée).
    const live = groups.find((g) => g.id === detailGroup.id) || detailGroup;
    return (
      <TontineDetailScreen
        group={live}
        onClose={() => setDetailGroup(null)}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.rule }]}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={t('annuler')}>
          <X size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={[typography.title, { color: colors.ink }]}>{t('tontines_titre')}</Text>
        <TouchableOpacity
          onPress={() => { setEditGroup(null); setShowForm(true); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('creer_tontine')}
        >
          <Plus size={22} color={accentColor} />
        </TouchableOpacity>
      </View>

      {groups.length > 0 && (
        <View style={[styles.summaryBar, { backgroundColor: colors.card }]}>
          <View style={styles.summaryItem}>
            <Text style={[typography.micro, { color: colors.inkMid }]}>{t('total_cotise')}</Text>
            <AmountText value={overallSummary.totalPaid} size="amount" currency={deviseSymbol} masked={isDiscreteMode} />
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.rule }]} />
          <View style={styles.summaryItem}>
            <Text style={[typography.micro, { color: colors.inkMid }]}>{t('a_recevoir')}</Text>
            <AmountText value={overallSummary.totalToReceive} size="amount" tone="income" currency={deviseSymbol} masked={isDiscreteMode} />
          </View>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {groups.length === 0 && (
          <EmptyState
            illustration={
              <View style={[styles.emptyCircle, { backgroundColor: colors.accentSoft }]}>
                <Users color={colors.accent} size={30} />
              </View>
            }
            title={t('aucune_tontine')}
            actionLabel={t('creer_tontine')}
            onAction={() => { setEditGroup(null); setShowForm(true); }}
          />
        )}

        {groups.map((g) => {
          const summary = computeTontineSummary(g);
          const rounds = Array.isArray(g.rounds) ? g.rounds : [];
          const done = rounds.filter((r) => r.status !== ROUND_STATUS.A_PAYER).length;
          const total = rounds.length;
          const info = nextRoundInfo(g);
          const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
          return (
            <TouchableOpacity
              key={g.id}
              style={[styles.groupCard, { backgroundColor: colors.card }]}
              onPress={() => setDetailGroup(g)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={g.groupName}
            >
              <View style={styles.groupHeader}>
                <Avatar name={g.groupName} size={44} />
                <View style={styles.groupTitle}>
                  <Text style={[typography.bodyStrong, { color: colors.ink }]} numberOfLines={1}>
                    {g.groupName}
                  </Text>
                  <Text style={[typography.caption, { color: colors.inkMid }]} numberOfLines={1}>
                    {isDiscreteMode ? '••••' : `${Number(g.amountPerTour).toLocaleString('fr-FR')} ${deviseSymbol}`} × {g.totalParticipants} {t('tour').toLowerCase()}s · {g.frequency === 'hebdomadaire' ? t('freq_hebdo') : t('freq_mensuel')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(g)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('supprimer')}
                >
                  <Trash2 size={16} color={colors.inkFaint} />
                </TouchableOpacity>
              </View>

              <View style={styles.dots} accessibilityLabel={`${done}/${total}`}>
                {sorted.map((r) => {
                  const past = new Date(r.dueDate) < new Date();
                  const bg = r.status === ROUND_STATUS.PAYE ? colors.income
                    : r.status === ROUND_STATUS.RECU ? colors.warning
                    : r.status === ROUND_STATUS.A_PAYER && past ? colors.expense
                    : colors.dot;
                  return (
                    <View
                      key={r.roundNumber}
                      style={[
                        styles.dot,
                        { backgroundColor: bg },
                        r.isMyTurnToReceive && { borderColor: colors.gold, borderWidth: 2 },
                      ]}
                    />
                  );
                })}
              </View>

              <View style={styles.progressRow}>
                <ProgressBar value={done} max={Math.max(total, 1)} color={done >= total ? colors.income : accentColor} style={styles.progress} />
                <Text style={[typography.caption, { color: colors.inkMid }]}>{done}/{total}</Text>
              </View>

              <View style={styles.groupFooter}>
                {info ? (
                  <Badge
                    label={info.days < 0 ? `${t('en_retard')} J+${-info.days}` : `J-${info.days}`}
                    tone={info.days < 0 ? 'expense' : info.days <= 7 ? 'warning' : 'neutral'}
                  />
                ) : (
                  <Badge label={summary.hasReceived ? t('recu') : t('paye')} tone="income" />
                )}
                {!summary.hasReceived && (
                  <Text style={[typography.caption, { color: colors.inkMid }]} numberOfLines={1}>
                    {t('position')} : {g.myPosition}/{g.totalParticipants}
                  </Text>
                )}
                <ChevronRight size={16} color={colors.inkFaint} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TontineFormModal
        visible={showForm}
        initialData={editGroup}
        onClose={() => { setShowForm(false); setEditGroup(null); }}
      />
    </SafeAreaView>
  );
}

const createStyles = (cp, cpad) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: cpad, paddingVertical: 16, borderBottomWidth: 1,
    maxWidth: cp, width: '100%', alignSelf: 'center',
  },
  summaryBar: {
    flexDirection: 'row', marginHorizontal: cpad, marginTop: 12,
    padding: 16, borderRadius: radius.md, marginBottom: 4,
    maxWidth: cp, width: '100%', alignSelf: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryDivider: { width: 1, marginHorizontal: 16 },
  list: { paddingHorizontal: cpad, paddingTop: 12, paddingBottom: 40, maxWidth: cp, width: '100%', alignSelf: 'center' },
  emptyCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  groupCard: { padding: 16, borderRadius: radius.md, marginBottom: 12 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  groupTitle: { flex: 1, minWidth: 0 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 12 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  progress: { flex: 1 },
  groupFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
