import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ChevronDown, ChevronRight, BookOpen, X } from 'lucide-react-native';
import { useFinance } from '../../../viewmodel/FinanceContext';
import { useTranslation } from '../../../utils/LanguageManager';
import {
  getChartTree,
  searchAccounts,
  ACCOUNT_CLASSES,
  ACCOUNT_TYPE_LABELS,
} from '../../../model/accounting/ChartOfAccounts';

export default function ChartOfAccountsScreen({ navigation, onClose }) {
  const { isDark, accentColor } = useFinance();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState({});

  const colors = {
    bg: isDark ? '#0f1015' : '#f5f6fa',
    cardBg: isDark ? '#16171f' : '#ffffff',
    text: isDark ? '#ffffff' : '#131419',
    subText: isDark ? '#8c8e9b' : '#6a6c7a',
    border: isDark ? '#2a2b38' : '#e8eaef',
    inputBg: isDark ? '#1c1d28' : '#f0f1f6',
  };

  const tree = useMemo(() => getChartTree(), []);
  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    return searchAccounts(query);
  }, [query]);

  const toggleExpand = (code) => {
    setExpanded((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const renderAccount = (acc, depth = 0) => {
    const isExpanded = expanded[acc.code];
    const hasChildren = acc.children && acc.children.length > 0;
    const typeColor = {
      asset: '#3b82f6',
      liability: '#8b5cf6',
      equity: '#10b981',
      expense: '#ef4444',
      income: '#2ecc71',
    }[acc.type] || accentColor;

    return (
      <View key={acc.code}>
        <TouchableOpacity
          style={[
            styles.accountRow,
            { paddingLeft: 16 + depth * 20, backgroundColor: depth === 0 ? colors.cardBg : 'transparent' },
          ]}
          onPress={() => hasChildren && toggleExpand(acc.code)}
          activeOpacity={hasChildren ? 0.7 : 1}
        >
          <View style={styles.accountLeft}>
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={14} color={colors.subText} />
              ) : (
                <ChevronRight size={14} color={colors.subText} />
              )
            ) : (
              <View style={{ width: 14 }} />
            )}
            <Text style={[styles.accountCode, { color: typeColor }]}>{acc.code}</Text>
          </View>
          <Text style={[styles.accountLabel, { color: colors.text }]} numberOfLines={1}>
            {acc.label}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>
              {ACCOUNT_TYPE_LABELS[acc.type] || acc.type}
            </Text>
          </View>
        </TouchableOpacity>
        {hasChildren && isExpanded && (
          <View>
            {acc.children.map((child) => renderAccount(child, depth + 1))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <BookOpen size={22} color={accentColor} />
          <Text style={[styles.title, { color: colors.text, flex: 1 }]}>Plan comptable SYSCOHADA</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.subText} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Search size={16} color={colors.subText} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un compte..."
            placeholderTextColor={colors.subText}
          />
        </View>

        {searchResults ? (
          <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.sectionLabel, { color: colors.subText }]}>
              {searchResults.length} résultat(s)
            </Text>
            {searchResults.map((acc) => (
              <View key={acc.code} style={styles.searchResultRow}>
                <Text style={[styles.accountCode, { color: accentColor }]}>{acc.code}</Text>
                <Text style={[styles.accountLabel, { color: colors.text, flex: 1 }]}>{acc.label}</Text>
                <View style={[styles.typeBadge, { backgroundColor: (ACCOUNT_TYPE_LABELS[acc.type] || '').includes('Charge') ? '#ef444420' : '#2ecc7120' }]}>
                  <Text style={[styles.typeText, { color: (ACCOUNT_TYPE_LABELS[acc.type] || '').includes('Charge') ? '#ef4444' : '#2ecc71' }]}>
                    {ACCOUNT_TYPE_LABELS[acc.type] || acc.type}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          tree.map((root) => (
            <View key={root.code} style={[styles.card, { backgroundColor: colors.cardBg, borderLeftColor: accentColor, borderLeftWidth: 3 }]}>
              <View style={styles.classHeader}>
                <Text style={[styles.classCode, { color: accentColor }]}>{root.code}</Text>
                <Text style={[styles.classLabel, { color: colors.text }]}>{root.label}</Text>
              </View>
              {root.children.map((child) => renderAccount(child, 0))}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, marginTop: 10 },
  title: { fontSize: 22, fontWeight: 'bold' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
    marginBottom: 16, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0 },
  card: { borderRadius: 20, padding: 16, marginBottom: 14 },
  classHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  classCode: { fontSize: 18, fontWeight: 'bold' },
  classLabel: { fontSize: 15, fontWeight: '600' },
  sectionLabel: { fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
  accountRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 8,
  },
  accountLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 70 },
  accountCode: { fontSize: 13, fontWeight: '700', fontFamily: Platform?.OS === 'ios' ? 'Menlo' : 'monospace' },
  accountLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeText: { fontSize: 10, fontWeight: '700' },
  searchResultRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, gap: 10,
  },
});
