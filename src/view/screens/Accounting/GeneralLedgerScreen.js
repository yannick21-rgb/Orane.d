import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, Search, ArrowLeft, X } from 'lucide-react-native';
import { useFinance } from '../../../viewmodel/FinanceContext';
import { useAccounting } from '../../../viewmodel/AccountingContext';
import { getLedgerSummary } from '../../../model/accounting/GeneralLedger';
import { getAccountByCode } from '../../../model/accounting/ChartOfAccounts';

export default function GeneralLedgerScreen({ navigation, onClose }) {
  const { isDark, accentColor } = useFinance();
  const { getLedger, getLedgerSummaryData, entries } = useAccounting();
  const [searchCode, setSearchCode] = useState('');
  const [selectedCode, setSelectedCode] = useState(null);

  const colors = {
    bg: isDark ? '#0f1015' : '#f5f6fa',
    cardBg: isDark ? '#16171f' : '#ffffff',
    text: isDark ? '#ffffff' : '#131419',
    subText: isDark ? '#8c8e9b' : '#6a6c7a',
    border: isDark ? '#2a2b38' : '#e8eaef',
    inputBg: isDark ? '#1c1d28' : '#f0f1f6',
  };

  const summary = useMemo(() => getLedgerSummaryData(), [entries]);

  const ledger = useMemo(() => {
    if (selectedCode) return getLedger(selectedCode);
    return getLedger();
  }, [entries, selectedCode, getLedger]);

  const filteredLedger = useMemo(() => {
    if (!searchCode.trim() || selectedCode) return ledger;
    const q = searchCode.toLowerCase();
    return ledger.filter(
      (a) => a.accountCode.includes(q) || a.accountLabel.toLowerCase().includes(q)
    );
  }, [ledger, searchCode, selectedCode]);

  const selectedAccount = selectedCode ? getAccountByCode(selectedCode) : null;

  if (selectedCode) {
    const accountLedger = ledger;
    const account = accountLedger[0];

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => setSelectedCode(null)}
          >
            <ArrowLeft size={18} color={accentColor} />
            <Text style={[styles.backText, { color: accentColor }]}>Retour au grand livre</Text>
          </TouchableOpacity>

          <View style={[styles.card, { backgroundColor: colors.cardBg, borderLeftColor: accentColor, borderLeftWidth: 3 }]}>
            <Text style={[styles.accountTitle, { color: colors.text }]}>
              {account?.accountCode} — {account?.accountLabel}
            </Text>
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: colors.subText }]}>Solde</Text>
              <Text style={[styles.balanceValue, { color: account?.balance >= 0 ? '#2ecc71' : '#ef4444' }]}>
                {account?.balance >= 0 ? '+' : ''}{account?.balance.toFixed(2)}
              </Text>
            </View>
          </View>

          {account?.lines.map((line, i) => (
            <View key={i} style={[styles.lineCard, { backgroundColor: colors.cardBg }]}>
              <View style={styles.lineHeader}>
                <Text style={[styles.lineDate, { color: colors.subText }]}>{line.date}</Text>
                <Text style={[styles.lineRef, { color: colors.subText }]}>{line.reference}</Text>
              </View>
              <Text style={[styles.lineDesc, { color: colors.text }]}>{line.description}</Text>
              <View style={styles.lineAmounts}>
                {line.debit > 0 && (
                  <Text style={[styles.amount, { color: '#2ecc71' }]}>Débit: {line.debit.toFixed(2)}</Text>
                )}
                {line.credit > 0 && (
                  <Text style={[styles.amount, { color: '#ef4444' }]}>Crédit: {line.credit.toFixed(2)}</Text>
                )}
                <Text style={[styles.runningBalance, { color: colors.text }]}>
                  Cumul: {line.runningBalance.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <BookOpen size={22} color={accentColor} />
          <Text style={[styles.title, { color: colors.text, flex: 1 }]}>Grand livre</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.subText} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.summaryTitle, { color: colors.subText }]}>RÉCAPITULATIF</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>Comptes mouvementés</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{summary.accountCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>Total débits</Text>
            <Text style={[styles.summaryValue, { color: '#2ecc71' }]}>{summary.totalDebit.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.subText }]}>Total crédits</Text>
            <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{summary.totalCredit.toFixed(2)}</Text>
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Search size={16} color={colors.subText} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchCode}
            onChangeText={setSearchCode}
            placeholder="Filtrer par compte..."
            placeholderTextColor={colors.subText}
          />
        </View>

        {filteredLedger.map((account) => (
          <TouchableOpacity
            key={account.accountCode}
            style={[styles.accountCard, { backgroundColor: colors.cardBg }]}
            onPress={() => setSelectedCode(account.accountCode)}
            activeOpacity={0.7}
          >
            <View style={styles.accountRow}>
              <Text style={[styles.accountCode, { color: accentColor }]}>{account.accountCode}</Text>
              <Text style={[styles.accountLabel, { color: colors.text }]} numberOfLines={1}>
                {account.accountLabel}
              </Text>
            </View>
            <View style={styles.accountTotals}>
              <Text style={[styles.accountTotal, { color: '#2ecc71' }]}>
                D: {account.totalDebit.toFixed(2)}
              </Text>
              <Text style={[styles.accountTotal, { color: '#ef4444' }]}>
                C: {account.totalCredit.toFixed(2)}
              </Text>
              <Text style={[styles.accountBalance, {
                color: account.balance >= 0 ? '#2ecc71' : '#ef4444',
              }]}>
                S: {account.balance >= 0 ? '+' : ''}{account.balance.toFixed(2)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

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
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { fontSize: 14, fontWeight: '600' },
  summaryCard: { padding: 16, borderRadius: 16, marginBottom: 16 },
  summaryTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
    marginBottom: 14, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0 },
  accountCard: { padding: 14, borderRadius: 16, marginBottom: 8 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  accountCode: { fontSize: 15, fontWeight: '700' },
  accountLabel: { fontSize: 14, flex: 1 },
  accountTotals: { flexDirection: 'row', gap: 14 },
  accountTotal: { fontSize: 12, fontWeight: '600' },
  accountBalance: { fontSize: 13, fontWeight: '700', marginLeft: 'auto' },
  card: { padding: 16, borderRadius: 16, marginBottom: 14 },
  accountTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  balanceValue: { fontSize: 22, fontWeight: 'bold' },
  lineCard: { padding: 12, borderRadius: 12, marginBottom: 6 },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  lineDate: { fontSize: 11 },
  lineRef: { fontSize: 11 },
  lineDesc: { fontSize: 13, marginBottom: 4 },
  lineAmounts: { flexDirection: 'row', gap: 12 },
  amount: { fontSize: 12, fontWeight: '600' },
  runningBalance: { fontSize: 12, fontWeight: '700', marginLeft: 'auto' },
});
