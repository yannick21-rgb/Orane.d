import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Alert,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useTontines } from '../../viewmodel/TontineContext';
import { TONTINE_FREQUENCIES } from '../../model/TontineModel';
import { toNumber } from '../../utils/format';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useColors } from '../theme';
import { Button } from './ui';
import { radius } from '../theme/tokens';

export default function TontineFormModal({ visible, initialData, onClose }) {
  const { accentColor } = useFinance();
  const { addGroup, updateGroup } = useTontines();
  const isEdit = !!initialData;

  const [groupName, setGroupName] = useState('');
  const [amountPerTour, setAmountPerTour] = useState('');
  const [frequency, setFrequency] = useState('mensuelle');
  const [totalParticipants, setTotalParticipants] = useState('');
  const [myPosition, setMyPosition] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initialData) {
      setGroupName(initialData.groupName);
      setAmountPerTour(String(initialData.amountPerTour));
      setFrequency(initialData.frequency);
      setTotalParticipants(String(initialData.totalParticipants));
      setMyPosition(String(initialData.myPosition));
      setStartDate(new Date(initialData.startDate));
    } else {
      setGroupName('');
      setAmountPerTour('');
      setFrequency('mensuelle');
      setTotalParticipants('');
      setMyPosition('');
      setStartDate(new Date());
    }
  }, [visible, initialData]);

  const colors = useColors();

  const handleSave = async () => {
    if (!groupName.trim()) {
      Alert.alert('Champ requis', 'Le nom du groupe est requis.');
      return;
    }
    const amount = toNumber(amountPerTour);
    if (amount <= 0) { Alert.alert('Montant invalide', 'Entrez un montant valide.'); return; }
    const participants = parseInt(totalParticipants, 10);
    if (!participants || participants < 2) { Alert.alert('Invalide', 'Il faut au moins 2 participants.'); return; }
    const position = parseInt(myPosition, 10);
    if (!position || position < 1 || position > participants) {
      Alert.alert('Position invalide', `Votre position doit être entre 1 et ${participants}.`);
      return;
    }
    try {
      const data = { groupName: groupName.trim(), amountPerTour: amount, frequency, totalParticipants: participants, myPosition: position, startDate };
      if (isEdit) {
        await updateGroup(initialData.id, data);
      } else {
        await addGroup(data);
      }
      onClose();
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'enregistrer.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isEdit ? 'Modifier' : 'Nouvelle'} tontine
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: colors.subText }]}>Nom du groupe</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Ex: Tontine Famille"
              placeholderTextColor={colors.subText}
            />

            <Text style={[styles.label, { color: colors.subText }]}>Montant par tour</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              value={amountPerTour}
              onChangeText={setAmountPerTour}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.subText}
            />

            <Text style={[styles.label, { color: colors.subText }]}>Fréquence</Text>
            <View style={styles.freqRow}>
              {TONTINE_FREQUENCIES.map((f) => {
                const active = frequency === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.freqBtn, { backgroundColor: active ? accentColor : colors.input }]}
                    onPress={() => setFrequency(f.key)}
                  >
                    <Text style={[styles.freqText, { color: active ? colors.accentFg : colors.text }]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.subText }]}>Nombre total de participants</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              value={totalParticipants}
              onChangeText={setTotalParticipants}
              keyboardType="number-pad"
              placeholder="Ex: 10"
              placeholderTextColor={colors.subText}
            />

            <Text style={[styles.label, { color: colors.subText }]}>Ma position dans l'ordre de réception</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
              value={myPosition}
              onChangeText={setMyPosition}
              keyboardType="number-pad"
              placeholder="Ex: 3"
              placeholderTextColor={colors.subText}
            />
            <Text style={[styles.hint, { color: colors.subText }]}>
              À chaque tour, un participant reçoit la cagnotte. Entrez votre rang (1 = premier à recevoir).
            </Text>

            <Text style={[styles.label, { color: colors.subText }]}>Date de début</Text>
            <TouchableOpacity
              style={[styles.dateBtn, { backgroundColor: colors.input, borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: colors.text, fontSize: 15 }}>{startDate.toLocaleDateString('fr-FR')}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={(_, d) => { setShowDatePicker(false); if (d) setStartDate(d); }}
              />
            )}

            <Text style={[styles.previewText, { color: colors.subText }]}>
              {totalParticipants && amountPerTour
                ? `Cagnotte à mon tour : ${(toNumber(amountPerTour) * parseInt(totalParticipants, 10)).toLocaleString()}`
                : ''}
            </Text>

            <Button
              size="xl"
              fullWidth
              label={isEdit ? 'Enregistrer' : 'Créer la tontine'}
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
  container: { maxHeight: '90%', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  input: { height: 48, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 14, fontSize: 16, fontWeight: '500' },
  freqRow: { flexDirection: 'row', gap: 10 },
  freqBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.sm, alignItems: 'center' },
  freqText: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 11, marginTop: 6, lineHeight: 16 },
  dateBtn: { height: 48, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 14, justifyContent: 'center' },
  previewText: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 16 },
  saveBtn: { marginTop: 24, marginBottom: 12 },
});
