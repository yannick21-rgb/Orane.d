import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, Trash2, ChevronRight } from 'lucide-react-native';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useTontines } from '../../viewmodel/TontineContext';
import { computeTontineSummary } from '../../model/TontineModel';
import { toNumber } from '../../utils/format';
import TontineFormModal from '../components/TontineFormModal';
import TontineDetailScreen from './TontineDetailScreen';
import { useResponsive } from '../../utils/responsive';
import { radius } from '../theme/tokens';
import { type, tabular } from '../theme/type';
import { useColors } from '../theme';

export default function TontinesScreen({ onClose }) {
  const { accentColor, devise } = useFinance();
  const { groups, deleteGroup, overallSummary } = useTontines();
  const { contentMaxWidth, contentPadding, cardPadding, borderRadius } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding, cardPadding, borderRadius);
  const deviseSymbol = devise?.split(' ')[0] || 'F';

  const [showForm, setShowForm] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [detailGroup, setDetailGroup] = useState(null);

  const colors = useColors();

  const handleDelete = (g) => {
    Alert.alert(
      'Supprimer cette tontine ?',
      `Toutes les données de "${g.groupName}" seront perdues.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteGroup(g.id) },
      ]
    );
  };

  if (detailGroup) {
    return (
      <TontineDetailScreen
        group={detailGroup}
        onClose={() => setDetailGroup(null)}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mes Tontines</Text>
        <TouchableOpacity onPress={() => { setEditGroup(null); setShowForm(true); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Plus size={22} color={accentColor} />
        </TouchableOpacity>
      </View>

      {groups.length > 0 && (
        <View style={[styles.summaryBar, { backgroundColor: colors.card }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>Total cotisé</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {overallSummary.totalPaid.toLocaleString()} {deviseSymbol}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>À recevoir</Text>
            <Text style={[styles.summaryValue, { color: colors.green }]}>
              {overallSummary.totalToReceive.toLocaleString()} {deviseSymbol}
            </Text>
          </View>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {groups.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔄</Text>
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              Aucune tontine enregistrée.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { borderColor: accentColor }]}
              onPress={() => { setEditGroup(null); setShowForm(true); }}
            >
              <Text style={[styles.emptyBtnText, { color: accentColor }]}>Créer une tontine</Text>
            </TouchableOpacity>
          </View>
        )}

        {groups.map((g) => {
          const summary = computeTontineSummary(g);
          const progress = g.rounds.filter((r) => r.status !== 'a_payer').length;
          const total = g.rounds.length;
          const pct = Math.round((progress / total) * 100);
          return (
            <TouchableOpacity
              key={g.id}
              style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setDetailGroup(g)}
              activeOpacity={0.8}
            >
              <View style={styles.groupHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.groupName, { color: colors.text }]}>{g.groupName}</Text>
                  <Text style={[styles.groupMeta, { color: colors.subText }]}>
                    {g.amountPerTour.toLocaleString()} {deviseSymbol} × {g.totalParticipants} tours · {g.frequency === 'hebdomadaire' ? 'Hebdo' : 'Mensuel'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(g)} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                  <Trash2 size={16} color={colors.subText} />
                </TouchableOpacity>
              </View>

              <View style={styles.progressRow}>
                <View style={[styles.progressTrack, { backgroundColor: colors.input }]}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? colors.green : accentColor }]} />
                </View>
                <Text style={[styles.progressText, { color: colors.subText }]}>{progress}/{total}</Text>
              </View>

              <View style={styles.groupSummary}>
                <Text style={[styles.summaryLabel, { color: colors.subText }]}>
                  {summary.hasReceived ? '✅ Reçu' : `Position : ${g.myPosition}/${g.totalParticipants}`}
                </Text>
                <ChevronRight size={16} color={colors.subText} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TontineFormModal
        visible={showForm}
        initialData={editGroup}
        onClose={() => { setShowForm(false); setEditGroup(null); }}
      />
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
  headerTitle: { ...type.title },
  list: { paddingHorizontal: cpad, paddingBottom: 40, maxWidth: cp, width: '100%', alignSelf: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  emptyBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: radius.sm, borderWidth: 1, borderStyle: 'dashed' },
  emptyBtnText: { fontSize: 13, fontWeight: '600' },
  summaryBar: {
    flexDirection: 'row', marginHorizontal: cpad, marginTop: 12,
    padding: cardP, borderRadius: br, marginBottom: 4,
    maxWidth: cp, width: '100%', alignSelf: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { ...type.micro, marginBottom: 4 },
  summaryValue: { ...type.figure, ...tabular, fontSize: 18 },
  summaryDivider: { width: 1, marginHorizontal: 16 },
  groupCard: {
    padding: cardP, borderRadius: br, marginBottom: 12, borderWidth: 1,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  groupName: { ...type.heading, fontSize: 16 },
  groupMeta: { fontSize: 12, marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  progressTrack: { flex: 1, height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: radius.pill },
  progressText: { ...type.micro, width: 40, textAlign: 'right' },
  groupSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
