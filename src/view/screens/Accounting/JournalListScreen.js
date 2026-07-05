import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileText, Plus, CheckCircle, AlertCircle, Search, X,
  Eye, Trash2, Filter,
} from 'lucide-react-native';
import { useFinance } from '../../../viewmodel/FinanceContext';
import { useAccounting } from '../../../viewmodel/AccountingContext';
import { useTranslation } from '../../../utils/LanguageManager';
import { formatReference, JOURNAL_STATUS } from '../../../model/accounting/JournalEntry';
import JournalEntryScreen from './JournalEntryScreen';

export default function JournalListScreen({ navigation }) {
  const { isDark, accentColor } = useFinance();
  const {
    entries, getEntries, postEntry, deleteEntry,
    draftCount, postedCount,
  } = useAccounting();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);

  const colors = {
    bg: isDark ? '#0f1015' : '#f5f6fa',
    cardBg: isDark ? '#16171f' : '#ffffff',
    text: isDark ? '#ffffff' : '#131419',
    subText: isDark ? '#8c8e9b' : '#6a6c7a',
    border: isDark ? '#2a2b38' : '#e8eaef',
    inputBg: isDark ? '#1c1d28' : '#f0f1f6',
  };

  const filtered = useMemo(() => {
    return getEntries({ status: filter === 'all' ? undefined : filter, search });
  }, [entries, filter, search, getEntries]);

  const handlePost = (id) => {
    Alert.alert(
      'Valider l\'écriture',
      'Une fois validée, l\'écriture sera comptabilisée. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider',
          onPress: async () => {
            try {
              await postEntry(id);
            } catch (e) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  };

  const handleDelete = (id) => {
    Alert.alert('Supprimer', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteEntry(id) },
    ]);
  };

  if (editingId) {
    return (
      <JournalEntryScreen
        navigation={navigation}
        editEntryId={editingId}
        onClose={() => setEditingId(null)}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <FileText size={22} color={accentColor} />
          <Text style={[styles.title, { color: colors.text }]}>Journal comptable</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.stat, { backgroundColor: '#3b82f620' }]}>
            <Text style={[styles.statValue, { color: '#3b82f6' }]}>{entries.length}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Total</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: '#f59e0b20' }]}>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{draftCount}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Brouillon</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: '#2ecc7120' }]}>
            <Text style={[styles.statValue, { color: '#2ecc71' }]}>{postedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Validée</Text>
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Search size={16} color={colors.subText} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher..."
            placeholderTextColor={colors.subText}
          />
        </View>

        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'Toutes' },
            { key: JOURNAL_STATUS.DRAFT, label: 'Brouillons' },
            { key: JOURNAL_STATUS.POSTED, label: 'Validées' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, { backgroundColor: filter === f.key ? accentColor : colors.inputBg }]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, { color: filter === f.key ? '#fff' : colors.text }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: accentColor }]}
          onPress={() => setEditingId('new')}
          activeOpacity={0.85}
        >
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>Nouvelle écriture</Text>
        </TouchableOpacity>

        {filtered.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBg }]}>
            <FileText size={40} color={colors.subText} />
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              Aucune écriture trouvée
            </Text>
          </View>
        ) : (
          filtered.map((entry) => {
            const totalDebit = entry.lines.reduce((s, l) => s + (l.debit || 0), 0);
            const isDraft = entry.status === JOURNAL_STATUS.DRAFT;
            return (
              <TouchableOpacity
                key={entry.id}
                style={[styles.entryCard, { backgroundColor: colors.cardBg, borderLeftColor: isDraft ? '#f59e0b' : '#2ecc71', borderLeftWidth: 3 }]}
                activeOpacity={0.8}
              >
                <View style={styles.entryHeader}>
                  <Text style={[styles.entryRef, { color: colors.text }]}>
                    {formatReference(entry)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: isDraft ? '#f59e0b20' : '#2ecc7120' }]}>
                    {isDraft ? (
                      <AlertCircle size={10} color="#f59e0b" />
                    ) : (
                      <CheckCircle size={10} color="#2ecc71" />
                    )}
                    <Text style={[styles.statusText, { color: isDraft ? '#f59e0b' : '#2ecc71' }]}>
                      {isDraft ? 'Brouillon' : 'Validée'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.entryDesc, { color: colors.text }]} numberOfLines={2}>
                  {entry.description}
                </Text>

                <View style={styles.entryMeta}>
                  <Text style={[styles.entryDate, { color: colors.subText }]}>
                    {new Date(entry.date).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.entryTotal, { color: colors.text }]}>
                    {totalDebit.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.entryLines}>
                  {entry.lines.slice(0, 3).map((l, i) => (
                    <Text key={i} style={[styles.linePreview, { color: colors.subText }]} numberOfLines={1}>
                      {l.accountCode} {l.debit > 0 ? `${l.debit}D` : `${l.credit}C`}
                    </Text>
                  ))}
                  {entry.lines.length > 3 && (
                    <Text style={[styles.linePreview, { color: colors.subText }]}>
                      ... +{entry.lines.length - 3} ligne(s)
                    </Text>
                  )}
                </View>

                <View style={styles.entryActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.inputBg }]}
                    onPress={() => setEditingId(entry.id)}
                  >
                    <Eye size={14} color={colors.text} />
                    <Text style={[styles.actionText, { color: colors.text }]}>Voir</Text>
                  </TouchableOpacity>
                  {isDraft && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#2ecc7120' }]}
                        onPress={() => handlePost(entry.id)}
                      >
                        <CheckCircle size={14} color="#2ecc71" />
                        <Text style={[styles.actionText, { color: '#2ecc71' }]}>Valider</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#ef444420' }]}
                        onPress={() => handleDelete(entry.id)}
                      >
                        <Trash2 size={14} color="#ef4444" />
                        <Text style={[styles.actionText, { color: '#ef4444' }]}>Suppr.</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, padding: 12, borderRadius: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
    marginBottom: 12, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16 },
  filterText: { fontSize: 13, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 14, marginBottom: 16,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyCard: { padding: 40, borderRadius: 20, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  entryCard: { padding: 14, borderRadius: 16, marginBottom: 10 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  entryRef: { fontSize: 14, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  entryDesc: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  entryMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  entryDate: { fontSize: 12 },
  entryTotal: { fontSize: 14, fontWeight: '700' },
  entryLines: { marginBottom: 8 },
  linePreview: { fontSize: 11, lineHeight: 16 },
  entryActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  actionText: { fontSize: 12, fontWeight: '600' },
});
