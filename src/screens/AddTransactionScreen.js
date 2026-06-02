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
} from 'react-native';
import { useFinance } from '../context/FinanceContext';

const RECURRENCES = [
  { key: 'none',    label: 'Unique / Non fixe' },
  { key: 'weekly',  label: 'Hebdomadaire' },
  { key: 'monthly', label: 'Mensuel' },
];

// 🚀 Configuration des réseaux disponibles
const NETWORKS = [
  { key: 'MTN',     label: 'MTN MoMo' },
  { key: 'MOOV',    label: 'Moov Money' },
  { key: 'CELTIIS', label: 'Celtiis Cash' },
];

export default function AddTransactionScreen({ navigation }) {
  const { isDark, accentColor, addTransaction } = useFinance();

  const [title,    setTitle]    = useState('');
  const [amount,   setAmount]   = useState('');
  const [note,     setNote]     = useState('');       
  const [type,     setType]     = useState('expense');
  
  const [recurrence, setRecurrence] = useState('none');

  // 🚀 Nouveaux états pour la gestion du Mobile Money
  const [isMoMoWithdrawal, setIsMoMoWithdrawal] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('MTN');

  const colors = {
    bg:      isDark ? '#0f1015' : '#f5f6fa',
    card:    isDark ? '#16171f' : '#ffffff',
    text:    isDark ? '#ffffff' : '#131419',
    subText: isDark ? '#8c8e9b' : '#6a6c7a',
    input:   isDark ? '#222431' : '#eef0f5',
  };

  // 🚀 Fonction de calcul automatique des frais de retrait (Barème Bénin)
  const calculateWithdrawalFees = (amount) => {
    if (amount <= 0) return 0;
    
    // Grille tarifaire standard (MTN / Moov / Celtiis s'alignent globalement à quelques variations près)
    if (amount <= 500) return 0;
    if (amount <= 1000) return 100;
    if (amount <= 5000) return 150;
    if (amount <= 10000) return 200;
    if (amount <= 20000) return 350;
    if (amount <= 50000) return 500;
    if (amount <= 100000) return 700;
    if (amount <= 500000) return 1100;
    return 1500; // Plafond standard pour les gros montants
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir un titre.');
      return;
    }
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Montant invalide', 'Veuillez saisir un montant supérieur à 0.');
      return;
    }

    let finalAmount = parsedAmount;
    let computedFee = 0;
    let customNote = note.trim();

    // 🚀 Si c'est un retrait MoMo, on calcule et intègre les frais
    if (type === 'expense' && isMoMoWithdrawal) {
      computedFee = calculateWithdrawalFees(parsedAmount);
      finalAmount = parsedAmount + computedFee; // Le montant total prélevé inclut les frais
      
      const feeDetails = `(Frais de retrait ${selectedNetwork} : +${computedFee} F)`;
      customNote = customNote ? `${customNote} ${feeDetails}` : feeDetails;
    }

    const automaticCategory = type === 'income' ? 'Salaire' : 'Général';

    addTransaction({
      id:         Date.now().toString(),
      title:      title.trim(),
      amount:     finalAmount, // Montant total (principal + frais)
      type,
      category:   automaticCategory,
      note:       customNote || null,   
      date:       new Date().toISOString(),
      recurrence: type === 'income' ? recurrence : 'none',
      // On peut stocker ces données bonus si besoin pour des stats futures
      momoNetwork: type === 'expense' && isMoMoWithdrawal ? selectedNetwork : null,
      momoFee:     computedFee > 0 ? computedFee : null,
    });

    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
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
              onPress={() => setType('expense')}
            >
              <Text style={[styles.toggleText, { color: type === 'expense' ? '#fff' : colors.subText }, type === 'expense' && { fontWeight: '700' }]}>
                ▼ Dépense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, type === 'income' && { backgroundColor: '#2ecc71' }]}
              onPress={() => {
                setType('income');
                setIsMoMoWithdrawal(false); // Désactive l'option si on bascule en Revenu
              }}
            >
              <Text style={[styles.toggleText, { color: type === 'income' ? '#fff' : colors.subText }, type === 'income' && { fontWeight: '700' }]}>
                ▲ Revenu
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Mode de réception (Uniquement pour les revenus) ── */}
        {type === 'income' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.subText }]}>RÉCEPTION DU SALAIRE / REVENU</Text>
            <View style={styles.choiceGrid}>
              {RECURRENCES.map((rec) => {
                const isSelected = recurrence === rec.key;
                return (
                  <TouchableOpacity
                    key={rec.key}
                    style={[styles.choiceChip, { backgroundColor: colors.input }, isSelected && { backgroundColor: accentColor }]}
                    onPress={() => setRecurrence(rec.key)}
                  >
                    <Text style={[styles.choiceChipLabel, { color: isSelected ? '#fff' : colors.text }, isSelected && { fontWeight: '700' }]}>
                      {rec.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── 🚀 Option Mobile Money (Uniquement pour les Dépenses) ── */}
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
                <Text style={[styles.label, { color: colors.subText }]}>CHOIX DU RÉSEAU</Text>
                <View style={styles.choiceGrid}>
                  {NETWORKS.map((net) => {
                    const isSelected = selectedNetwork === net.key;
                    return (
                      <TouchableOpacity
                        key={net.key}
                        style={[styles.choiceChip, { backgroundColor: colors.input }, isSelected && { backgroundColor: accentColor }]}
                        onPress={() => setSelectedNetwork(net.key)}
                      >
                        <Text style={[styles.choiceChipLabel, { color: isSelected ? '#fff' : colors.text }, isSelected && { fontWeight: '700' }]}>
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
            placeholder={type === 'income' ? "Ex : Salaire Juin, Freelance..." : "Ex : Retrait MTN, Achat boutique..."}
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

          {/* Note optionnelle */}
          <Text style={[styles.label, { color: colors.subText, marginTop: 20 }]}>
            NOTE <Text style={[styles.optionalBadge, { color: colors.subText }]}>(optionnel)</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.noteInput, { backgroundColor: colors.input, color: colors.text }]}
            value={note}
            onChangeText={setNote}
            placeholder="Ex : Retrait pour l'électricien..."
            placeholderTextColor={colors.subText}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>

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
  saveBtn:       { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  saveBtnText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  choiceGrid:      { flexDirection: 'row', gap: 8 },
  choiceChip:      { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  choiceChipLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  // Styles spécifiques au Switch Mobile Money
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});