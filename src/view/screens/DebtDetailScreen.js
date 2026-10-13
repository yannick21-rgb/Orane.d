/**
 * Fiche détail d'une dette : synthèse, jauge de remboursement et
 * historique des versements en timeline.
 *
 * Limite honnête : le modèle ne stocke pas les versements un par un
 * (seul le cumul `amountReimbursed`), donc la timeline montre la création,
 * le cumul remboursé et le reste — sans inventer de faux paiements.
 * Les actions (rembourser, modifier, supprimer) remontent au parent qui
 * détient la logique existante.
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check } from 'lucide-react-native';
import { toNumber } from '../../utils/format';
import { DEBT_STATUS } from '../../model/DebtModel';
import { useTranslation } from '../../utils/LanguageManager';
import { useColors } from '../theme';
import { typography } from '../theme/typography';
import { radius } from '../theme/tokens';
import { AmountText, Avatar, Badge, Button, ProgressBar } from '../components/ui';

const STEP_TONE = { ink: 'ink', income: 'income', expense: 'expense' };

export function dueInfo(debt) {
  if (!debt.dueDate) return null;
  // Comparaison par jour calendaire : la différence brute donnait 0 (voire -0)
  // pour une échéance dépassée de moins de 24 h, affichée « J-0 » au lieu de
  // « en retard ».
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(debt.dueDate);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  return { days };
}

export default function DebtDetailScreen({ debt, deviseSymbol, onClose, onReimburse, onEdit, onDelete }) {
  const { t, currentLanguage } = useTranslation();
  const colors = useColors();
  const locale = currentLanguage === 'en' ? 'en-US' : currentLanguage === 'es' ? 'es-ES' : 'fr-FR';

  const total = toNumber(debt.amount);
  const paid = toNumber(debt.amountReimbursed);
  const remaining = Math.max(total - paid, 0);
  const settled = debt.status === DEBT_STATUS.REMBOURSEE;
  const due = dueInfo(debt);

  const steps = [
    {
      key: 'created',
      label: t('creation'),
      date: debt.dateCreated ? new Date(debt.dateCreated).toLocaleDateString(locale) : '',
      value: total,
      tone: 'ink',
    },
  ];
  if (paid > 0) {
    steps.push({
      key: 'paid',
      label: `${t('versement')} · ${t('statut_partielle').toLowerCase()}`,
      date: '',
      value: paid,
      tone: 'income',
    });
  }
  steps.push({
    key: 'left',
    label: settled ? t('statut_remboursee') : t('reste'),
    date: '',
    value: remaining,
    tone: settled ? 'faint' : 'expense',
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.rule }]}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={t('annuler')}>
          <ChevronLeft size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={[typography.title, styles.headerTitle, { color: colors.ink }]} numberOfLines={1}>
          {debt.personName}
        </Text>
        <Badge
          label={settled ? t('statut_remboursee') : paid > 0 ? t('statut_partielle') : t('statut_en_cours')}
          tone={settled ? 'income' : paid > 0 ? 'warning' : 'neutral'}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.card }]}>
          <Avatar name={debt.personName} size={56} />
          <AmountText value={remaining} size="figure" tone={settled ? 'faint' : 'expense'} currency={deviseSymbol} />
          <Text style={[typography.caption, { color: colors.inkMid }]}>
            {paid.toLocaleString('fr-FR')} / {total.toLocaleString('fr-FR')} {deviseSymbol}
          </Text>
          <ProgressBar
            value={paid}
            max={Math.max(total, 1)}
            color={settled ? colors.income : colors.warning}
            style={styles.gauge}
            accessibilityLabel={t('reste')}
          />
          {due && !settled && (
            <Badge
              label={due.days < 0
                ? `${t('en_retard')} J+${-due.days}`
                : `J-${due.days} · ${new Date(debt.dueDate).toLocaleDateString(locale)}`}
              tone={due.days < 0 ? 'expense' : due.days <= 7 ? 'warning' : 'neutral'}
            />
          )}
        </View>

        {debt.note ? (
          <Text style={[typography.body, styles.note, { color: colors.inkMid }]}>{debt.note}</Text>
        ) : null}

        <Text style={[typography.caption, styles.sectionLabel, { color: colors.inkMid }]}>
          {t('historique')}
        </Text>
        {steps.map((s, i) => (
          <View key={s.key} style={styles.step}>
            <View style={styles.railCol}>
              <View style={[styles.railDot, { backgroundColor: colors[STEP_TONE[s.tone]] || colors.inkFaint }]} />
              {i < steps.length - 1 && <View style={[styles.railLine, { backgroundColor: colors.rule }]} />}
            </View>
            <View style={[styles.stepCard, { backgroundColor: colors.card }]}>
              <View style={styles.stepHead}>
                <Text style={[typography.bodyStrong, { color: colors.ink }]}>{s.label}</Text>
                {s.date ? <Text style={[typography.caption, { color: colors.inkFaint }]}>{s.date}</Text> : null}
              </View>
              <AmountText value={s.value} size="amountSm" tone={s.tone} currency={deviseSymbol} />
            </View>
          </View>
        ))}

        {!settled && (
          <Button
            label={t('marquer_remboursement')}
            size="lg"
            fullWidth
            icon={<Check size={18} color={colors.accentFg} />}
            onPress={() => onReimburse(debt)}
            style={styles.action}
          />
        )}
        <View style={styles.rowBtns}>
          <Button label={t('mettre_a_jour')} variant="secondary" flex onPress={() => onEdit(debt)} />
          <Button label={t('supprimer')} variant="danger" flex onPress={() => onDelete(debt)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, minWidth: 0 },
  list: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 },
  hero: { borderRadius: radius.md, padding: 20, alignItems: 'center', gap: 6 },
  gauge: { width: '100%', marginTop: 8, marginBottom: 8 },
  note: { marginTop: 14, fontStyle: 'italic' },
  sectionLabel: { marginTop: 18, marginBottom: 10 },
  step: { flexDirection: 'row', gap: 10 },
  railCol: { alignItems: 'center', width: 14 },
  railDot: { width: 10, height: 10, borderRadius: 5, marginTop: 16 },
  railLine: { width: 2, flex: 1, minHeight: 20 },
  stepCard: {
    flex: 1, borderRadius: radius.sm, padding: 12, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  stepHead: { flex: 1, minWidth: 0, gap: 2 },
  action: { marginTop: 18 },
  rowBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
