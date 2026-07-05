import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileText, BookOpen, Scale, Calculator,
  ArrowRight, CheckCircle, AlertCircle,
  Plus, Layers, X,
} from 'lucide-react-native';
import { useFinance } from '../../../viewmodel/FinanceContext';
import { useAccounting } from '../../../viewmodel/AccountingContext';
import { useTranslation } from '../../../utils/LanguageManager';
import { isBalanced } from '../../../model/accounting/TrialBalance';

export default function AccountingDashboardScreen({ onNavigate, onClose }) {
  const { isDark, accentColor } = useFinance();
  const { entries, draftCount, postedCount, getTrialBalance, getSummary } = useAccounting();
  const { t } = useTranslation();

  const colors = {
    bg: isDark ? '#0f1015' : '#f5f6fa',
    cardBg: isDark ? '#16171f' : '#ffffff',
    text: isDark ? '#ffffff' : '#131419',
    subText: isDark ? '#8c8e9b' : '#6a6c7a',
    border: isDark ? '#2a2b38' : '#e8eaef',
  };

  const trial = useMemo(() => {
    if (postedCount === 0) return null;
    return getTrialBalance();
  }, [entries, postedCount, getTrialBalance]);

  const summary = useMemo(() => {
    if (postedCount === 0) return null;
    return getSummary();
  }, [entries, postedCount, getSummary]);

  const menuItems = [
    {
      key: 'journal',
      icon: FileText,
      label: 'Journal',
      desc: 'Saisie et gestion des écritures',
      count: entries.length,
      color: '#3b82f6',
    },
    {
      key: 'ledger',
      icon: BookOpen,
      label: 'Grand livre',
      desc: 'Consultation des comptes',
      count: null,
      color: '#8b5cf6',
    },
    {
      key: 'trial',
      icon: Scale,
      label: 'Balance',
      desc: 'Vérification de l\'équilibre',
      count: null,
      color: '#f59e0b',
    },
    {
      key: 'chart',
      icon: Layers,
      label: 'Plan comptable',
      desc: 'Liste des comptes SYSCOHADA',
      count: null,
      color: '#10b981',
    },
  ];

  const totalBalance = trial?.totals?.totalDebit || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Calculator size={24} color={accentColor} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Comptabilité</Text>
            <Text style={[styles.subtitle, { color: colors.subText }]}>Module partie double</Text>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.subText} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.cardBg }]}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#3b82f6' }]}>{entries.length}</Text>
              <Text style={[styles.statLabel, { color: colors.subText }]}>Écritures</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>{draftCount}</Text>
              <Text style={[styles.statLabel, { color: colors.subText }]}>Brouillons</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#2ecc71' }]}>{postedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.subText }]}>Validées</Text>
            </View>
          </View>
          {trial && (
            <View style={[styles.balanceRow, { borderTopColor: colors.border }]}>
              {trial && isBalanced(trial) ? (
                <CheckCircle size={14} color="#2ecc71" />
              ) : (
                <AlertCircle size={14} color="#ef4444" />
              )}
              <Text style={[styles.balanceText, { color: colors.subText }]}>
                Total des mouvements: {totalBalance.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {summary && (
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderLeftColor: summary.incomeStatement.isProfitable ? '#2ecc71' : '#ef4444', borderLeftWidth: 3 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Résultat
            </Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.subText }]}>Produits</Text>
              <Text style={[styles.summaryValue, { color: '#2ecc71' }]}>
                +{summary.incomeStatement.totalRevenues.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.subText }]}>Charges</Text>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                -{summary.incomeStatement.totalExpenses.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.summaryRow, { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 8, marginTop: 8 }]}>
              <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: '700' }]}>
                Résultat net
              </Text>
              <Text style={[styles.summaryValue, { fontWeight: '700', color: summary.incomeStatement.isProfitable ? '#2ecc71' : '#ef4444' }]}>
                {summary.incomeStatement.isProfitable ? '+' : ''}{summary.incomeStatement.netResult.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.subText }]}>MODULES</Text>

        {menuItems.map((item) => {
          const IconComp = item.icon;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuCard, { backgroundColor: colors.cardBg }]}
              onPress={() => onNavigate?.(item.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                <IconComp size={20} color={item.color} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.menuDesc, { color: colors.subText }]}>{item.desc}</Text>
              </View>
              {item.count !== null && (
                <View style={[styles.menuBadge, { backgroundColor: item.color + '20' }]}>
                  <Text style={[styles.menuBadgeText, { color: item.color }]}>{item.count}</Text>
                </View>
              )}
              <ArrowRight size={16} color={colors.subText} />
            </TouchableOpacity>
          );
        })}

        {entries.length === 0 && (
          <TouchableOpacity
            style={[styles.quickAddBtn, { backgroundColor: accentColor }]}
            onPress={() => onNavigate?.('journal')}
            activeOpacity={0.85}
          >
            <Plus size={18} color="#fff" />
            <Text style={styles.quickAddText}>Créer votre première écriture</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold' },
  subtitle: { fontSize: 13, fontWeight: '500' },
  statsCard: { padding: 18, borderRadius: 20, marginBottom: 16 },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(120,120,120,0.15)' },
  balanceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1,
  },
  balanceText: { fontSize: 12, fontWeight: '500' },
  card: { padding: 16, borderRadius: 16, marginBottom: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  menuCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 16, marginBottom: 10, gap: 12,
  },
  menuIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600' },
  menuDesc: { fontSize: 12, marginTop: 2 },
  menuBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  menuBadgeText: { fontSize: 12, fontWeight: '700' },
  quickAddBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16, borderRadius: 16, marginTop: 6,
  },
  quickAddText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
