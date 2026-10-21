import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useTranslation } from '../../utils/LanguageManager';
import { toNumber } from '../../utils/format';
import { NETWORKS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, INCOME_FREQUENCIES, computeTransferFee } from '../../model/TransactionModel';
import { useResponsive } from '../../utils/responsive';
import { buildColors } from '../theme';
import { type as typeStyles } from '../theme/type';

export default function AddTransactionScreen({ onClose }) {
  const { t } = useTranslation();
  const { isDark, accentColor, updateTransaction, addTransaction, deleteTransaction, transactions, editingTransaction, devise } = useFinance();
  const { contentMaxWidth, contentPadding, cardPadding, borderRadius } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding, cardPadding, borderRadius);
  const deviseSymbol = devise?.split(' ')[0] || 'F';

  const isEditing = !!editingTransaction;

  const [title,    setTitle]    = useState('');
  const [amount,   setAmount]   = useState('');
  const [note,     setNote]     = useState('');
  const [type,     setType]     = useState('expense');
  const [category, setCategory] = useState('Alimentation');

  const [wallet, setWallet] = useState('momo');
  const [selectedNetwork,  setSelectedNetwork]  = useState('MTN');
  const [incomeFrequency,  setIncomeFrequency]  = useState('monthly');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const navTimeoutRef = useRef(null);

  useEffect(() => {
    if (editingTransaction) {
      setTitle(editingTransaction.title || '');
      setAmount(String(editingTransaction.amount || ''));
      setNote(editingTransaction.note || '');
      setType(editingTransaction.type || 'expense');
      setCategory(editingTransaction.category || 'Alimentation');
      setWallet(editingTransaction.wallet || 'momo');
      setSelectedNetwork(editingTransaction.momoNetwork || 'MTN');
      setIncomeFrequency(editingTransaction.incomeFrequency || 'monthly');
    }
  }, [editingTransaction]);

  useEffect(() => {
    return () => {
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  // Ecart conservé : les champs de saisie de cet écran prennent la teinte
  // `track` alors que les autres écrans utilisent `inputBg`.
  const colors = useMemo(() => {
    const base = buildColors(isDark, accentColor);
    return { ...base, input: base.track };
  }, [isDark, accentColor]);

  const currentCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const autoFee = useMemo(() => {
    if (type !== 'transfert') return 0;
    const parsed = toNumber(amount);
    if (parsed <= 0) return 0;
    return computeTransferFee(parsed, selectedNetwork);
  }, [amount, selectedNetwork, type]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert(t('champ_requis'), t('veuillez_titre'));
      return;
    }
    const parsed = toNumber(amount);
    if (parsed <= 0) {
      Alert.alert(t('montant_invalide'), t('veuillez_montant'));
      return;
    }

    let finalAmount   = parsed;
    let computedFee   = 0;
    let customNote    = note.trim();
    let finalCategory = category;

    if (type === 'transfert') {
      computedFee   = autoFee;
      finalAmount   = parsed;
      const netLabel = NETWORKS.find(n => n.key === selectedNetwork);
      const netName = netLabel ? t(netLabel.tKey) : selectedNetwork;
      const details = `Retrait ${netName} : -${computedFee}${deviseSymbol} de frais → +${parsed}${deviseSymbol} en espèces`;
      customNote    = customNote ? `${customNote} | ${details}` : details;
      finalCategory = 'Retrait MoMo';
    }

    // Écran d'édition uniquement : App.js ne le monte que via
    // `editingTransaction`. La branche de création qui vivait ici était morte
    // (la création passe par `TransactionSheet`). On garde la garde
    // `isEditing` : si l'écran était un jour monté sans transaction, on ne
    // tente pas de lire `editingTransaction.id`.
    if (isEditing) {
      const isTransfert = type === 'transfert';
      updateTransaction(editingTransaction.id, {
        title:           title.trim(),
        amount:          finalAmount,
        type,
        wallet:          isTransfert ? 'momo' : wallet,
        category:        finalCategory,
        note:            customNote || null,
        momoNetwork:     isTransfert ? selectedNetwork : null,
        // BUG corrigé : `amountReceived` n'était jamais mis à jour. Les soldes
        // wallet (FinanceContext) priorisent `amountReceived` sur `amount` —
        // éditer un retrait de 10 000 → 50 000 laissait les soldes MoMo/Cash
        // calculés sur l'ancien montant.
        amountReceived:  isTransfert ? finalAmount : null,
        incomeFrequency: type === 'revenu' || type === 'income' ? incomeFrequency : null,
      });

      // Transaction sœur `${id}_fee` créée par TransactionSheet : elle doit
      // suivre l'édition (nouveau montant / réseau) ou disparaître (type
      // changé, frais recalculés à 0) — sinon les dépenses restent gonflées
      // à l'ancien taux de frais.
      const feeTxId = `${editingTransaction.id}_fee`;
      const feeTx = (transactions || []).find((x) => x && x.id === feeTxId);
      if (isTransfert && computedFee > 0) {
        const netLabel = NETWORKS.find((n) => n.key === selectedNetwork);
        const netName = netLabel ? t(netLabel.tKey) : selectedNetwork;
        const feeFields = {
          title:   `Frais retrait ${title.trim()}`,
          amount:  computedFee,
          type:    'expense',
          wallet:  'momo',
          category: 'Frais & Retraits',
          momoNetwork: selectedNetwork,
          note:    `Frais automatiques ${netName} : ${computedFee}${deviseSymbol}`,
        };
        if (feeTx) {
          updateTransaction(feeTxId, feeFields);
        } else {
          addTransaction({
            id: feeTxId,
            ...feeFields,
            date: editingTransaction.date || new Date().toISOString(),
          });
        }
      } else if (feeTx) {
        deleteTransaction(feeTxId);
      }
    }

    setShowSuccessModal(true);

    setTitle('');
    setAmount('');
    setNote('');
    setWallet('momo');
    setIncomeFrequency('monthly');
    setCategory(type === 'expense' || type === 'transfert' ? 'Alimentation' : 'Salaire / Coaching');

    navTimeoutRef.current = setTimeout(() => {
      setShowSuccessModal(false);
      onClose();
    }, 1500);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>

      <Modal transparent visible={showSuccessModal} animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.successCircle, { borderColor: accentColor }]}>
              <Text style={[styles.successCheckmark, { color: accentColor }]}>✓</Text>
            </View>
            <Text style={[styles.modalText, { color: colors.text }]}>{t('valide')}</Text>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.pageTitle, { color: colors.text }]}>{isEditing ? 'Modifier' : t('nouvelle_operation')}</Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.subText }]}>{t('type_operation')}</Text>
          <View style={[styles.toggle, { backgroundColor: colors.input }]}>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'expense' && { backgroundColor: colors.expense }]}
              onPress={() => { setType('expense'); setWallet('momo'); setCategory('Alimentation'); }}
            >
              <Text style={[styles.toggleText, { color: type === 'expense' ? colors.expenseFg : colors.subText }, type === 'expense' && { fontWeight: '700' }]}>
                {t('depense')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'income' && { backgroundColor: colors.income }]}
              onPress={() => { setType('income'); setCategory('Salaire / Coaching'); }}
            >
              <Text style={[styles.toggleText, { color: type === 'income' ? colors.incomeFg : colors.subText }, type === 'income' && { fontWeight: '700' }]}>
                {t('revenu')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'transfert' && { backgroundColor: colors.transfer }]}
              onPress={() => { setType('transfert'); setWallet('momo'); setCategory('Retrait MoMo'); }}
            >
              <Text style={[styles.toggleText, { color: type === 'transfert' ? colors.transferFg : colors.subText }, type === 'transfert' && { fontWeight: '700' }]}>
                💸 Transfert
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* === SÉLECTEUR PORTEFEUILLE === */}
        {type !== 'transfert' && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.subText }]}>Compte à utiliser</Text>
          <View style={[styles.toggle, { backgroundColor: colors.input }]}>
            <TouchableOpacity
              style={[styles.toggleBtn, wallet === 'momo' && { backgroundColor: accentColor }]}
              onPress={() => setWallet('momo')}
            >
              <Text style={[styles.toggleText, { color: wallet === 'momo' ? colors.accentFg : colors.subText }, wallet === 'momo' && { fontWeight: '700' }]}>
                {'📱 MoMo'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, wallet === 'cash' && { backgroundColor: accentColor }]}
              onPress={() => setWallet('cash')}
            >
              <Text style={[styles.toggleText, { color: wallet === 'cash' ? colors.accentFg : colors.subText }, wallet === 'cash' && { fontWeight: '700' }]}>
                {'💵 Espèces'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, wallet === 'banque' && { backgroundColor: accentColor }]}
              onPress={() => setWallet('banque')}
            >
              <Text style={[styles.toggleText, { color: wallet === 'banque' ? colors.accentFg : colors.subText }, wallet === 'banque' && { fontWeight: '700' }]}>
                {'🏦 Banque'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        )}

        {type === 'income' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.subText }]}>{t('regularite_revenu')}</Text>
            <View style={styles.frequencyGrid}>
              {INCOME_FREQUENCIES.map((freq) => {
                const active = incomeFrequency === freq.key;
                return (
                  <TouchableOpacity
                    key={freq.key}
                    style={[styles.frequencyChip, { backgroundColor: colors.input }, active && { backgroundColor: accentColor }]}
                    onPress={() => setIncomeFrequency(freq.key)}
                  >
                    <Text style={[styles.frequencyChipLabel, { color: active ? colors.accentFg : colors.text }, active && { fontWeight: '700' }]}>
                      {t(freq.tKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {type === 'transfert' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.switchRow}>
              {/* Repère de section, pas une badge : le transfert se signale par
                  son encre, en casse normale. Un aplat plein avec du blanc en
                  dur dessus raterait la lecture en mode clair. */}
              <Text style={[typeStyles.label, { color: colors.transfer }]}>
                {t('type_transfert')}
              </Text>
            </View>

            <View style={{ marginTop: 16 }}>
              <Text style={[styles.label, { color: colors.subText }]}>{t('choix_reseau')}</Text>
              <View style={styles.networkGrid}>
                {NETWORKS.map((net) => {
                  const active = selectedNetwork === net.key;
                  return (
                    <TouchableOpacity
                      key={net.key}
                      style={[styles.networkChip, { backgroundColor: colors.input }, active && { backgroundColor: accentColor }]}
                      onPress={() => setSelectedNetwork(net.key)}
                    >
                      <Text style={[styles.networkChipLabel, { color: active ? colors.accentFg : colors.text }, active && { fontWeight: '700' }]}>
                        {t(net.tKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.subText }]}>
            {type === 'transfert' ? 'Libellé du retrait' : t('titre')}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder={type === 'transfert' ? 'Retrait MoMo' : t('placeholder_titre')}
            placeholderTextColor={colors.subText}
            returnKeyType="next"
          />

          <Text style={[styles.label, { color: colors.subText, marginTop: 20 }]}>
            {type === 'transfert' ? 'Montant du retrait' : t('montant')}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.subText}
            returnKeyType="next"
          />

          {type === 'transfert' ? (
            <>
              {toNumber(amount) > 0 && (
                <View style={{ marginTop: 20, padding: 14, backgroundColor: colors.transfer + '18', borderRadius: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[styles.label, { color: colors.subText, marginTop: 0, marginBottom: 0 }]}>
                      {t('frais_auto')} ({t(NETWORKS.find(n => n.key === selectedNetwork)?.tKey || selectedNetwork)})
                    </Text>
                    <Text style={[typeStyles.amount, { color: colors.transfer }]}>
                      -{autoFee} {deviseSymbol}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[typeStyles.micro, { color: colors.subText }]}>{t('recu_en_especes')}</Text>
                    <Text style={[typeStyles.amount, { color: colors.income }]}>
                      +{toNumber(amount)} {deviseSymbol}
                    </Text>
                  </View>
                  <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: colors.subText }}>Débité MoMo</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                      -{toNumber(amount) + autoFee} {deviseSymbol}
                    </Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.subText, marginTop: 20 }]}>
                {t('note')} <Text style={[styles.optionalBadge, { color: colors.subText }]}>(optionnel)</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.noteInput, { backgroundColor: colors.input, color: colors.text }]}
                value={note}
                onChangeText={setNote}
                placeholder={t('placeholder_note')}
                placeholderTextColor={colors.subText}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </>
          )}
        </View>

        {type !== 'transfert' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.subText }]}>{t('categorie')}</Text>
            <View style={styles.grid}>
              {currentCategories.map((cat) => {
                const active = category === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.chip, { backgroundColor: colors.input }, active && { backgroundColor: accentColor }]}
                    onPress={() => setCategory(cat.key)}
                  >
                    <Text style={styles.chipIcon}>{cat.icon}</Text>
                    <Text style={[styles.chipLabel, { color: active ? colors.accentFg : colors.text }, active && { fontWeight: '700' }]}>
                      {t(cat.tKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: accentColor }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={[styles.saveBtnText, { color: colors.accentFg }]}>
            {isEditing ? t('mettre_a_jour') : t('enregistrer_operation')}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (cp, cpad, cardP, br) => StyleSheet.create({
  container:     { flex: 1 },
  scroll:        { paddingHorizontal: cpad, maxWidth: cp, width: '100%', alignSelf: 'center' },
  pageTitle:     { fontSize: 24, fontWeight: 'bold', marginTop: 20, marginBottom: 20 },
  card:          { padding: cardP, borderRadius: br, marginBottom: 16 },
  label:         { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  optionalBadge: { fontSize: 11, fontWeight: '400', letterSpacing: 0 },
  toggle:        { flexDirection: 'row', borderRadius: 16, padding: 4, gap: 4 },
  toggleBtn:     { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  toggleText:    { fontSize: 15, fontWeight: '600', lineHeight: 22, includeFontPadding: false },
  input:         { padding: 16, borderRadius: 16, fontSize: 16, fontWeight: '500', lineHeight: 22, includeFontPadding: false },
  noteInput:     { height: 72, paddingTop: 14 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14 },
  chipIcon:      { fontSize: 14 },
  chipLabel:     { fontSize: 13, fontWeight: '600', lineHeight: 18, includeFontPadding: false },
  saveBtn:       { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  saveBtnText:   { fontSize: 16, fontWeight: '700', lineHeight: 22, includeFontPadding: false },

  switchRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  networkGrid:        { flexDirection: 'row', gap: 6 },
  networkChip:        { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  networkChipLabel:   { fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 16, includeFontPadding: false },
  frequencyGrid:      { flexDirection: 'row', gap: 6 },
  frequencyChip:      { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  frequencyChipLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 18, includeFontPadding: false },

  modalOverlay:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalContent:     { padding: 30, borderRadius: 24, alignItems: 'center', justifyContent: 'center', width: 160, height: 160, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 10 },
  successCircle:    { width: 60, height: 60, borderRadius: 30, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  successCheckmark: { fontSize: 24, fontWeight: 'bold' },
  modalText:        { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});
