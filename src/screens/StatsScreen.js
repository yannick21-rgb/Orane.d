import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Dropdown } from 'react-native-element-dropdown'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFinance } from '../context/FinanceContext';
import { LanguageManager } from './LanguageManager'; 
import {
  isTransactionInLastNDays,
  isTransactionInCurrentWeek,
  isTransactionInMonth,
} from '../utils/transactionDates';

const SCREEN_W = Dimensions.get('window').width;

// 🚀 Le "jour" est retiré d'ici pour être géré séparément en visuel
const PERIODS = [
  { key: '7j',      label: '7 jours' },
  { key: 'semaine', label: 'Semaine' },
  { key: 'mois',    label: 'Mois' },
  { key: 'perso',   label: 'Perso' },
  { key: 'tout',    label: 'Tout' },
];

export default function StatsScreen() {
  const { transactions, isDark, accentColor, locale } = useFinance();
  const [period, setPeriod] = useState('mois');

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const colors = {
    bg:      isDark ? '#0f1015' : '#f5f6fa',
    card:    isDark ? '#16171f' : '#ffffff',
    text:    isDark ? '#ffffff' : '#131419',
    subText: isDark ? '#8c8e9b' : '#6a6c7a',
    line:    isDark ? '#222431' : '#eef0f5',
    inputBg: isDark ? '#1c1d28' : '#f0f1f6',
    border:  isDark ? '#2a2b38' : '#e8eaef',
  };

  const safeTransactions = Array.isArray(transactions)
    ? transactions.filter(Boolean)
    : [];

  // ── Filtrage par période ────────────────────────────────────────────────
  const filtered = safeTransactions.filter((t) => {
    if (!t.date) return false;

    if (period === 'perso') {
      const tDate = new Date(t.date).getTime();
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      return tDate >= start && tDate <= end;
    }
    if (period === 'jour') {
      const tDate = new Date(t.date).toDateString();
      const today = new Date().toDateString();
      return tDate === today;
    }
    if (period === '7j')      return isTransactionInLastNDays(t, 7);
    if (period === 'semaine') return isTransactionInCurrentWeek(t);
    if (period === 'mois')    return isTransactionInMonth(t);
    return true;
  });

  const totalIncome   = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const totalExpenses = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  // ── Top 5 catégories de dépenses ───────────────────────────────────────
  const categoryMap = {};
  filtered
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const cat = t.category || 'Général';
      categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(t.amount || 0);
    });

  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const chartLabels = topCategories.length > 0
    ? topCategories.map(([k]) => (k.length > 7 ? k.slice(0, 6) + '.' : k))
    : ['Aucune'];

  const chartValues = topCategories.length > 0
    ? topCategories.map(([, v]) => Math.max(1, Math.round(v)))
    : [0];

  const hexToRgb = (hex) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r
      ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}`
      : '59, 130, 246';
  };

  const chartConfig = {
    backgroundColor:        isDark ? '#16171f' : '#ffffff',
    backgroundGradientFrom: isDark ? '#16171f' : '#ffffff',
    backgroundGradientTo:   isDark ? '#16171f' : '#ffffff',
    decimalPlaces: 0,
    color:       (opacity = 1) => `rgba(${hexToRgb(accentColor)}, ${opacity})`,
    labelColor:  () => colors.subText,
    propsForBackgroundLines: { stroke: colors.line, strokeDasharray: '' },
  };

  const chartWidth = SCREEN_W - 40;

  const dropdownData = PERIODS.map(p => ({
    label: LanguageManager.t(p.key) || p.label,
    value: p.key
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {LanguageManager.t('statsTitle') || 'Bilans & Analyses'}
        </Text>

        {/* ── Ligne de sélection (Bouton Jour fixe + Dropdown reste) ─────── */}
        <View style={styles.selectionRow}>
          <TouchableOpacity
            style={[
              styles.dayButton,
              { 
                backgroundColor: period === 'jour' ? accentColor : colors.card,
                borderColor: colors.border
              },
            ]}
            onPress={() => setPeriod('jour')}
          >
            <Text
              style={[
                styles.dayButtonText,
                { color: period === 'jour' ? '#fff' : colors.text },
              ]}
            >
              {LanguageManager.t('jour') || 'Jour'}
            </Text>
          </TouchableOpacity>

          <Dropdown
            style={[
              styles.dropdown, 
              { 
                backgroundColor: period !== 'jour' ? colors.card : colors.card, 
                borderColor: period !== 'jour' ? accentColor : colors.border,
                borderWidth: period !== 'jour' ? 1.5 : 1
              }
            ]}
            placeholderStyle={[styles.placeholderStyle, { color: colors.subText }]}
            selectedTextStyle={[
              styles.selectedTextStyle, 
              { color: period !== 'jour' ? colors.text : colors.subText }
            ]}
            containerStyle={[styles.dropdownContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
            itemTextStyle={{ color: colors.text }}
            activeColor={colors.inputBg}
            data={dropdownData}
            labelField="label"
            valueField="value"
            placeholder={period === 'jour' ? "Autre période..." : undefined}
            value={period === 'jour' ? null : period}
            onChange={(item) => setPeriod(item.value)}
          />
        </View>

        {/* Bloc personnalisé (Du / Au) */}
        {period === 'perso' && (
          <View style={[styles.customDateContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity 
              style={[styles.dateSelectorBtn, { backgroundColor: colors.bg }]} 
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={[styles.dateSelectorLabel, { color: colors.subText }]}>Début</Text>
              <Text style={[styles.dateSelectorValue, { color: colors.text }]}>{startDate.toLocaleDateString('fr-FR')}</Text>
            </TouchableOpacity>

            <View style={[styles.dateSeparator, { backgroundColor: colors.line }]} />

            <TouchableOpacity 
              style={[styles.dateSelectorBtn, { backgroundColor: colors.bg }]} 
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={[styles.dateSelectorLabel, { color: colors.subText }]}>Fin</Text>
              <Text style={[styles.dateSelectorValue, { color: colors.text }]}>{endDate.toLocaleDateString('fr-FR')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartPicker(false);
              if (selectedDate) setStartDate(selectedDate);
            }}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndPicker(false);
              if (selectedDate) setEndDate(selectedDate);
            }}
          />
        )}

        {/* ── Synthèse financière ────────────────────────────────────────── */}
        <View style={styles.row}>
          <View style={[styles.halfCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.subText }]}>▲ Revenus</Text>
            <Text style={[styles.cardValue, { color: '#2ecc71' }]}>
              +{totalIncome.toFixed(2)} €
            </Text>
          </View>
          <View style={[styles.halfCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.subText }]}>▼ Dépenses</Text>
            <Text style={[styles.cardValue, { color: '#ff5c5c' }]}>
              -{totalExpenses.toFixed(2)} €
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardLabel, { color: colors.subText }]}>Solde Net</Text>
          <Text style={[styles.bigValue, { color: balance >= 0 ? '#2ecc71' : '#ff5c5c' }]}>
            {balance >= 0 ? '+' : ''}{balance.toFixed(2)} €
          </Text>
          <Text style={[styles.txCount, { color: colors.subText }]}>
            {filtered.length} opération{filtered.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* ── État vide ──────────────────────────────────────────────────── */}
        {filtered.length === 0 && (
          <View style={[styles.card, styles.emptyCard, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              Aucune transaction pour cette période.
            </Text>
          </View>
        )}

        {/* ── Graphique en barres ────────────────────────────────────────── */}
        {topCategories.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.subText, marginBottom: 16 }]}>
              {LanguageManager.t('chartTitle') || 'DÉPENSES PAR CATÉGORIE'}
            </Text>
            <BarChart
              data={{ labels: chartLabels, datasets: [{ data: chartValues }] }}
              width={chartWidth}
              height={180}
              chartConfig={chartConfig}
              style={styles.chart}
              showValuesOnTopOfBars
              fromZero
              withInnerLines={false}
            />
          </View>
        )}

        {/* ── Répartition du budget ─────────────────────────────────────── */}
        {topCategories.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.subText, marginBottom: 16 }]}>
              {LanguageManager.t('distributionTitle') || 'RÉPARTITION DU BUDGET'}
            </Text>
            {topCategories.map(([cat, val]) => {
              const pct = totalExpenses > 0
                ? Math.round((val / totalExpenses) * 100)
                : 0;
              return (
                <View key={cat} style={styles.catRow}>
                  <Text
                    style={[styles.catName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {cat}
                  </Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.line }]}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${pct}%`, backgroundColor: accentColor },
                      ]}
                    />
                  </View>
                  <Text style={[styles.catPct, { color: colors.subText }]}>
                    {pct}%
                  </Text>
                  <Text style={[styles.catAmt, { color: colors.subText }]}>
                    {val.toFixed(0)} €
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  scrollContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  headerTitle:    { fontSize: 32, fontWeight: 'bold', marginTop: 10, marginBottom: 16 },

  // 🚀 Alignement côte à côte du bouton "Jour" et du Dropdown
  selectionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  dayButton: {
    paddingHorizontal: 20,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dropdown: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  dropdownContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  placeholderStyle: { fontSize: 14 },
  selectedTextStyle: { fontSize: 14, fontWeight: '600' },

  customDateContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20, marginBottom: 16, gap: 10 },
  dateSelectorBtn:     { flex: 1, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center' },
  dateSelectorLabel:   { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  dateSelectorValue:   { fontSize: 14, fontWeight: 'bold' },
  dateSeparator:       { width: 1, height: 30 },

  row:      { flexDirection: 'row', gap: 12, marginBottom: 12 },
  halfCard: { flex: 1, padding: 20, borderRadius: 24 },
  card:     { padding: 20, borderRadius: 24, marginBottom: 12 },

  cardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  cardValue: { fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  bigValue:  { fontSize: 28, fontWeight: 'bold', marginTop: 8 },
  txCount:   { fontSize: 12, fontWeight: '500', marginTop: 6 },

  chart: { borderRadius: 16, marginLeft: -15 },

  catRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  catName: { width: 80, fontSize: 12, fontWeight: '600' },
  barTrack:{ flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  catPct:  { width: 30, textAlign: 'right', fontSize: 11 },
  catAmt:  { width: 48, textAlign: 'right', fontSize: 12, fontWeight: '500' },

  emptyCard:  { alignItems: 'center', paddingVertical: 30 },
  emptyText:  { fontSize: 14, textAlign: 'center' },
});