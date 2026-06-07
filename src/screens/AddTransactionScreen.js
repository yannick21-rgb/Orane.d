import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Switch,
  Modal, // 👈 Ajouté pour la fenêtre de validation
} from 'react-native';
import { useFinance } from '../context/FinanceContext';

// 🚀 Configuration des réseaux disponibles au Bénin
const NETWORKS = [
  { key: 'MTN',     label: 'MTN MoMo' },
  { key: 'MOOV',    label: 'Moov Money' },
  { key: 'CELTIIS', label: 'Celtiis Cash' },
];

// 📊 Configuration des fréquences de revenus
const INCOME_FREQUENCIES = [
  { key: 'variable',  label: 'Non fixe' },
  { key: 'weekly',    label: 'Hebdo' },
  { key: 'monthly',   label: 'Mensuel' },
];

// 📊 🔻 Catégories exclusives aux DÉPENSES
const EXPENSE_CATEGORIES = [
  { label: 'Alimentation',       icon: '🛒' },
  { label: 'Logement',           icon: '🏠' },
  { label: 'Transport',          icon: '🚗' },
  { label: 'Abonnements & Tech', icon: '💳' },
  { label: 'Sport',              icon: '🏋️‍♂️' },
  { label: 'Loisirs',            icon: '🎮' },
  { label: 'Habillement',        icon: '👗' },
  { label: 'Santé',              icon: '💊' },
  { label: 'Épargne',            icon: '🏦' },
  { label: 'Remboursement',      icon: '💸' },
  { label: 'Frais & Retraits',   icon: '🪙' },
];

// 📊 🔺 Catégories exclusives aux REVENUS
const INCOME_CATEGORIES = [
  { label: 'Salaire / Coaching', icon: '💼' },
  { label: 'Freelance / Dev',    icon: '💻' },
  { label: 'Projets Web',        icon: '📈' },
  { label: 'Cadeau',             icon: '🎁' },
  { label: 'Emprunt',            icon: '🤝' },
  { label: 'Ventes',             icon: '🛍️' },
];

export default function AddTransactionScreen({ navigation }) {
  const { isDark, accentColor, addTransaction } = useFinance();

  const [title,    setTitle]    = useState('');
  const [amount,   setAmount]   = useState('');
  const [note,     setNote]     = useState('');       
  const [type,     setType]     = useState('expense');
  const [category, setCategory] = useState('Alimentation');

  // 🚀 États pour la gestion du Mobile Money
  const [isMoMoWithdrawal, setIsMoMoWithdrawal] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('MTN');

  // 📊 État pour la fréquence des revenus
  const [incomeFrequency, setIncomeFrequency] = useState('monthly');

  // ✨ État pour contrôler l'affichage de la fenêtre "Validé"
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const colors = {
    bg:      isDark ? '#0f1015' : '#f5f6fa',
    card:    isDark ? '#16171f' : '#ffffff',
    text:    isDark ? '#ffffff' : '#131419',
    subText: isDark ? '#8c8e9b' : '#6a6c7a',
    input:   isDark ? '#222431' : '#eef0f5',
    modalBg: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)',
  };

  const currentCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const calculateWithdrawalFees = (numAmount) => {
    if (numAmount <= 0) return 0;
    if (selectedNetwork === 'MOOV') {
      if (numAmount >= 100 && numAmount <= 500) return 50;
      if (numAmount >= 501 && numAmount <= 5000) return 125;
      if (numAmount >= 5001 && numAmount <= 10000) return 225;
      if (numAmount >= 10001 && numAmount <= 20000) return 375;
      if (numAmount >= 20001 && numAmount <= 50000) return 700;
      if (numAmount >= 50010 && numAmount <= 100000) return 1000;
      if (numAmount >= 100001 && numAmount <= 200000) return 2000;
      if (numAmount >= 200001 && numAmount <= 300000) return 3000;
      if (numAmount >= 300001 && numAmount <= 500000) return 3500;
      if (numAmount >= 500001 && numAmount <= 1000000) return 5000;
      return 0;
    }
    if (selectedNetwork === 'MTN') {
      if (numAmount >= 1 && numAmount <= 5000) return 125;
      if (numAmount >= 501 && numAmount <= 5000) return 125;
      if (numAmount >= 5001 && numAmount <= 10000) return 225;
      if (numAmount >= 10001 && numAmount <= 20000) return 375;
      if (numAmount >= 20001 && numAmount <= 50000) return 700;
      if (numAmount >= 50010 && numAmount <= 100000) return 1000;
      if (numAmount >= 100001 && numAmount <= 200000) return 2000;
      if (numAmount >= 200001) return 2000; 
      return 0;
    }
    if (selectedNetwork === 'CELTIIS') {
      if (numAmount >= 100 && numAmount <= 500) return 25;
      if (numAmount >= 501 && numAmount <= 5000) return 75;
      if (numAmount >= 5001 && numAmount <= 10000) return 150;
      if (numAmount >= 10001 && numAmount <= 20000) return 250;
      if (numAmount >= 20001 && numAmount <= 50000) return 500;
      if (numAmount >= 50010 && numAmount <= 75000) return 750;
      if (numAmount >= 75001 && numAmount <= 100000) return 1000;
      if (numAmount >= 100001 && numAmount <= 200000) return 2000;
      if (numAmount >= 200001 && numAmount <= 300000) return 3000;
      if (numAmount >= 300001 && numAmount <= 500000) return 4000;
      if (numAmount >= 500001 && numAmount <= 2000000) return 5000;
      return 0;
    }
    return 0; 
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir un titre.');
      return;
    }
    const parsed = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Montant invalide', 'Veuillez saisir un montant supérieur à 0.');
      return;
    }

    let finalAmount = parsed;
    let computedFee = 0;
    let customNote = note.trim();

    if (type === 'expense' && isMoMoWithdrawal) {
      computedFee = calculateWithdrawalFees(parsed);
      finalAmount = parsed + computedFee;
      const feeDetails = `(Frais de retrait ${selectedNetwork} : +${computedFee} F)`;
      customNote = customNote ? `${customNote} ${feeDetails}` : feeDetails;
    }

    let finalCategory = category;
    if (type === 'income') {
      if (category === 'Remboursement') finalCategory = 'Emprunt';
    } else {
      if (isMoMoWithdrawal) {
        finalCategory = 'Retrait MoMo';
      } else if (category === 'Emprunt') {
        finalCategory = 'Remboursement';
      }
    }

    // 1️⃣ Enregistrement de la transaction
    addTransaction({
      id:       Date.now().toString(),
      title:    title.trim(),
      amount:   finalAmount,
      type,
      category: finalCategory,
      note:     customNote || null,
      date:     new Date().toISOString(),
      momoNetwork: type === 'expense' && isMoMoWithdrawal ? selectedNetwork : null,
      momoFee:     computedFee > 0 ? computedFee : null,
      incomeFrequency: type === 'income' ? incomeFrequency : null,
    });

    // 2️⃣ Déclenchement de la fenêtre de succès
    setShowSuccessModal(true);

    // 3️⃣ Nettoyage des champs du formulaire
    setTitle('');
    setAmount('');
    setNote('');
    setIsMoMoWithdrawal(false);
    setIncomeFrequency('monthly');
    setCategory(type === 'expense' ? 'Alimentation' : 'Salaire / Coaching');

    // 4️⃣ Fermeture automatique après 1.5 seconde et retour à l'écran précédent
    setTimeout(() => {
      setShowSuccessModal(false);
      navigation.goBack();
    }, 1500);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      
      {/* ── ✨ FENÊTRE MODALE DE VALIDATION ────────────────────────── */}
      <Modal
        transparent={true}
        visible={showSuccessModal}
        animationType="fade"
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.successCircle, { borderColor: accentColor }]}>
              <Text style={[styles.successCheckmark, { color: accentColor }]}>✓</Text>
            </View>
            <Text style={[styles.modalText, { color: colors.text }]}>Validé</Text>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.pageTitle, { color: colors.text }]}>Nouvelle Opération</Text>

        {/* ── Sélecteur Type ─────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.subText }]}>TYPE D'OPÉRATION</Text>
          <View style={[styles.toggle, { backgroundColor: colors.input }]}>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'expense' && { backgroundColor: '#ff5c5c' }]}
              onPress={() => {
                setType('expense');
                setCategory('Alimentation');
              }}
            >
              <Text style={[styles.toggleText, { color: type === 'expense' ? '#fff' : colors.subText }, type === 'expense' && { fontWeight: '700' }]}>
                ▼ Dépense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'income' && { backgroundColor: '#2ecc71' }]}
              onPress={() => {
                setType('income');
                setIsMoMoWithdrawal(false);
                setCategory('Salaire / Coaching');
              }}
            >
              <Text style={[styles.toggleText, { color: type === 'income' ? '#fff' : colors.subText }, type === 'income' && { fontWeight: '700' }]}>
                ▲ Revenu
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 📊 Option Fréquence du Revenu ── */}
        {type === 'income' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.subText }]}>RÉGULARITÉ DU REVENU</Text>
            <View style={styles.frequencyGrid}>
              {INCOME_FREQUENCIES.map((freq) => {
                const isSelected = incomeFrequency === freq.key;
                return (
                  <TouchableOpacity
                    key={freq.key}
                    style={[styles.frequencyChip, { backgroundColor: colors.input }, isSelected && { backgroundColor: accentColor }]}
                    onPress={() => setIncomeFrequency(freq.key)}
                  >
                    <Text style={[styles.frequencyChipLabel, { color: isSelected ? '#fff' : colors.text }, isSelected && { fontWeight: '700' }]}>
                      {freq.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── 🚀 Option Mobile Money ── */}
        {type === 'expense' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.switchRow}>
              <View>
                <Text style={[styles.label, { color: colors.subText, marginBottom: 4 }]}>RETRAIT MOBILE MONEY</Text>
                <Text style={{ fontSize: 12, color: colors.subText }}>Calculer et inclure les frais réseau</Text>
              </View>
              <Switch
                value={isMoMoWithdrawal}
                onValueChange={setIsMoMoWithdrawal}
                trackColor={{ false: colors.input, true: accentColor }}
                thumbColor={'#fff'}
              />
            </View>

            {isMoMoWithdrawal && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.label, { color: colors.subText }]}>CHOIX DU RÉSEAU (BÉNIN)</Text>
                <View style={styles.networkGrid}>
                  {NETWORKS.map((net) => {
                    const isSelected = selectedNetwork === net.key;
                    return (
                      <TouchableOpacity
                        key={net.key}
                        style={[styles.networkChip, { backgroundColor: colors.input }, isSelected && { backgroundColor: accentColor }]}
                        onPress={() => setSelectedNetwork(net.key)}
                      >
                        <Text style={[styles.networkChipLabel, { color: isSelected ? '#fff' : colors.text }, isSelected && { fontWeight: '700' }]}>
                          {net.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Titre · Montant · Note ──────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.subText }]}>TITRE</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex : Courses, Loyer, Virement..."
            placeholderTextColor={colors.subText}
            returnKeyType="next"
          />

          <Text style={[styles.label, { color: colors.subText, marginTop: 20 }]}>MONTANT (FCFA)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.subText}
            returnKeyType="next"
          />

          <Text style={[styles.label, { color: colors.subText, marginTop: 20 }]}>
            NOTE <Text style={[styles.optionalBadge, { color: colors.subText }]}>(optionnel)</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.noteInput, { backgroundColor: colors.input, color: colors.text }]}
            value={note}
            onChangeText={setNote}
            placeholder="Ex : Courses semaine, Facture..."
            placeholderTextColor={colors.subText}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>

        {/* ── Grille Catégories Dynamiques ─────────────────────────────── */}
        {(!isMoMoWithdrawal || type === 'income') && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.subText }]}>CATÉGORIE</Text>
            <View style={styles.grid}>
              {currentCategories.map((cat) => {
                const isSelected = category === cat.label;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    style={[styles.chip, { backgroundColor: colors.input }, isSelected && { backgroundColor: accentColor }]}
                    onPress={() => setCategory(cat.label)}
                  >
                    <Text style={styles.chipIcon}>{cat.icon}</Text>
                    <Text style={[styles.chipLabel, { color: isSelected ? '#fff' : colors.text }, isSelected && { fontWeight: '700' }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Bouton Enregistrer ──────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: accentColor }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>Enregistrer l'opération</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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

  switchRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  networkGrid:      { flexDirection: 'row', gap: 6 },
  networkChip:      { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  networkChipLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  frequencyGrid:      { flexDirection: 'row', gap: 6 },
  frequencyChip:      { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  frequencyChipLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  // ✨ Nouveaux styles pour la fenêtre Pop-up de validation
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  successCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successCheckmark: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  modalText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});