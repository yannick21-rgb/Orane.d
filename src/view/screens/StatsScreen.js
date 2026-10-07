import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// ✅ BUG #1 CORRIGÉ : BarChart ajouté à l'import (provoquait un crash "BarChart is not defined")
import { PieChart, BarChart } from 'react-native-chart-kit';
// ✅ BUG #4b CORRIGÉ : Rect retiré (importé mais jamais utilisé → warning inutile)
import Svg, { Path, Defs, LinearGradient, Stop, Line, Text as SvgText, G } from 'react-native-svg';
import { Dropdown } from 'react-native-element-dropdown';
import CrossPlatformDatePicker from '../components/CrossPlatformDatePicker';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useTranslation } from '../../utils/LanguageManager';
import { toNumber } from '../../utils/format';
import { computeIncomeExpenseTotals } from '../../utils/transactionTotals';
import { useResponsive } from '../../utils/responsive';
import { radius } from '../theme/tokens';
import {
  isTransactionInLastNDays,
  isTransactionInCurrentWeek,
  isTransactionInMonth,
} from '../../utils/transactionDates';
import { useColors } from '../theme';

const PERIODS = [
  { key: '7j',           label: '7 jours'      },
  { key: 'semaine',      label: 'Semaine'       },
  { key: 'mois',         label: 'Mois'          },
  { key: 'personalisé',  label: 'Personalisé'   },
];

export default function StatsScreen() {
  const { transactions, isDark, accentColor, devise, isDiscreteMode } = useFinance();
  const { t, currentLanguage } = useTranslation();
  const { contentMaxWidth, contentPadding, cardPadding, borderRadius, chartWidth: responsiveChartWidth } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding, cardPadding, borderRadius);
  const deviseSymbol = devise?.split(' ')[0] || 'F';

  const [period, setPeriod]                   = useState('mois');
  const [startDate, setStartDate]             = useState(new Date());
  const [endDate, setEndDate]                 = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker]     = useState(false);

  const colors = useColors();

  // Palette du graphique en fees : dérivée du thème (accent + sémantiques).
  const NETWORK_COLORS = [
    colors.accent,
    colors.income,
    colors.warning,
    colors.expense,
    colors.transfer,
    colors.inkMid,
  ];

  const safeTransactions = Array.isArray(transactions)
    ? transactions.filter(Boolean)
    : [];

  // ── Filtrage par période ──────────────────────────────────────────────────
  const filtered = useMemo(() => safeTransactions.filter((t) => {
    if (!t.date) return false;
    if (period === 'personalisé') {
      const tDate = new Date(t.date).getTime();
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      const end   = new Date(endDate).setHours(23, 59, 59, 999);
      return tDate >= start && tDate <= end;
    }
    if (period === 'jour') {
      return new Date(t.date).toDateString() === new Date().toDateString();
    }
    if (period === '7j')      return isTransactionInLastNDays(t, 7);
    if (period === 'semaine') return isTransactionInCurrentWeek(t);
    if (period === 'mois')    return isTransactionInMonth(t);
    return true;
  }), [safeTransactions, period, startDate, endDate]);

  // ── Synthèse financière ───────────────────────────────────────────────────
  const { totalIncome, totalExpenses } = computeIncomeExpenseTotals(filtered);
  const balance       = totalIncome - totalExpenses;

  // ── Prêts & Dettes ────────────────────────────────────────────────────────
  const totalBorrowed = filtered.filter((t) => (t.type === 'income' || t.type === 'revenu') && t.category === 'Emprunt').reduce((s, t) => s + Math.abs(toNumber(t.amount)), 0);
  const totalRepaid   = filtered.filter((t) => (t.type === 'expense' || t.type === 'depense') && t.category === 'Remboursement').reduce((s, t) => s + Math.abs(toNumber(t.amount)), 0);
  const debtStatus    = totalBorrowed - totalRepaid;

  // ── Frais de retrait MoMo ─────────────────────────────────────────────────
  const networkFeesMap = {};
  let totalWithdrawalFees = 0;

  filtered.forEach((t) => {
    let fee = 0;
    let network = t.momoNetwork || 'Autre';
    if (t.type === 'transfert' && toNumber(t.momoFee) > 0) {
      fee = toNumber(t.momoFee);
    } else if (t.category === 'Frais & Retraits') {
      fee = toNumber(t.amount);
      if (t.momoNetwork) network = t.momoNetwork;
    }
    if (fee > 0) {
      networkFeesMap[network] = (networkFeesMap[network] || 0) + fee;
      totalWithdrawalFees += fee;
    }
  });

  const sortedNetworkFees = Object.entries(networkFeesMap).sort((a, b) => b[1] - a[1]);
  const withdrawalPieData = sortedNetworkFees.map(([network, amount], index) => ({
    name:            network,
    amount:          Math.round(amount),
    color:           NETWORK_COLORS[index % NETWORK_COLORS.length],
    legendFontColor: colors.text,
    legendFontSize:  12,
  }));

  // ── Activité des dépenses (7 derniers jours) ──────────────────────────────
  const dailyExpenseData = useMemo(() => {
    const dayNames = {
      fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
      en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    };
    const labels = dayNames[currentLanguage] || dayNames['fr'];
    const dailyLabels = [];
    const dailyValues = [];

    for (let i = 6; i >= 0; i--) {
      const target = new Date();
      target.setDate(target.getDate() - i);
      dailyLabels.push(labels[target.getDay()]);
      dailyValues.push(
        Math.round(
          safeTransactions
            .filter((t) =>
              (t.type === 'expense' || t.type === 'depense') &&
              t.category !== 'Remboursement' &&
              t.date &&
              new Date(t.date).toDateString() === target.toDateString()
            )
            .reduce((sum, t) => sum + Math.abs(toNumber(t.amount)), 0)
        )
      );
    }
    return { labels: dailyLabels, datasets: [{ data: dailyValues }] };
  }, [safeTransactions, currentLanguage]);
  const hasDailyExpenses = dailyExpenseData.datasets[0].data.some(v => v > 0);

  // ── Top 5 catégories ──────────────────────────────────────────────────────
  const categoryMap = {};
  filtered
    .filter((t) => (t.type === 'expense' || t.type === 'depense') && t.category !== 'Remboursement')
    .forEach((t) => {
      const cat = t.category || 'Général';
      categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(toNumber(t.amount));
    });

  const topCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const noDataLabel = t('noDataLabel');
  const chartLabels = topCategories.length > 0
    ? topCategories.map(([k]) => (k.length > 7 ? k.slice(0, 6) + '.' : k))
    : [noDataLabel];
  const chartValues = topCategories.length > 0
    ? topCategories.map(([, v]) => Math.max(1, Math.round(v)))
    : [0];

  const hexToRgb = (hex) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}` : '59, 130, 246';
  };

  const chartConfig = {
    backgroundColor:        colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo:   colors.card,
    decimalPlaces: 0,
    color:      (opacity = 1) => `rgba(${hexToRgb(accentColor)}, ${opacity})`,
    labelColor: ()            => colors.subText,
    propsForBackgroundLines: { stroke: colors.line, strokeDasharray: '' },
  };

  // responsiveChartWidth already accounts for padding from useResponsive
  const chartWidth = responsiveChartWidth;

  const localeDateStr = currentLanguage === 'en' ? 'en-US' : (currentLanguage === 'es' ? 'es-ES' : 'fr-FR');

  const dropdownData = PERIODS.map(p => ({
    label: t(p.key),
    value: p.key,
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('statsTitle')}
        </Text>

        {/* ── Sélection de période ─────────────────────────────────────────── */}
        <View style={styles.selectionRow}>
          <TouchableOpacity
            style={[styles.dayButton, { backgroundColor: period === 'jour' ? accentColor : colors.card, borderColor: colors.border }]}
            onPress={() => setPeriod('jour')}
          >
            <Text style={[styles.dayButtonText, { color: period === 'jour' ? colors.accentFg : colors.text }]}>
              {t('jour')}
            </Text>
          </TouchableOpacity>

          <Dropdown
            style={[
              styles.dropdown,
              {
                backgroundColor: colors.card,
                borderColor: period !== 'jour' ? accentColor : colors.border,
                borderWidth: period !== 'jour' ? 1.5 : 1,
              },
            ]}
            placeholderStyle={[styles.placeholderStyle, { color: colors.subText }]}
            selectedTextStyle={[styles.selectedTextStyle, { color: period !== 'jour' ? colors.text : colors.subText }]}
            containerStyle={[styles.dropdownContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
            itemTextStyle={{ color: colors.text }}
            activeColor={colors.inputBg}
            data={dropdownData}
            labelField="label"
            valueField="value"
            placeholder={period === 'jour' ? t('otherPeriodPlaceholder') : undefined}
            value={period === 'jour' ? null : period}
            onChange={(item) => setPeriod(item.value)}
          />
        </View>

        {/* Plage de dates personnalisée */}
        {period === 'personalisé' && (
          <View style={[styles.customDateContainer, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={[styles.dateSelectorBtn, { backgroundColor: colors.bg }]} onPress={() => setShowStartPicker(true)}>
              <Text style={[styles.dateSelectorLabel, { color: colors.subText }]}>{t('startDateLabel')}</Text>
              <Text style={[styles.dateSelectorValue, { color: colors.text }]}>{startDate.toLocaleDateString(localeDateStr)}</Text>
            </TouchableOpacity>
            <View style={[styles.dateSeparator, { backgroundColor: colors.line }]} />
            <TouchableOpacity style={[styles.dateSelectorBtn, { backgroundColor: colors.bg }]} onPress={() => setShowEndPicker(true)}>
              <Text style={[styles.dateSelectorLabel, { color: colors.subText }]}>{t('endDateLabel')}</Text>
              <Text style={[styles.dateSelectorValue, { color: colors.text }]}>{endDate.toLocaleDateString(localeDateStr)}</Text>
            </TouchableOpacity>
          </View>
        )}

        {showStartPicker && (
          <CrossPlatformDatePicker
            value={startDate}
            mode="date"
            isDark={isDark}
            colors={{ inputBg: colors.inputBg, border: colors.border, text: colors.text }}
            onChange={(_, d) => { setShowStartPicker(false); if (d) setStartDate(d); }}
          />
        )}
        {showEndPicker && (
          <CrossPlatformDatePicker
            value={endDate}
            mode="date"
            isDark={isDark}
            colors={{ inputBg: colors.inputBg, border: colors.border, text: colors.text }}
            onChange={(_, d) => { setShowEndPicker(false); if (d) setEndDate(d); }}
          />
        )}

        {/* ── Synthèse financière ───────────────────────────────────────────── */}
        <View style={styles.row}>
          <View style={[styles.halfCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.subText }]}>
              {t('incomeLabel')}
            </Text>
            <Text style={[styles.cardValue, { color: colors.income }]}>+{totalIncome.toLocaleString()} {deviseSymbol}</Text>
          </View>
          <View style={[styles.halfCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.subText }]}>
              {t('expenseLabel')}
            </Text>
            <Text style={[styles.cardValue, { color: colors.expense }]}>-{totalExpenses.toLocaleString()} {deviseSymbol}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardLabel, { color: colors.subText }]}>
            {t('netBalanceLabel')}
          </Text>
          <Text style={[styles.bigValue, { color: balance >= 0 ? colors.income : colors.expense }]}>
            {balance >= 0 ? '+' : ''}{balance.toLocaleString()} {deviseSymbol}
          </Text>
          <Text style={[styles.txCount, { color: colors.subText }]}>
            {filtered.length} {filtered.length > 1 ? t('operationsLabel') : t('operationLabel')}
          </Text>
        </View>

        {/* ── Prêts & Dettes ────────────────────────────────────────────────── */}
        {(totalBorrowed > 0 || totalRepaid > 0) && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: accentColor, borderWidth: isDark ? 0.5 : 0 }]}>
            <Text style={[styles.cardLabel, { color: accentColor, fontWeight: 'bold', marginBottom: 12 }]}>
              {t('suivi_dettes')}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.subText }}>{t('emprunte')}</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>+{totalBorrowed.toLocaleString()} {deviseSymbol}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: colors.subText }}>{t('rembourse')}</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.income }}>-{totalRepaid.toLocaleString()} {deviseSymbol}</Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                {t('reste_rembourser')}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: debtStatus > 0 ? colors.expense : colors.income }}>
                {debtStatus.toLocaleString()} {deviseSymbol}
              </Text>
            </View>
          </View>
        )}

        {/* ── Frais de retrait mobiles (PieChart) ──────────────────────────── */}
        {totalWithdrawalFees > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.warning, borderWidth: isDark ? 0.5 : 0 }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.cardLabel, { color: colors.warning, fontWeight: 'bold' }]}>
                {t('frais_retrait_mobiles')}
              </Text>
              <Text style={[styles.feeTotalValue, { color: colors.text }]}>
                {totalWithdrawalFees.toLocaleString()} {deviseSymbol}
              </Text>
            </View>
            {/* ✅ BUG #3 CORRIGÉ : width unifié via chartWidth (SCREEN_W - 80)
                ✅ BUG #4a CORRIGÉ : innerRadius="60%" retiré (prop non supportée par react-native-chart-kit) */}
            <View style={styles.chartContainer}>
              <PieChart
                data={withdrawalPieData}
                width={chartWidth}
                height={140}
                chartConfig={chartConfig}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                hasLegend
                avoidFalseZero
              />
            </View>
          </View>
        )}

        {/* ── État vide ─────────────────────────────────────────────────────── */}
        {filtered.length === 0 && (
          <View style={[styles.card, styles.emptyCard, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              {t('emptyTransactions')}
            </Text>
          </View>
        )}

        {/* ── Smooth Area Chart (activité 7j) ──────────────────────────────── */}
        {hasDailyExpenses && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.expense, marginBottom: 16 }]}>
              {t('activite_quotidienne')}
            </Text>
            <DailyAreaChart data={dailyExpenseData} chartWidth={chartWidth} colors={colors} />
          </View>
        )}

        {/* ── Top catégories par barres (BarChart) ─────────────────────────── */}
        {topCategories.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.subText, marginBottom: 16 }]}>
              {t('chartTitle')}
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

        {/* ── Répartition du budget par progression ────────────────────────── */}
        {topCategories.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.subText, marginBottom: 16 }]}>
              {t('distributionTitle')}
            </Text>
            {topCategories.map(([cat, val]) => {
              const pct = totalExpenses > 0 ? Math.round((val / totalExpenses) * 100) : 0;
              return (
                <View key={cat} style={styles.catRow}>
                  <Text style={[styles.catName, { color: colors.text }]} numberOfLines={1}>{cat}</Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.line }]}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: accentColor }]} />
                  </View>
                  <Text style={[styles.catPct, { color: colors.subText }]}>{pct}%</Text>
                  <Text style={[styles.catAmt, { color: colors.subText }]}>{val.toLocaleString()} {deviseSymbol}</Text>
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

// ── Smooth Area Chart (SVG custom) ────────────────────────────────────────────
const DailyAreaChart = React.memo(({ data, chartWidth, colors }) => {
  if (!data?.datasets?.[0]) return null;

  const values = data.datasets[0].data;
  const labels = data.labels || [];
  if (values.length < 2) return null;

  const H      = 200;
  const W      = chartWidth;
  const pad    = { top: 24, right: 16, bottom: 32, left: 48 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top  - pad.bottom;
  const maxVal = Math.max(...values, 1);
  const steps  = values.length - 1;

  const points = values.map((v, i) => ({
    x: pad.left + (i / steps) * innerW,
    y: pad.top  + (1 - v / maxVal) * innerH,
  }));

  const linePath = points.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpx1 = prev.x + (p.x - prev.x) * 0.45;
    const cpx2 = prev.x + (p.x - prev.x) * 0.55;
    return `C ${cpx1} ${prev.y}, ${cpx2} ${p.y}, ${p.x} ${p.y}`;
  }).join(' ');

  const areaPath = `${linePath} L ${points[steps].x} ${H - pad.bottom} L ${points[0].x} ${H - pad.bottom} Z`;

  const gridLines = [0, 1, 2, 3].map(i => ({
    y:     pad.top + (i / 3) * innerH,
    label: Math.round(maxVal * (1 - i / 3)),
  }));

  return (
    <Svg width={W} height={H}>
      <Defs>
        <LinearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.expense} stopOpacity="0.25" />
          <Stop offset="1" stopColor={colors.expense} stopOpacity="0.01" />
        </LinearGradient>
      </Defs>

      {gridLines.map((g, i) => (
        <G key={`g${i}`}>
          <Line x1={pad.left} y1={g.y} x2={W - pad.right} y2={g.y} stroke={colors.line} strokeDasharray="4,4" strokeWidth="1" />
          <SvgText x={pad.left - 6} y={g.y + 4} fill={colors.subText} fontSize="10" textAnchor="end" fontWeight="500">
            {g.label.toLocaleString()}
          </SvgText>
        </G>
      ))}

      <Path d={areaPath} fill="url(#expGrad)" />
      <Path d={linePath} fill="none" stroke={colors.expense} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p, i) => (
        <G key={`pt${i}`}>
          <SvgText x={p.x} y={H - 6} fill={colors.subText} fontSize="10" textAnchor="middle" fontWeight="500">
            {labels[i]}
          </SvgText>
          {i < steps && (
            <Line x1={p.x} y1={pad.top} x2={p.x} y2={H - pad.bottom} stroke={colors.line} strokeWidth="0.5" strokeDasharray="2,3" opacity="0.4" />
          )}
        </G>
      ))}
    </Svg>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const createStyles = (cp, cpad, cardP, br) => StyleSheet.create({
  container:       { flex: 1 },
  scrollContainer: { paddingHorizontal: cpad, paddingTop: 10, paddingBottom: 40, maxWidth: cp, width: '100%', alignSelf: 'center' },
  headerTitle:     { fontSize: 32, fontWeight: 'bold', marginTop: 10, marginBottom: 16 },
  selectionRow:    { flexDirection: 'row', gap: 10, marginBottom: 20, alignItems: 'center' },
  dayButton:       { paddingHorizontal: 20, height: 50, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  dayButtonText:   { fontSize: 14, fontWeight: '700' },
  dropdown:        { flex: 1, height: 50, borderRadius: radius.md, paddingHorizontal: 16, borderWidth: 1 },
  dropdownContainer: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1 },
  placeholderStyle:  { fontSize: 14 },
  selectedTextStyle: { fontSize: 14, fontWeight: '600' },
  customDateContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: radius.lg, marginBottom: 16, gap: 10 },
  dateSelectorBtn:     { flex: 1, paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md, alignItems: 'center' },
  dateSelectorLabel:   { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  dateSelectorValue:   { fontSize: 14, fontWeight: 'bold' },
  dateSeparator:       { width: 1, height: 30 },
  row:      { flexDirection: 'row', gap: 12, marginBottom: 12 },
  halfCard: { flex: 1, padding: cardP, borderRadius: br },
  card:     { padding: cardP, borderRadius: br, marginBottom: 12 },
  cardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  cardValue: { fontSize: 18, fontWeight: 'bold', marginTop: 8 },
  bigValue:  { fontSize: 28, fontWeight: 'bold', marginTop: 8 },
  txCount:   { fontSize: 12, fontWeight: '500', marginTop: 6 },
  chart:     { borderRadius: radius.md, marginLeft: -15 },
  catRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  catName: { width: 80, fontSize: 12, fontWeight: '600' },
  barTrack:{ flex: 1, height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: radius.pill },
  catPct:  { width: 30, textAlign: 'right', fontSize: 11 },
  catAmt:  { width: 65, textAlign: 'right', fontSize: 11, fontWeight: '500' },
  emptyCard:     { alignItems: 'center', paddingVertical: 30 },
  emptyText:     { fontSize: 14, textAlign: 'center' },
  rowBetween:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartContainer:{ alignItems: 'center', marginTop: 10 },
  feeTotalValue: { fontSize: 16, fontWeight: 'bold' },
});
