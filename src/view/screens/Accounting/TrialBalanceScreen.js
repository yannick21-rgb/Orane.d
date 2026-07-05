import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Scale, CheckCircle, AlertCircle, ChevronDown, ChevronRight, X } from 'lucide-react-native';
import { useFinance } from '../../../viewmodel/FinanceContext';
import { useAccounting } from '../../../viewmodel/AccountingContext';
import { isBalanced } from '../../../model/accounting/TrialBalance';

export default function TrialBalanceScreen({ navigation, onClose }) {
  const { isDark, accentColor } = useFinance();
  const { getTrialBalance, getTrialBalanceByClass, entries } = useAccounting();
  const [expandedClass, setExpandedClass] = useState(null);

  const colors = {
    bg: isDark ? '#0f1015' : '#f5f6fa',
    cardBg: isDark ? '#16171f' : '#ffffff',
    text: isDark ? '#ffffff' : '#131419',
    subText: isDark ? '#8c8e9b' : '#6a6c7a',
    border: isDark ? '#2a2b38' : '#e8eaef',
  };

  const trialBalance = useMemo(() => getTrialBalance(), [entries]);
  const byClass = useMemo(() => getTrialBalanceByClass(), [entries]);
  const balanced = useMemo(() => isBalanced(trialBalance), [trialBalance]);

  const postedEntries = entries.filter((e) => e.status === 'posted');

  if (postedEntries.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.emptyCard, { backgroundColor: colors.cardBg }]}>
          <Scale size={40} color={colors.subText} />
          <Text style={[styles.emptyText, { color: colors.subText }]}>
            Aucune écriture validée{'\n'}Validez des écritures dans le journal pour voir la balance.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Scale size={22} color={accentColor} />
          <Text style={[styles.title, { color: colors.text, flex: 1 }]}>Balance comptable</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.subText} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.statusCard, {
          backgroundColor: balanced ? '#2ecc7120' : '#ef444420',
          borderColor: balanced ? '#2ecc7140' : '#ef444440',
        }]}>
          {balanced ? (
            <CheckCircle size={20} color="#2ecc71" />
          ) : (
            <AlertCircle size={20} color="#ef4444" />
          )}
          <View>
            <Text style={[styles.statusTitle, { color: balanced ? '#2ecc71' : '#ef4444' }]}>
              Balance {balanced ? 'équilibrée' : 'non équilibrée'}
            </Text>
            <Text style={[styles.statusSub, { color: colors.subText }]}>
              Total débits: {trialBalance.totals.totalDebit.toFixed(2)} | Total crédits: {trialBalance.totals.totalCredit.toFixed(2)}
            </Text>
          </View>
        </View>

        {byClass.map((cls) => {
          const isExpanded = expandedClass === cls.classId;
          return (
            <View key={cls.classId} style={[styles.classCard, { backgroundColor: colors.cardBg }]}>
              <TouchableOpacity
                style={styles.classHeader}
                onPress={() => setExpandedClass(isExpanded ? null : cls.classId)}
              >
                {isExpanded ? (
                  <ChevronDown size={16} color={colors.text} />
                ) : (
                  <ChevronRight size={16} color={colors.text} />
                )}
                <Text style={[styles.className, { color: colors.text }]}>{cls.className}</Text>
                <Text style={[styles.classTotal, { color: colors.subText }]}>
                  {cls.totalDebit.toFixed(2)} / {cls.totalCredit.toFixed(2)}
                </Text>
              </TouchableOpacity>

              {isExpanded && (
                <View>
                  <View style={[styles.colHeaders, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.colHeader, { flex: 1, color: colors.subText }]}>Compte</Text>
                    <Text style={[styles.colHeader, { width: 80, textAlign: 'right', color: colors.subText }]}>Débit</Text>
                    <Text style={[styles.colHeader, { width: 80, textAlign: 'right', color: colors.subText }]}>Crédit</Text>
                    <Text style={[styles.colHeader, { width: 80, textAlign: 'right', color: colors.subText }]}>Solde</Text>
                  </View>
                  {cls.accounts.map((acc) => (
                    <View key={acc.accountCode} style={[styles.accRow, { borderBottomColor: colors.border }]}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.accCode, { color: accentColor }]}>{acc.accountCode}</Text>
                        <Text style={[styles.accLabel, { color: colors.text }]} numberOfLines={1}>
                          {acc.accountLabel}
                        </Text>
                      </View>
                      <Text style={[styles.accAmount, { width: 80, textAlign: 'right', color: '#2ecc71' }]}>
                        {acc.totalDebit > 0 ? acc.totalDebit.toFixed(2) : '-'}
                      </Text>
                      <Text style={[styles.accAmount, { width: 80, textAlign: 'right', color: '#ef4444' }]}>
                        {acc.totalCredit > 0 ? acc.totalCredit.toFixed(2) : '-'}
                      </Text>
                      <Text style={[styles.accAmount, {
                        width: 80, textAlign: 'right', fontWeight: '700',
                        color: acc.balance >= 0 ? '#2ecc71' : '#ef4444',
                      }]}>
                        {acc.balance >= 0 ? '+' : ''}{acc.balance.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={[styles.totalCard, { backgroundColor: colors.cardBg, borderTopColor: accentColor, borderTopWidth: 2 }]}>
          <Text style={[styles.totalLabel, { color: colors.subText }]}>TOTAUX GÉNÉRAUX</Text>
          <View style={styles.totalRow}>
            <Text style={[styles.totalAmount, { color: '#2ecc71', fontWeight: '700' }]}>
              {trialBalance.totals.totalDebit.toFixed(2)}
            </Text>
            <Text style={[styles.totalAmount, { color: '#ef4444', fontWeight: '700' }]}>
              {trialBalance.totals.totalCredit.toFixed(2)}
            </Text>
            <Text style={[styles.totalAmount, { fontWeight: '700', color: balanced ? '#2ecc71' : '#ef4444' }]}>
              {balanced ? '✓' : '✗'}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold' },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16,
  },
  statusTitle: { fontSize: 15, fontWeight: '700' },
  statusSub: { fontSize: 12, marginTop: 2 },
  emptyCard: { margin: 40, padding: 40, borderRadius: 20, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  classCard: { borderRadius: 16, marginBottom: 10, overflow: 'hidden' },
  classHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, borderBottomWidth: 1, borderBottomColor: 'transparent',
  },
  className: { fontSize: 14, fontWeight: '700', flex: 1 },
  classTotal: { fontSize: 12, fontWeight: '600' },
  colHeaders: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, gap: 4,
  },
  colHeader: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  accRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 0.5, gap: 4,
  },
  accCode: { fontSize: 12, fontWeight: '700' },
  accLabel: { fontSize: 12, flex: 1 },
  accAmount: { fontSize: 12, fontWeight: '600' },
  totalCard: { padding: 14, borderRadius: 14, marginTop: 6 },
  totalLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-around' },
  totalAmount: { fontSize: 16 },
});
