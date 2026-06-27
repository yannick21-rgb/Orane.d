import React, { useState, useRef, useEffect } from 'react';
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

const NETWORKS = [
  { key: 'MTN',     tKey: 'mtn_momo'     },
  { key: 'MOOV',    tKey: 'moov_money'   },
  { key: 'CELTIIS', tKey: 'celtiis_cash' },
];

const INCOME_FREQUENCIES = [
  { key: 'variable', tKey: 'non_fixe' },
  { key: 'weekly',   tKey: 'hebdo'    },
  { key: 'monthly',  tKey: 'mensuel'  },
];

const EXPENSE_CATEGORIES = [
  { key: 'Alimentation',       tKey: 'alimentation',       icon: '🛒'  },
  { key: 'Logement',           tKey: 'logement',           icon: '🏠'  },
  { key: 'Transport',          tKey: 'transport',          icon: '🚗'  },
  { key: 'Abonnements & Tech', tKey: 'abonnements_tech',   icon: '💳'  },
  { key: 'Sport',              tKey: 'sport',              icon: '🏋️‍♂️' },
  { key: 'Loisirs',            tKey: 'loisirs',            icon: '🎮'  },
  { key: 'Habillement',        tKey: 'habillement',        icon: '👗'  },
  { key: 'Santé',              tKey: 'sante',              icon: '💊'  },
  { key: 'Épargne',            tKey: 'epargne',            icon: '🏦'  },
  { key: 'Remboursement',      tKey: 'remboursement',      icon: '💸'  },
  { key: 'Frais & Retraits',   tKey: 'frais_retraits_cat', icon: '🪙'  },
];

const INCOME_CATEGORIES = [
  { key: 'Salaire / Coaching', tKey: 'salaire_coaching', icon: '💼' },
  { key: 'Freelance / Dev',    tKey: 'freelance_dev',    icon: '💻' },
  { key: 'Projets Web',        tKey: 'projets_web',      icon: '📈' },
  { key: 'Cadeau',             tKey: 'cadeau',           icon: '🎁' },
  { key: 'Emprunt',            tKey: 'emprunt',          icon: '🤝' },
  { key: 'Ventes',             tKey: 'ventes',           icon: '🛍️' },
];

export default function AddTransactionScreen({ navigation }) {
  const { t } = useTranslation();
  const { isDark, accentColor, addTransaction, devise } = useFinance();
  const deviseSymbol = devise?.split(' ')[0] || 'F';

  const [title,    setTitle]    = useState('');
  const [amount,   setAmount]   = useState('');
  const [note,     setNote]     = useState('');
  const [type,     setType]     = useState('expense');
  const [category, setCategory] = useState('Alimentation');

  const [wallet, setWallet] = useState('momo');
  const [transferFee, setTransferFee] = useState('');
  const [selectedNetwork,  setSelectedNetwork]  = useState('MTN');
  const [incomeFrequency,  setIncomeFrequency]  = useState('monthly');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const navTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  const colors = {
    bg:      isDark ? '#0f1015' : '#f5f6fa',
    card:    isDark ? '#16171f' : '#ffffff',
    text:    isDark ? '#ffffff' : '#131419',
    subText: isDark ? '#8c8e9b' : '#6a6c7a',
    input:   isDark ? '#222431' : '#eef0f5',
    modalBg: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)',
  };

  const currentCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert(t('champ_requis'), t('veuillez_titre'));
      return;
    }
    const parsed = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert(t('montant_invalide'), t('veuillez_montant'));
      return;
    }

    let finalAmount   = parsed;
    let computedFee   = 0;
    let customNote    = note.trim();
    let finalCategory = category;

    if (type === 'transfert') {
      const feeParsed = parseFloat(transferFee.replace(',', '.')) || 0;
      computedFee   = feeParsed;
      finalAmount   = parsed + computedFee;
      const netLabel = NETWORKS.find(n => n.key === selectedNetwork);
      const netName = netLabel ? t(netLabel.tKey) : selectedNetwork;
      const details = `Retrait ${netName} : -${computedFee}${deviseSymbol} → +${parsed}${deviseSymbol} en espèces`;
      customNote    = customNote ? `${customNote} | ${details}` : details;
      finalCategory = 'Retrait MoMo';
    }

    addTransaction({
      id:              Date.now().toString(),
      title:           title.trim(),
      amount:          finalAmount,
      type,
      wallet,
      category:        finalCategory,
      note:            customNote || null,
      date:            new Date().toISOString(),
      momoNetwork:     type === 'transfert' ? selectedNetwork : null,
      momoFee:         computedFee > 0 ? computedFee : null,
      frais:           computedFee,
      amountReceived:  type === 'transfert' ? parsed : null,
      incomeFrequency: type === 'revenu' || type === 'income' ? incomeFrequency : null,
    });

    setShowSuccessModal(true);

    setTitle('');
    setAmount('');
    setNote('');
    setWallet('momo');
    setTransferFee('');
    setIncomeFrequency('monthly');
    setCategory(type === 'expense' || type === 'transfert' ? 'Alimentation' : 'Salaire / Coaching');

    navTimeoutRef.current = setTimeout(() => {
      setShowSuccessModal(false);
      navigation.goBack();
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
        <Text style={[styles.pageTitle, { color: colors.text }]}>{t('nouvelle_operation')}</Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.subText }]}>{t('type_operation')}</Text>
          <View style={[styles.toggle, { backgroundColor: colors.input }]}>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'expense' && { backgroundColor: '#ff5c5c' }]}
              onPress={() => { setType('expense'); setWallet('momo'); setTransferFee(''); setCategory('Alimentation'); }}
            >
              <Text style={[styles.toggleText, { color: type === 'expense' ? '#fff' : colors.subText }, type === 'expense' && { fontWeight: '700' }]}>
                {t('depense')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'income' && { backgroundColor: '#2ecc71' }]}
              onPress={() => { setType('income'); setTransferFee(''); setCategory('Salaire / Coaching'); }}
            >
              <Text style={[styles.toggleText, { color: type === 'income' ? '#fff' : colors.subText }, type === 'income' && { fontWeight: '700' }]}>
                {t('revenu')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'transfert' && { backgroundColor: '#f59e0b' }]}
              onPress={() => { setType('transfert'); setWallet('momo'); setTransferFee(''); setCategory('Retrait MoMo'); }}
            >
              <Text style={[styles.toggleText, { color: type === 'transfert' ? '#fff' : colors.subText }, type === 'transfert' && { fontWeight: '700' }]}>
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
              <Text style={[styles.toggleText, { color: wallet === 'momo' ? '#fff' : colors.subText }, wallet === 'momo' && { fontWeight: '700' }]}>
                {'📱 MoMo'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, wallet === 'cash' && { backgroundColor: accentColor }]}
              onPress={() => setWallet('cash')}
            >
              <Text style={[styles.toggleText, { color: wallet === 'cash' ? '#fff' : colors.subText }, wallet === 'cash' && { fontWeight: '700' }]}>
                {'💵 Espèces'}
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
                    <Text style={[styles.frequencyChipLabel, { color: active ? '#fff' : colors.text }, active && { fontWeight: '700' }]}>
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
              <View style={{ backgroundColor: '#f59e0b', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>↻ TRANSFERT</Text>
              </View>
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
                      <Text style={[styles.networkChipLabel, { color: active ? '#fff' : colors.text }, active && { fontWeight: '700' }]}>
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
              <Text style={[styles.label, { color: colors.subText, marginTop: 20 }]}>
                Frais de retrait MoMo <Text style={[styles.optionalBadge, { color: colors.subText }]}>(optionnel)</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
                value={transferFee}
                onChangeText={setTransferFee}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.subText}
                returnKeyType="done"
              />
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
                    <Text style={[styles.chipLabel, { color: active ? '#fff' : colors.text }, active && { fontWeight: '700' }]}>
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
          <Text style={styles.saveBtnText}>{t('enregistrer_operation')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  scroll:        { paddingHorizontal: 20 },
  pageTitle:     { fontSize: 32, fontWeight: 'bold', marginTop: 20, marginBottom: 20 },
  card:          { padding: 22, borderRadius: 28, marginBottom: 16 },
  label:         { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  optionalBadge: { fontSize: 10, fontWeight: '400', letterSpacing: 0 },
  toggle:        { flexDirection: 'row', borderRadius: 16, padding: 4, gap: 4 },
  toggleBtn:     { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  toggleText:    { fontSize: 15, fontWeight: '600' },
  input:         { padding: 16, borderRadius: 16, fontSize: 16, fontWeight: '500' },
  noteInput:     { height: 72, paddingTop: 14 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14 },
  chipIcon:      { fontSize: 14 },
  chipLabel:     { fontSize: 13, fontWeight: '600' },
  saveBtn:       { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  saveBtnText:   { color: '#fff', fontSize: 16, fontWeight: '700' },

  switchRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  networkGrid:        { flexDirection: 'row', gap: 6 },
  networkChip:        { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  networkChipLabel:   { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  frequencyGrid:      { flexDirection: 'row', gap: 6 },
  frequencyChip:      { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  frequencyChipLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  modalOverlay:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContent:     { padding: 30, borderRadius: 24, alignItems: 'center', justifyContent: 'center', width: 160, height: 160, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 10 },
  successCircle:    { width: 60, height: 60, borderRadius: 30, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  successCheckmark: { fontSize: 28, fontWeight: 'bold' },
  modalText:        { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});
