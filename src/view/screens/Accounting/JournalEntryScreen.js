import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, Modal, Platform as RNPlatform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, Save, X, FileText, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react-native';
import { useFinance } from '../../../viewmodel/FinanceContext';
import { useAccounting } from '../../../viewmodel/AccountingContext';
import { useTranslation } from '../../../utils/LanguageManager';
import { isValidAccountCode, searchAccounts, getAccountByCode } from '../../../model/accounting/ChartOfAccounts';
import { validateJournalEntry } from '../../../model/accounting/JournalEntry';
import CrossPlatformDatePicker from '../../components/CrossPlatformDatePicker';

export default function JournalEntryScreen({ navigation, editEntryId, onClose }) {
  const { isDark, accentColor } = useFinance();
  const { addEntry, updateEntry, entries } = useAccounting();
  const { t } = useTranslation();

  const existing = editEntryId ? entries.find((e) => e.id === editEntryId) : null;
  const isEditing = !!existing;

  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState([
    { accountCode: '', label: '', debit: '', credit: '' },
    { accountCode: '', label: '', debit: '', credit: '' },
  ]);
  const [errors, setErrors] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (existing) {
      setDate(new Date(existing.date));
      setDescription(existing.description);
      setLines(
        existing.lines.map((l) => ({
          accountCode: l.accountCode,
          label: l.label,
          debit: l.debit > 0 ? String(l.debit) : '',
          credit: l.credit > 0 ? String(l.credit) : '',
        }))
      );
    }
  }, [existing]);

  const colors = {
    bg: isDark ? '#0f1015' : '#f5f6fa',
    card: isDark ? '#16171f' : '#ffffff',
    text: isDark ? '#ffffff' : '#131419',
    subText: isDark ? '#8c8e9b' : '#6a6c7a',
    input: isDark ? '#222431' : '#eef0f5',
    border: isDark ? '#2a2b38' : '#e8eaef',
    modalBg: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)',
  };

  const totals = lines.reduce(
    (acc, l) => ({
      debit: acc.debit + (Number(l.debit) || 0),
      credit: acc.credit + (Number(l.credit) || 0),
    }),
    { debit: 0, credit: 0 }
  );

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  const addLine = () => {
    setLines((prev) => [...prev, { accountCode: '', label: '', debit: '', credit: '' }]);
  };

  const removeLine = (index) => {
    if (lines.length <= 2) {
      Alert.alert('Minimum', 'Une écriture doit avoir au moins 2 lignes');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index, field, value) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'accountCode') {
        const account = getAccountByCode(value);
        if (account) {
          updated[index].label = account.label;
        }
      }
      return updated;
    });
    setErrors([]);
  };

  const handleSave = async () => {
    const entryLines = lines.map((l) => ({
      accountCode: l.accountCode,
      label: l.label || l.accountCode,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
    }));

    const entryData = {
      date: date.toISOString().split('T')[0],
      description: description.trim(),
      lines: entryLines,
    };

    const testEntry = {
      ...entryData,
      id: 'test',
      status: 'draft',
      userId: 'test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const validation = validateJournalEntry(testEntry);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    try {
      if (isEditing) {
        await updateEntry(existing.id, entryData);
      } else {
        await addEntry(entryData);
      }
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (navigation?.goBack) navigation.goBack();
      }, 1500);
    } catch (e) {
      setErrors([e.message]);
    }
  };

  const suggestionCache = {};
  const getSuggestions = (query) => {
    if (!query || query.length < 1) return [];
    if (suggestionCache[query]) return suggestionCache[query];
    const results = searchAccounts(query).slice(0, 5);
    suggestionCache[query] = results;
    return results;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <Modal transparent visible={showSuccess} animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <CheckCircle size={48} color={accentColor} />
            <Text style={[styles.modalText, { color: colors.text, marginTop: 12 }]}>
              {isEditing ? 'Écriture modifiée' : 'Écriture enregistrée'}
            </Text>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <FileText size={22} color={accentColor} />
          <Text style={[styles.title, { color: colors.text, flex: 1 }]}>
            {isEditing ? 'Modifier l\'écriture' : 'Nouvelle écriture'}
          </Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.subText} />
            </TouchableOpacity>
          )}
        </View>

        {errors.length > 0 && (
          <View style={[styles.errorCard, { backgroundColor: '#ef4444' + '15', borderColor: '#ef4444' + '40' }]}>
            <AlertCircle size={16} color="#ef4444" />
            <View style={{ flex: 1 }}>
              {errors.map((err, i) => (
                <Text key={i} style={styles.errorText}>{err}</Text>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.subText }]}>DATE</Text>
          <CrossPlatformDatePicker
            value={date}
            mode="date"
            isDark={isDark}
            colors={{ inputBg: colors.input, border: colors.border, text: colors.text }}
            onChange={(_, d) => d && setDate(d)}
          />

          <Text style={[styles.label, { color: colors.subText, marginTop: 16 }]}>LIBELLÉ</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
            value={description}
            onChangeText={(v) => { setDescription(v); setErrors([]); }}
            placeholder="Ex: Achat de marchandises, Règlement client..."
            placeholderTextColor={colors.subText}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.linesHeader}>
            <Text style={[styles.label, { color: colors.subText }]}>LIGNES D'ÉCRITURE</Text>
            <TouchableOpacity onPress={addLine} style={[styles.addLineBtn, { backgroundColor: accentColor }]}>
              <Plus size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.columnHeaders, { borderBottomColor: colors.border }]}>
            <Text style={[styles.colHeader, { width: 80, color: colors.subText }]}>Compte</Text>
            <Text style={[styles.colHeader, { flex: 1, color: colors.subText }]}>Libellé</Text>
            <Text style={[styles.colHeader, { width: 70, textAlign: 'right', color: colors.subText }]}>Débit</Text>
            <Text style={[styles.colHeader, { width: 70, textAlign: 'right', color: colors.subText }]}>Crédit</Text>
            <View style={{ width: 24 }} />
          </View>

          {lines.map((line, i) => (
            <View key={i} style={[styles.lineRow, { borderBottomColor: colors.border }]}>
              <TextInput
                style={[styles.lineInput, styles.codeInput, { backgroundColor: colors.input, color: colors.text }]}
                value={line.accountCode}
                onChangeText={(v) => updateLine(i, 'accountCode', v)}
                placeholder="101"
                placeholderTextColor={colors.subText}
              />
              <TextInput
                style={[styles.lineInput, { flex: 1, backgroundColor: colors.input, color: colors.text }]}
                value={line.label}
                onChangeText={(v) => updateLine(i, 'label', v)}
                placeholder="Libellé"
                placeholderTextColor={colors.subText}
              />
              <TextInput
                style={[styles.lineInput, styles.amountInput, { backgroundColor: colors.input, color: '#2ecc71' }]}
                value={line.debit}
                onChangeText={(v) => updateLine(i, 'debit', v)}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.subText}
              />
              <TextInput
                style={[styles.lineInput, styles.amountInput, { backgroundColor: colors.input, color: '#ef4444' }]}
                value={line.credit}
                onChangeText={(v) => updateLine(i, 'credit', v)}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.subText}
              />
              <TouchableOpacity onPress={() => removeLine(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Trash2 size={16} color={colors.subText} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={[styles.totalsRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.subText }]}>Totaux</Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.totalAmount, { color: isBalanced ? '#2ecc71' : '#ef4444', fontWeight: '700' }]}>
              {totals.debit.toFixed(2)}
            </Text>
            <Text style={[styles.totalAmount, { color: isBalanced ? '#2ecc71' : '#ef4444', fontWeight: '700', marginRight: 28 }]}>
              {totals.credit.toFixed(2)}
            </Text>
          </View>

          {!isBalanced && totals.debit > 0 && (
            <Text style={[styles.balanceWarning, { color: '#ef4444' }]}>
              Différence: {(totals.debit - totals.credit).toFixed(2)} — L'écriture doit être équilibrée
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: accentColor, opacity: isBalanced ? 1 : 0.5 }]}
          onPress={handleSave}
          disabled={!isBalanced}
          activeOpacity={0.85}
        >
          <Save size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{isEditing ? 'Mettre à jour' : 'Enregistrer l\'écriture'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold' },
  errorCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 14,
  },
  errorText: { color: '#ef4444', fontSize: 12, lineHeight: 18 },
  card: { padding: 16, borderRadius: 20, marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  input: { padding: 14, borderRadius: 14, fontSize: 15, fontWeight: '500' },
  linesHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  addLineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
  },
  columnHeaders: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 8, borderBottomWidth: 1, gap: 6,
  },
  colHeader: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  lineRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, gap: 6,
  },
  lineInput: { padding: 8, borderRadius: 8, fontSize: 13, fontWeight: '500' },
  codeInput: { width: 70, fontFamily: RNPlatform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
  amountInput: { width: 68, textAlign: 'right', fontSize: 13 },
  totalsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 10, marginTop: 6, borderTopWidth: 1, gap: 6,
  },
  totalLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  totalAmount: { width: 70, textAlign: 'right', fontSize: 14 },
  balanceWarning: { fontSize: 12, marginTop: 8, fontWeight: '500' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 16, marginTop: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    padding: 30, borderRadius: 24, alignItems: 'center',
    width: 180, height: 160, justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25, shadowRadius: 14, elevation: 10,
  },
  modalText: { fontSize: 16, fontWeight: '700' },
});
