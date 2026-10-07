import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Alert, Switch,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useDebts } from '../../viewmodel/DebtContext';
import { DEBT_TYPES } from '../../model/DebtModel';
import { toNumber } from '../../utils/format';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useColors } from '../theme';
import { Button } from './ui';
import { radius } from '../theme/tokens';
import { type } from '../theme/type';

export default function DebtFormModal({ visible, onClose, initialData, defaultType }) {
  const { accentColor } = useFinance();
  const { addDebt, updateDebt } = useDebts();
  const isEdit = !!initialData;

  const [type, setType] = useState(defaultType || DEBT_TYPES.CREDIT_ACCORDE);
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (initialData) {
      setType(initialData.type);
      setPersonName(initialData.personName);
      setAmount(String(initialData.amount));
      setDueDate(initialData.dueDate ? new Date(initialData.dueDate) : null);
      setReminderEnabled(!!initialData.reminderEnabled);
      setNote(initialData.note || '');
    } else {
      setType(defaultType || DEBT_TYPES.CREDIT_ACCORDE);
      setPersonName('');
      setAmount('');
      setDueDate(null);
      setReminderEnabled(false);
      setNote('');
    }
  }, [visible, initialData, defaultType]);

  const colors = useColors();

  const handleSave = async () => {
    if (!personName.trim()) {
      Alert.alert('Champ requis', 'Le nom de la personne est requis.');
      return;
    }
    const amt = toNumber(amount);
    if (amt <= 0) {
      Alert.alert('Montant invalide', 'Entrez un montant valide.');
      return;
    }
    try {
      if (isEdit) {
        await updateDebt(initialData.id, {
          type,
          personName: personName.trim(),
          amount: amt,
          dueDate: dueDate ? dueDate.toISOString() : null,
          reminderEnabled,
          note: note.trim(),
        });
      } else {
        await addDebt({
          type,
          personName: personName.trim(),
          amount: amt,
          dueDate: dueDate ? dueDate.toISOString() : null,
          reminderEnabled,
          note: note.trim(),
        });
      }
      onClose();
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'enregistrer.");
    }
  };

  const toggleType = () => {
    setType((prev) =>
      prev === DEBT_TYPES.CREDIT_ACCORDE ? DEBT_TYPES.CREDIT_RECU : DEBT_TYPES.CREDIT_ACCORDE
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isEdit ? 'Modifier' : 'Nouvelle'} dette
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TouchableOpacity
              style={[styles.typeToggle, { backgroundColor: colors.input }]}
              onPress={toggleType}
            >
              <Text style={[styles.typeText, { color: type === DEBT_TYPES.CREDIT_ACCORDE ? accentColor : colors.subText }]}>
                💸 On me doit
              </Text>
              <Text style={{ color: colors.subText, marginHorizontal: 8 }}>|</Text>
              <Text style={[styles.typeText, { color: type === DEBT_TYPES.CREDIT_RECU ? accentColor : colors.subText }]}>
                💳 Je dois
              </Text>
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.subText }]}>Nom de la personne</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              value={personName}
              onChangeText={setPersonName}
              placeholder="Ex: Jean Dupont"
              placeholderTextColor={colors.subText}
            />

            <Text style={[styles.label, { color: colors.subText }]}>Montant</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.subText}
            />

            <Text style={[styles.label, { color: colors.subText }]}>Date d'échéance (optionnelle)</Text>
            <TouchableOpacity
              style={[styles.dateBtn, { backgroundColor: colors.input, borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: dueDate ? colors.text : colors.subText, fontSize: 15 }}>
                {dueDate ? dueDate.toLocaleDateString('fr-FR') : 'Sélectionner une date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display="default"
                onChange={(_, d) => { setShowDatePicker(false); if (d) setDueDate(d); }}
              />
            )}

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Rappel à l'échéance</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: colors.border, true: accentColor + '60' }}
                thumbColor={reminderEnabled ? accentColor : colors.subText}
              />
            </View>

            <Text style={[styles.label, { color: colors.subText }]}>Note (optionnelle)</Text>
            <TextInput
              style={[styles.input, styles.noteInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              value={note}
              onChangeText={setNote}
              placeholder="Ex: Remboursement prévu fin de mois"
              placeholderTextColor={colors.subText}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Button
              size="xl"
              fullWidth
              label={isEdit ? 'Enregistrer' : 'Ajouter'}
              onPress={handleSave}
              style={styles.saveBtn}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  container: {
    maxHeight: '90%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: 24,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  title: { ...type.title },
  typeToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: radius.md, marginBottom: 20,
  },
  typeText: { fontSize: 14, fontWeight: '600' },
  label: { ...type.label, marginBottom: 8, marginTop: 16 },
  input: {
    height: 48, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 14, fontSize: 16, fontWeight: '500',
  },
  noteInput: { height: 80, paddingTop: 14 },
  saveBtn: { marginTop: 24, marginBottom: 12 },
  dateBtn: {
    height: 48, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 14,
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 20,
  },
  switchLabel: { fontSize: 15, fontWeight: '600' },
});
