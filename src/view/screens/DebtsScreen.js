import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2, Plus, Check, X } from 'lucide-react-native';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useDebts } from '../../viewmodel/DebtContext';
import { DEBT_TABS, DEBT_TYPES, DEBT_STATUS } from '../../model/DebtModel';
import { toNumber } from '../../utils/format';
import DebtFormModal from '../components/DebtFormModal';
import { useResponsive } from '../../utils/responsive';
import { useColors } from '../theme';

export default function DebtsScreen({ onClose }) {
  const { accentColor, devise, addTransaction } = useFinance();
  const { debts, deleteDebt, markReimbursed } = useDebts();
  const { contentMaxWidth, contentPadding, cardPadding, borderRadius } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding, cardPadding, borderRadius);
  const deviseSymbol = devise?.split(' ')[0] || 'F';

  const [activeTab, setActiveTab] = useState(DEBT_TYPES.CREDIT_ACCORDE);
  const [showForm, setShowForm] = useState(false);
  const [editDebt, setEditDebt] = useState(null);
  const [showReimburse, setShowReimburse] = useState(null);
  const [reimburseAmount, setReimburseAmount] = useState('');

  const colors = useColors();

  const filtered = useMemo(() =>
    debts.filter((d) => d.type === activeTab),
    [debts, activeTab]
  );

  const activeTotal = filtered
    .filter((d) => d.status !== DEBT_STATUS.REMBOURSEE)
    .reduce((s, d) => s + (toNumber(d.amount) - toNumber(d.amountReimbursed)), 0);

  const handleReimburseConfirm = () => {
    const amount = toNumber(reimburseAmount);
    const debt = showReimburse;
    if (amount <= 0) {
      Alert.alert('Montant invalide', 'Entrez un montant supérieur à 0.');
      return;
    }
    const remaining = toNumber(debt.amount) - toNumber(debt.amountReimbursed);
    if (amount > remaining) {
      Alert.alert('Montant trop élevé', `Il reste ${remaining}${deviseSymbol} à rembourser.`);
      return;
    }

    Alert.alert(
      'Créer une transaction ?',
      `Ajouter une transaction réelle de ${amount}${deviseSymbol} ?\n\nSi l'argent a déjà été échangé hors-appli, vous pouvez laisser "Non".`,
      [
        { text: 'Non, juste marquer', style: 'cancel', onPress: async () => {
          await markReimbursed(debt.id, amount);
          setShowReimburse(null);
          setReimburseAmount('');
        }},
        {
          text: 'Oui, créer la transaction',
          onPress: async () => {
            await markReimbursed(debt.id, amount);
            const isCreditRecu = debt.type === DEBT_TYPES.CREDIT_RECU;
            const label = isCreditRecu ? 'Remboursement donné' : 'Remboursement reçu';
            addTransaction({
              id: Date.now().toString(),
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
    Alert.alert(
      'Supprimer cette dette ?',
      `Cela ne peut pas être annulé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteDebt(d.id) },
      ]
    );
  };

  const statusColor = (s) => {
    if (s === DEBT_STATUS.REMBOURSEE) return colors.green;
    if (s === DEBT_STATUS.PARTIELLE) return colors.orange;
    return colors.text;
  };

  const statusLabel = (s) => {
    if (s === DEBT_STATUS.REMBOURSEE) return 'Remboursée';
    if (s === DEBT_STATUS.PARTIELLE) return 'Partielle';
    return 'En cours';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Dettes & Prêts</Text>
        <TouchableOpacity onPress={() => { setEditDebt(null); setShowForm(true); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Plus size={22} color={accentColor} />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {DEBT_TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, active && { borderBottomColor: accentColor, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabIcon]}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, { color: active ? accentColor : colors.subText }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.summaryBar, { backgroundColor: colors.card }]}>
        <Text style={[styles.summaryLabel, { color: colors.subText }]}>Reste à {activeTab === DEBT_TYPES.CREDIT_ACCORDE ? 'recevoir' : 'rembourser'}</Text>
        <Text style={[styles.summaryValue, { color: accentColor }]}>
          {activeTotal.toLocaleString()} {deviseSymbol}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>{activeTab === DEBT_TYPES.CREDIT_ACCORDE ? '💸' : '💳'}</Text>
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              Aucune dette dans cette catégorie.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { borderColor: accentColor }]}
              onPress={() => { setEditDebt(null); setShowForm(true); }}
            >
              <Text style={[styles.emptyBtnText, { color: accentColor }]}>Ajouter une dette</Text>
            </TouchableOpacity>
          </View>
        )}

        {filtered.map((d) => {
          const remaining = toNumber(d.amount) - toNumber(d.amountReimbursed);
          const isSettled = d.status === DEBT_STATUS.REMBOURSEE;
          return (
            <View
              key={d.id}
              style={[styles.debtCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: isSettled ? 0.5 : 1 }]}
            >
              <TouchableOpacity style={{ flex: 1 }} onPress={() => {
                if (!isSettled) { setEditDebt(d); setShowForm(true); }
              }}>
                <View style={styles.debtHeader}>
                  <Text style={[styles.personName, { color: colors.text }]}>{d.personName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(d.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor(d.status) }]}>{statusLabel(d.status)}</Text>
                  </View>
                </View>
                <Text style={[styles.debtAmount, { color: isSettled ? colors.subText : colors.text }]}>
                  {d.amount.toLocaleString()} {deviseSymbol}
                </Text>
                {d.amountReimbursed > 0 && (
                  <Text style={[styles.reimbursedText, { color: colors.subText }]}>
                    Remboursé : {d.amountReimbursed.toLocaleString()} {deviseSymbol} / Reste : {remaining.toLocaleString()} {deviseSymbol}
                  </Text>
                )}
                {d.dueDate && (
                  <Text style={[styles.dueDate, { color: colors.subText }]}>
                    Échéance : {new Date(d.dueDate).toLocaleDateString('fr-FR')}
                  </Text>
                )}
                {d.note ? <Text style={[styles.note, { color: colors.subText }]}>{d.note}</Text> : null}
              </TouchableOpacity>

              <View style={styles.debtActions}>
                {!isSettled && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.green + '20' }]}
                    onPress={() => { setShowReimburse(d); setReimburseAmount(''); }}
                  >
                    <Check size={16} color={colors.green} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.red + '20' }]}
                  onPress={() => handleDelete(d)}
                >
                  <Trash2 size={16} color={colors.red} />
                </TouchableOpacity>
              </View>
            </View>
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
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Marquer un remboursement</Text>
            <Text style={[styles.modalSub, { color: colors.subText }]}>
              Pour {showReimburse?.personName} — Reste : {toNumber(showReimburse?.amount) - toNumber(showReimburse?.amountReimbursed)} {deviseSymbol}
            </Text>
            <TextInput
              style={[styles.reimburseInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              value={reimburseAmount}
              onChangeText={setReimburseAmount}
              keyboardType="decimal-pad"
              placeholder="Montant remboursé"
              placeholderTextColor={colors.subText}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.input }]} onPress={() => setShowReimburse(null)}>
                <Text style={{ color: colors.subText, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: accentColor }]} onPress={handleReimburseConfirm}>
                <Text style={{ color: colors.accentFg, fontWeight: '600' }}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  tabRow: {
    flexDirection: 'row', borderBottomWidth: 1,
    maxWidth: cp, width: '100%', alignSelf: 'center',
  },
  tabBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  tabIcon: { fontSize: 16 },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  summaryBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: cpad, paddingVertical: 14, marginHorizontal: cpad, marginTop: 12,
    borderRadius: br,
  },
  summaryLabel: { fontSize: 13, fontWeight: '600' },
  summaryValue: { fontSize: 18, fontWeight: 'bold' },
  list: { paddingHorizontal: cpad, paddingBottom: 40, maxWidth: cp, width: '100%', alignSelf: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  emptyBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
  emptyBtnText: { fontSize: 13, fontWeight: '600' },
  debtCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 16, marginBottom: 10, borderWidth: 1,
  },
  debtHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  personName: { fontSize: 15, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  debtAmount: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  reimbursedText: { fontSize: 12, marginTop: 2 },
  dueDate: { fontSize: 12, marginTop: 2 },
  note: { fontSize: 11, fontStyle: 'italic', marginTop: 4 },
  debtActions: { gap: 8, marginLeft: 12 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '85%', maxWidth: 340, borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  modalSub: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  reimburseInput: {
    height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 16, fontWeight: '600',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});
