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
import { BarChart, PieChart } from 'react-native-chart-kit'; 
import { Dropdown } from 'react-native-element-dropdown'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFinance } from '../context/FinanceContext';
import { LanguageManager, useTranslation } from './LanguageManager'; 
import {
  isTransactionInLastNDays,
  isTransactionInCurrentWeek,
  isTransactionInMonth,
} from '../utils/transactionDates';

const SCREEN_W = Dimensions.get('window').width;

const PERIODS = [
  { key: '7j',      label: '7 jours' },
  { key: 'semaine', label: 'Semaine' },
  { key: 'mois',    label: 'Mois' },
  { key: 'personalisé',   label: 'Personalisé' },
];

const NETWORK_COLORS = ['#ff9f43', '#0abde3', '#10ac84', '#ee5253', '#5f27cd', '#341f97'];

export default function StatsScreen() {
  const { transactions, isDark, accentColor } = useFinance();
  const { currentLanguage } = useTranslation(); 
  
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

    if (period === 'personalisé') { 
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

  // ── Synthèse financière (Affichage ajusté en FCFA) ──
  const totalIncome   = filtered.filter((t) => t.type === 'income' && t.category !== 'Emprunt').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const totalExpenses = filtered.filter((t) => t.type === 'expense' && t.category !== 'Remboursement').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  // ── Suivi spécifique des Prêts & Dettes ─────────────────────────────────
  const totalBorrowed = filtered.filter((t) => t.type === 'income' && t.category === 'Emprunt').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const totalRepaid   = filtered.filter((t) => t.type === 'expense' && t.category === 'Remboursement').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const debtStatus    = totalBorrowed - totalRepaid;

  // ── 🍩 Logique de calcul des frais de retrait mobiles par réseau ───────
  const networkFeesMap = {};
  let totalWithdrawalFees = 0;

  filtered.forEach((t) => {
    if (t.momoFee && t.momoFee > 0) {
      const network = t.momoNetwork || 'Autre';
      networkFeesMap[network] = (networkFeesMap[network] || 0) + Math.abs(t.momoFee);
      totalWithdrawalFees += Math.abs(t.momoFee);
    } 
    else if (t.category === 'Retrait MoMo' || t.category === 'Frais & Retraits') {
      const network = t.momoNetwork || 'Mobile Money';
      const estimatedFee = t.momoFee || 0;
      if (estimatedFee > 0) {
        networkFeesMap[network] = (networkFeesMap[network] || 0) + Math.abs(estimatedFee);
        totalWithdrawalFees += Math.abs(estimatedFee);
      }
    }
  });

  const sortedNetworkFees = Object.entries(networkFeesMap).sort((a, b) => b[1] - a[1]);

  const withdrawalPieData = sortedNetworkFees.map(([network, amount], index) => ({
    name: network,
    amount: Math.round(amount),
    color: NETWORK_COLORS[index % NETWORK_COLORS.length],
    legendFontColor: colors.text,
    legendFontSize: 12,
  }));

  // ── 📊 NOUVEAU : Logique Activité des dépenses (7 derniers jours - Style Facebook) ──
  const getDailyExpenseStats = () => {
    const dailyLabels = [];
    const dailyValues = [];
    
    // Dictionnaires de traduction abrégée des jours
    const dayNames = {
      fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
      en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    };
    const currentLabels = dayNames[currentLanguage] || dayNames['fr'];

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      
      // Label du jour concerné
      dailyLabels.push(currentLabels[targetDate.getDay()]);

      // Somme des dépenses sur ce jour précis
      const totalForDay = safeTransactions
        .filter((t) => {
          if (t.type !== 'expense' || t.category === 'Remboursement' || !t.date) return false;
          return new Date(t.date).toDateString() === targetDate.toDateString();
        })
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

      dailyValues.push(Math.round(totalForDay));
    }

    return {
      labels: dailyLabels,
      datasets: [{ data: dailyValues }]
    };
  };

  const dailyExpenseData = getDailyExpenseStats();
  const hasDailyExpenses = dailyExpenseData.datasets[0].data.some(v => v > 0);

  // ── Top 5 catégories de dépenses ──
  const categoryMap = {};
  filtered
    .filter((t) => t.type === 'expense' && t.category !== 'Remboursement')
    .forEach((t) => {
      const cat = t.category || 'Général';
      categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(t.amount || 0);
    });

  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const chartLabels = topCategories.length > 0
    ? topCategories.map(([k]) => (k.length > 7 ? k.slice(0, 6) + '.' : k))
    : [currentLanguage === 'en' ? 'None' : (currentLanguage === 'es' ? 'Ninguna' : 'Aucune')];

  const chartValues = topCategories.length > 0
    ? topCategories.map(([, v]) => Math.max(1, Math.round(v)))
    : [0];

  const hexToRgb = (hex) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r
      ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}`
      : '59, 130, 246';
  };

  // Configuration graphique globale
  const chartConfig = {
    backgroundColor:        isDark ? '#16171f' : '#ffffff',
    backgroundGradientFrom: isDark ? '#16171f' : '#ffffff',
    backgroundGradientTo:   isDark ? '#16171f' : '#ffffff',
    decimalPlaces: 0,
    color:       (opacity = 1) => `rgba(${hexToRgb(accentColor)}, ${opacity})`,
    labelColor:  () => colors.subText,
    propsForBackgroundLines: { stroke: colors.line, strokeDasharray: '' },
  };

  // Configuration spécifique pour les dépenses quotidiennes (Barres Rouges)
  const dailyChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(255, 92, 92, ${opacity})`, // Force le rouge de la dépense
  };

  const chartWidth = SCREEN_W - 40;
  const localeDateStr = currentLanguage === 'en' ? 'en-US' : (currentLanguage === 'es' ? 'es-ES' : 'fr-FR');

  const dropdownData = PERIODS.map(p => {
    let fallbackLabel = p.label;
    if (currentLanguage === 'en') {
      if (p.key === '7j') fallbackLabel = '7 Days';
      if (p.key === 'semaine') fallbackLabel = 'Week';
      if (p.key === 'mois') fallbackLabel = 'Month';
      if (p.key === 'personalisé') fallbackLabel = 'Custom';
    } else if (currentLanguage === 'es') {
      if (p.key === '7j') fallbackLabel = '7 días';
      if (p.key === 'semaine') fallbackLabel = 'Semana';
      if (p.key === 'mois') fallbackLabel = 'Mes';
      if (p.key === 'personalisé') fallbackLabel = 'Personalizado';
    }
    return {
      label: LanguageManager.t(p.key) || fallbackLabel,
      value: p.key
    };
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {LanguageManager.t('statsTitle') || (currentLanguage === 'en' ? 'Reports & Analytics' : (currentLanguage === 'es' ? 'Balances y Análisis' : 'Bilans & Analyses'))}
        </Text>

        {/* ── Ligne de sélection ─────── */}
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
            <Text style={[styles.dayButtonText, { color: period === 'jour' ? '#fff' : colors.text }]}>
              {LanguageManager.t('jour') || (currentLanguage === 'en' ? 'Day' : (currentLanguage === 'es' ? 'Día' : 'Jour'))}
            </Text>
          </TouchableOpacity>

          <Dropdown
            style={[
              styles.dropdown, 
              { 
                backgroundColor: colors.card, 
                borderColor: period !== 'jour' ? accentColor : colors.border,
                borderWidth: period !== 'jour' ? 1.5 : 1
              }
            ]}
            placeholderStyle={[styles.placeholderStyle, { color: colors.subText }]}
            selectedTextStyle={[styles.selectedTextStyle, { color: period !== 'jour' ? colors.text : colors.subText }]}
            containerStyle={[styles.dropdownContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
            itemTextStyle={{ color: colors.text }}
            activeColor={colors.inputBg}
            data={dropdownData}
            labelField="label"
            valueField="value"
            placeholder={period === 'jour' ? (currentLanguage === 'en' ? "Other period..." : (currentLanguage === 'es' ? "Otro período..." : "Autre période...")) : undefined}
            value={period === 'jour' ? null : period}
            onChange={(item) => setPeriod(item.value)}
          />
        </View>

        {/* Bloc personnalisé (Du / Au) */}
        {period === 'personalisé' && (
          <View style={[styles.customDateContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={[styles.dateSelectorBtn, { backgroundColor: colors.bg }]} onPress={() => setShowStartPicker(true)}>
              <Text style={[styles.dateSelectorLabel, { color: colors.subText }]}>
                {currentLanguage === 'en' ? 'Start' : (currentLanguage === 'es' ? 'Inicio' : 'Début')}
              </Text>
              <Text style={[styles.dateSelectorValue, { color: colors.text }]}>{startDate.toLocaleDateString(localeDateStr)}</Text>
            </TouchableOpacity>
            <View style={[styles.dateSeparator, { backgroundColor: colors.line }]} />
            <TouchableOpacity style={[styles.dateSelectorBtn, { backgroundColor: colors.bg }]} onPress={() => setShowEndPicker(true)}>
              <Text style={[styles.dateSelectorLabel, { color: colors.subText }]}>
                {currentLanguage === 'en' ? 'End' : (currentLanguage === 'es' ? 'Fin' : 'Fin')}
              </Text>
              <Text style={[styles.dateSelectorValue, { color: colors.text }]}>{endDate.toLocaleDateString(localeDateStr)}</Text>
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

        {/* ── Synthèse financière (FCFA) ────────────────────────────────────────── */}
        <View style={styles.row}>
          <View style={[styles.halfCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.subText }]}>
              {currentLanguage === 'en' ? '▲ Income' : (currentLanguage === 'es' ? '▲ Ingresos' : '▲ Revenus')}
            </Text>
            <Text style={[styles.cardValue, { color: '#2ecc71' }]}>
              +{totalIncome.toLocaleString()} F
            </Text>
          </View>
          <View style={[styles.halfCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.subText }]}>
              {currentLanguage === 'en' ? '▼ Expenses' : (currentLanguage === 'es' ? '▼ Gastos' : '▼ Dépenses')}
            </Text>
            <Text style={[styles.cardValue, { color: '#ff5c5c' }]}>
              -{totalExpenses.toLocaleString()} F
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardLabel, { color: colors.subText }]}>
            {currentLanguage === 'en' ? 'Net Balance' : (currentLanguage === 'es' ? 'Saldo Neto' : 'Solde Net')}
          </Text>
          <Text style={[styles.bigValue, { color: balance >= 0 ? '#2ecc71' : '#ff5c5c' }]}>
            {balance >= 0 ? '+' : ''}{balance.toLocaleString()} F
          </Text>
          <Text style={[styles.txCount, { color: colors.subText }]}>
            {filtered.length} {currentLanguage === 'en' ? `transaction${filtered.length !== 1 ? 's' : ''}` : (currentLanguage === 'es' ? `operació${filtered.length !== 1 ? 'nes' : 'n'}` : `opération${filtered.length !== 1 ? 's' : ''}`)}
          </Text>
        </View>

        {/* ── Suivi des Prêts & Dettes (FCFA) ───────────────────────────────── */}
        {(totalBorrowed > 0 || totalRepaid > 0) && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: accentColor, borderWidth: isDark ? 0.5 : 0 }]}>
            <Text style={[styles.cardLabel, { color: accentColor, fontWeight: 'bold', marginBottom: 12 }]}>
              {currentLanguage === 'en' ? 'LOANS & DEBTS TRACKING' : (currentLanguage === 'es' ? 'SEGUIMIENTO DE DEUDAS' : 'SUIVI DES PRÊTS & DETTES')}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.subText }}>
                  {currentLanguage === 'en' ? 'Borrowed' : (currentLanguage === 'es' ? 'Prestado' : 'Emprunté')}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>+{totalBorrowed.toLocaleString()} F</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: colors.subText }}>
                  {currentLanguage === 'en' ? 'Repaid' : (currentLanguage === 'es' ? 'Reembolsado' : 'Remboursé')}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#2ecc71' }}>-{totalRepaid.toLocaleString()} F</Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                {currentLanguage === 'en' ? 'Remaining Debt:' : (currentLanguage === 'es' ? 'Deuda Restante:' : 'Reste à rembourser :')}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: debtStatus > 0 ? '#ff5c5c' : '#2ecc71' }}>
                {debtStatus.toLocaleString()} F
              </Text>
            </View>
          </View>
        )}

        {/* ── Anneau des frais de retrait (FCFA) ─────────────────── */}
        {totalWithdrawalFees > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: '#ff9f43', borderWidth: isDark ? 0.5 : 0 }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.cardLabel, { color: '#ff9f43', fontWeight: 'bold' }]}>
                {currentLanguage === 'en' ? 'MOBILE WITHDRAWAL FEES' : (currentLanguage === 'es' ? 'COMISIONES DE RETIRO MÓVIL' : 'FRAIS DE RETRAIT MOBILES')}
              </Text>
              <Text style={[styles.feeTotalValue, { color: colors.text }]}>
                {totalWithdrawalFees.toLocaleString()} F
              </Text>
            </View>
            <View style={styles.chartContainer}>
              <PieChart
                data={withdrawalPieData}
                width={SCREEN_W - 50}
                height={140}
                chartConfig={chartConfig}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                hasLegend={true}
                avoidFalseZero={true}
                innerRadius="60%"
              />
            </View>
          </View>
        )}

        {/* ── État vide ──────────────────────────────────────────────────── */}
        {filtered.length === 0 && (
          <View style={[styles.card, styles.emptyCard, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              {currentLanguage === 'en' ? 'No transactions for this period.' : (currentLanguage === 'es' ? 'No hay transacciones para este período.' : 'Aucune transaction pour cette période.') }
            </Text>
          </View>
        )}

        {/* ── 📊 NOUVEAU CHART : ACTIVITÉ DES DÉPENSES (7j - Style Facebook / Creator Studio) ── */}
        {hasDailyExpenses && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: '#ff5c5c', borderWidth: isDark ? 0.3 : 0 }]}>
            <Text style={[styles.cardLabel, { color: '#ff5c5c', marginBottom: 16 }]}>
              {currentLanguage === 'en' ? 'DAILY EXPENSE ACTIVITY (7D)' : (currentLanguage === 'es' ? 'ACTIVIDAD DE GASTOS DIARIOS (7D)' : 'ACTIVITÉ DES DÉPENSES QUOTIDIENNES (7J)')}
            </Text>
            <BarChart
              data={dailyExpenseData}
              width={chartWidth}
              height={180}
              chartConfig={dailyChartConfig}
              style={styles.chart}
              showValuesOnTopOfBars
              fromZero
              withInnerLines={false}
            />
          </View>
        )}

        {/* ── Top Catégories par barres ────────────────────────────────────────── */}
        {topCategories.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.subText, marginBottom: 16 }]}>
              {LanguageManager.t('chartTitle') || (currentLanguage === 'en' ? 'EXPENSES BY CATEGORY' : (currentLanguage === 'es' ? 'GASTOS POR CATEGORÍA' : 'DÉPENSES PAR CATÉGORIE'))}
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

        {/* ── Répartition du budget par lignes de progression ─────────────────────────────────────── */}
        {topCategories.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.subText, marginBottom: 16 }]}>
              {LanguageManager.t('distributionTitle') || (currentLanguage === 'en' ? 'BUDGET DISTRIBUTION' : (currentLanguage === 'es' ? 'DISTRIBUCIÓN DEL PRESUPUESTO' : 'RÉPARTITION DU BUDGET'))}
            </Text>
            {topCategories.map(([cat, val]) => {
              const pct = totalExpenses > 0
                ? Math.round((val / totalExpenses) * 100)
                : 0;
              return (
                <View key={cat} style={styles.catRow}>
                  <Text style={[styles.catName, { color: colors.text }]} numberOfLines={1}>
                    {cat}
                  </Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.line }]}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: accentColor }]} />
                  </View>
                  <Text style={[styles.catPct, { color: colors.subText }]}>
                    {pct}%
                  </Text>
                  <Text style={[styles.catAmt, { color: colors.subText }]}>
                    {val.toLocaleString()} F
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
  cardValue: { fontSize: 18, fontWeight: 'bold', marginTop: 8 },
  bigValue:  { fontSize: 28, fontWeight: 'bold', marginTop: 8 },
  txCount:   { fontSize: 12, fontWeight: '500', marginTop: 6 },
  chart: { borderRadius: 16, marginLeft: -15 },
  catRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  catName: { width: 80, fontSize: 12, fontWeight: '600' },
  barTrack:{ flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  catPct:  { width: 30, textAlign: 'right', fontSize: 11 },
  catAmt:  { width: 65, textAlign: 'right', fontSize: 11, fontWeight: '500' },
  emptyCard:  { alignItems: 'center', paddingVertical: 30 },
  emptyText:  { fontSize: 14, textAlign: 'center' },
  
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartContainer: { alignItems: 'center', marginTop: 10, justifyContent: 'center' },
  feeTotalValue: { fontSize: 16, fontWeight: 'bold' },
});