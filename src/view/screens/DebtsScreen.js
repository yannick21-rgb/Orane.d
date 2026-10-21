/**
 * Dettes & Prêts premium.
 *
 * LOGIQUE INCHANGÉE : onglets par type, totaux, remboursement (avec ou
 * sans écriture de transaction), suppression, formulaire. Nouveau rendu :
 * onglets animés traduits, avatars à initiales, jauge de remboursement,
 * pastille d'échéance (J-n, alerte si proche ou dépassée), swipe gauche
 * pour rembourser / swipe droit pour supprimer, fiche détail avec
 * timeline. Les libellés FR codés en dur ont été externalisés en Phase 6.
 */
import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { Trash2, Plus, Check, X, Handshake } from 'lucide-react-native';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useDebts } from '../../viewmodel/DebtContext';
import { DEBT_TYPES, DEBT_STATUS } from '../../model/DebtModel';
import { toNumber } from '../../utils/format';
import { generateId } from '../../utils/id';
import DebtFormModal from '../components/DebtFormModal';
import DebtDetailScreen, { dueInfo } from './DebtDetailScreen';
import { useResponsive } from '../../utils/responsive';
import { useTranslation } from '../../utils/LanguageManager';
import { useColors } from '../theme';
import { typography } from '../theme/typography';
import { radius } from '../theme/tokens';
import {
  AmountText, Avatar, Badge, Button, EmptyState, Input,
  ProgressBar, SegmentedControl,
} from '../components/ui';

export default function DebtsScreen({ onClose }) {
  const { accentColor, devise, addTransaction, isDiscreteMode } = useFinance();
  const { debts, deleteDebt, markReimbursed } = useDebts();
  const { contentMaxWidth, contentPadding } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding);
  const deviseSymbol = devise?.split(' ')[0] || 'F';
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState(DEBT_TYPES.CREDIT_ACCORDE);
  const [showForm, setShowForm] = useState(false);
  const [editDebt, setEditDebt] = useState(null);
  const [showReimburse, setShowReimburse] = useState(null);
  const [reimburseAmount, setReimburseAmount] = useState('');
  const [detailDebt, setDetailDebt] = useState(null);
  const swipeRefs = useRef({});

  const colors = useColors();

  const tabs = [
    { value: DEBT_TYPES.CREDIT_ACCORDE, label: t('a_recevoir') },
    { value: DEBT_TYPES.CREDIT_RECU, label: t('a_rembourser') },
  ];

  const filtered = useMemo(
    () => debts.filter((d) => d.type === activeTab),
    [debts, activeTab]
  );

  const activeTotal = filtered
    .filter((d) => d.status !== DEBT_STATUS.REMBOURSEE)
    .reduce((s, d) => s + (toNumber(d.amount) - toNumber(d.amountReimbursed)), 0);

  const closeSwipe = (id) => swipeRefs.current[id]?.close?.();

  const openReimburse = (debt) => {
    closeSwipe(debt.id);
    setDetailDebt(null);
    setShowReimburse(debt);
    setReimburseAmount('');
  };

  const handleReimburseConfirm = () => {
    const amount = toNumber(reimburseAmount);
    const debt = showReimburse;
    if (amount <= 0) {
      Alert.alert(t('montant_invalide'), t('veuillez_montant'));
      return;
    }
    const remaining = toNumber(debt.amount) - toNumber(debt.amountReimbursed);
    if (amount > remaining) {
      Alert.alert(
        t('montant_invalide'),
        `${t('reste_rembourser')} ${remaining.toLocaleString('fr-FR')}${deviseSymbol}`
      );
      return;
    }

    Alert.alert(
      t('creer_transaction'),
      t('ajouter_transaction_reelle').replace('{x}', `${amount.toLocaleString('fr-FR')}${deviseSymbol}`),
      [
        {
          text: t('non_juste_marquer'),
          style: 'cancel',
          onPress: async () => {
            await markReimbursed(debt.id, amount);
            setShowReimburse(null);
            setReimburseAmount('');
          },
        },
        {
          text: t('oui_creer_transaction'),
          onPress: async () => {
            await markReimbursed(debt.id, amount);
            const isCreditRecu = debt.type === DEBT_TYPES.CREDIT_RECU;
            const label = isCreditRecu ? 'Remboursement donné' : 'Remboursement reçu';
            addTransaction({
              id: generateId(),
              title: `${label} — ${debt.personName}`,
              amount,
              type: isCreditRecu ? 'expense' : 'income',
              wallet: 'cash',
              category: isCreditRecu ? 'Remboursement' : 'Emprunt',
              note: `Remboursement partiel lié à la dette ${debt.personName}`,
              date: new Date().toISOString(),
            });
            setShowReimburse(null);
            setReimburseAmount('');
          },
        },
      ]
    );
  };

  const handleDelete = (d) => {
    closeSwipe(d.id);
    Alert.alert(
      t('supprimer'),
      `"${d.personName}" ?\n${t('action_irreversible')}`,
      [
        { text: t('annuler'), style: 'cancel' },
        { text: t('supprimer'), style: 'destructive', onPress: () => deleteDebt(d.id) },
      ]
    );
  };

  const statusBadge = (d) => {
    if (d.status === DEBT_STATUS.REMBOURSEE) return { label: t('statut_remboursee'), tone: 'income' };
    if (d.status === DEBT_STATUS.PARTIELLE) return { label: t('statut_partielle'), tone: 'warning' };
    return { label: t('statut_en_cours'), tone: 'neutral' };
  };

  if (detailDebt) {
    const live = debts.find((d) => d.id === detailDebt.id) || detailDebt;
    return (
      <DebtDetailScreen
        debt={live}
        deviseSymbol={deviseSymbol}
        onClose={() => setDetailDebt(null)}
        onReimburse={openReimburse}
        onEdit={(d) => { setDetailDebt(null); setEditDebt(d); setShowForm(true); }}
        onDelete={(d) => { setDetailDebt(null); handleDelete(d); }}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.rule }]}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={t('annuler')}>
          <X size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={[typography.title, { color: colors.ink }]}>{t('dettes_titre')}</Text>
        <TouchableOpacity
          onPress={() => { setEditDebt(null); setShowForm(true); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('ajouter_dette')}
        >
          <Plus size={22} color={accentColor} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <SegmentedControl
          options={tabs}
          value={activeTab}
          onChange={(v) => setActiveTab(v)}
          accessibilityLabel={t('dettes_titre')}
        />
      </View>

      <View style={[styles.summaryBar, { backgroundColor: colors.card }]}>
        <Text style={[typography.caption, { color: colors.inkMid }]}>
          {activeTab === DEBT_TYPES.CREDIT_ACCORDE ? t('a_recevoir') : t('a_rembourser')}
        </Text>
        <AmountText value={activeTotal} size="amount" currency={deviseSymbol} masked={isDiscreteMode} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <EmptyState
            illustration={
              <View style={[styles.emptyCircle, { backgroundColor: colors.accentSoft }]}>
                <Handshake color={colors.accent} size={30} />
              </View>
            }
            title={t('aucune_dette')}
            actionLabel={t('ajouter_dette')}
            onAction={() => { setEditDebt(null); setShowForm(true); }}
          />
        )}

        {filtered.map((d) => {
          const remaining = toNumber(d.amount) - toNumber(d.amountReimbursed);
          const isSettled = d.status === DEBT_STATUS.REMBOURSEE;
          const badge = statusBadge(d);
          const due = dueInfo(d);
          return (
            <Swipeable
              key={d.id}
              ref={(ref) => { if (ref) swipeRefs.current[d.id] = ref; }}
              overshootLeft={false}
              overshootRight={false}
              onSwipeableOpen={(dir) => {
                if (dir === 'left' && !isSettled) openReimburse(d);
                if (dir === 'right') handleDelete(d);
              }}
              renderRightActions={() => !isSettled ? (
                <TouchableOpacity
                  style={[styles.swipeAction, { backgroundColor: colors.income }]}
                  onPress={() => openReimburse(d)}
                  accessibilityRole="button"
                  accessibilityLabel={t('marquer_remboursement')}
                >
                  <Check size={20} color="#ffffff" />
                </TouchableOpacity>
              ) : null}
              renderLeftActions={() => (
                <TouchableOpacity
                  style={[styles.swipeAction, { backgroundColor: colors.danger }]}
                  onPress={() => handleDelete(d)}
                  accessibilityRole="button"
                  accessibilityLabel={t('supprimer')}
                >
                  <Trash2 size={20} color="#ffffff" />
                </TouchableOpacity>
              )}
            >
              <TouchableOpacity
                style={[styles.debtCard, { backgroundColor: colors.card, opacity: isSettled ? 0.55 : 1 }]}
                onPress={() => setDetailDebt(d)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={d.personName}
              >
                <Avatar name={d.personName} size={44} />
                <View style={styles.debtMain}>
                  <View style={styles.debtHead}>
                    <Text style={[typography.bodyStrong, { color: colors.ink }]} numberOfLines={1}>
                      {d.personName}
                    </Text>
                    <Badge label={badge.label} tone={badge.tone} />
                  </View>
                  <AmountText value={d.amount} size="amount" tone={isSettled ? 'faint' : 'ink'} currency={deviseSymbol} masked={isDiscreteMode} />
                  {toNumber(d.amountReimbursed) > 0 && !isSettled && (
                    <ProgressBar
                      value={toNumber(d.amountReimbursed)}
                      max={Math.max(toNumber(d.amount), 1)}
                      color={colors.warning}
                      height={4}
                      style={styles.gauge}
                    />
                  )}
                  <View style={styles.debtMeta}>
                    {toNumber(d.amountReimbursed) > 0 && !isSettled && (
                      <Text style={[typography.caption, { color: colors.inkMid }]} numberOfLines={1}>
                        {t('reste_a_rembourser')} : {isDiscreteMode ? '••••' : `${remaining.toLocaleString('fr-FR')} ${deviseSymbol}`}
                      </Text>
                    )}
                    {due && !isSettled && (
                      <Badge
                        label={due.days < 0
                          ? `${t('en_retard')} J+${-due.days}`
                          : `J-${due.days}`}
                        tone={due.days < 0 ? 'expense' : due.days <= 7 ? 'warning' : 'neutral'}
                      />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Swipeable>
          );
        })}
      </ScrollView>

      <DebtFormModal
        visible={showForm}
        initialData={editDebt}
        onClose={() => { setShowForm(false); setEditDebt(null); }}
        defaultType={activeTab}
      />

      <Modal visible={!!showReimburse} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[typography.subtitle, { color: colors.ink }]}>{t('marquer_remboursement')}</Text>
            <Text style={[typography.body, styles.modalSub, { color: colors.inkMid }]}>
              {showReimburse?.personName} · {t('reste')} : {isDiscreteMode ? '••••' : `${(toNumber(showReimburse?.amount) - toNumber(showReimburse?.amountReimbursed)).toLocaleString('fr-FR')} ${deviseSymbol}`}
            </Text>
            <Input
              value={reimburseAmount}
              onChangeText={setReimburseAmount}
              keyboardType="decimal-pad"
              numeric
              placeholder={t('montant_rembourse')}
              accessibilityLabel={t('montant_rembourse')}
            />
            <View style={styles.modalActions}>
              <Button label={t('annuler')} variant="secondary" flex onPress={() => setShowReimburse(null)} />
              <Button label={t('confirmer')} flex onPress={handleReimburseConfirm} />
            </View>
          </View>
        </View>
      </Modal>
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
  tabs: { paddingHorizontal: cpad, paddingTop: 14, maxWidth: cp, width: '100%', alignSelf: 'center' },
  summaryBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: cpad, paddingVertical: 14, marginHorizontal: cpad, marginTop: 12,
    borderRadius: radius.md,
  },
  list: { paddingHorizontal: cpad, paddingTop: 12, paddingBottom: 40, maxWidth: cp, width: '100%', alignSelf: 'center' },
  emptyCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  debtCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: radius.md, marginBottom: 10,
  },
  debtMain: { flex: 1, minWidth: 0, gap: 4 },
  debtHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gauge: { marginTop: 6 },
  debtMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 },
  swipeAction: { width: 72, borderRadius: radius.md, marginBottom: 10, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '85%', maxWidth: 340, borderRadius: 20, padding: 20, gap: 4 },
  modalSub: { marginTop: 4, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
