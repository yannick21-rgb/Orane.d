/**
 * Statistiques premium « Old Money ».
 *
 * LOGIQUE INCHANGÉE (règle 1) : mêmes filtrages par période (helpers
 * `transactionDates`), mêmes totaux (`computeIncomeExpenseTotals`),
 * mêmes blocs dettes et frais réseaux — seul le rendu change.
 * Nouveautés de présentation, calculées localement : donut interactif
 * (SVG sur mesure, toucher un segment affiche le détail), barres 7 j
 * pressables, comparatif mois précédent, top 3 avec jauges, insights en
 * langage naturel (gabarits FR/EN/ES + formatage local).
 *
 * Pas de lib graphique externe : react-native-chart-kit est abandonné
 * ici (style imposé, pas d'interaction) au profit de deux tracés maison
 * en react-native-svg — 60 fps, style sombre garanti, zéro risque natif.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Rect } from 'react-native-svg';
import { Lightbulb, PieChart as PieIcon, TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import CrossPlatformDatePicker from '../components/CrossPlatformDatePicker';
import { CollapsingBar, useCollapsingHeader } from '../components';
import { useQuickAdd } from '../components/QuickAddContext';
import {
  Amount, AmountText, Card, EmptyState, ProgressBar,
  SegmentedControl, SkeletonRow,
} from '../components/ui';
import Sparkline from '../components/Sparkline';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useTranslation } from '../../utils/LanguageManager';
import { toNumber } from '../../utils/format';
import { computeIncomeExpenseTotals } from '../../utils/transactionTotals';
import { useResponsive } from '../../utils/responsive';
import { useReduceMotion } from '../../utils/useReduceMotion';
import {
  isTransactionInCurrentWeek,
  isTransactionInMonth,
  isTransactionInPreviousWeek,
  isTransactionInYear,
} from '../../utils/transactionDates';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../model/TransactionModel';
import { useColors } from '../theme';
import { typography } from '../theme/typography';
import { radius, duration } from '../theme/tokens';

/** Une teinte par part — médianes, lisibles sur fond sombre comme clair. */
const SLICE_COLORS = [
  '#C9A86A', '#0f7ba8', '#1FA97A', '#b03a3a', '#8a6fd0', '#E0913D', '#5a7fa8',
];

const CAT_TKEY = {};
[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].forEach((c) => { CAT_TKEY[c.key] = c.tKey; });
const LEGACY_TKEY = {
  'Vêtements': 'vetements',
  'Salaire': 'salaire',
  'Général': 'general',
  'Retrait MoMo': 'frais_retraits_cat',
};

function fillTemplate(tpl, vars) {
  return String(tpl)
    .replace('{cat}', vars.cat)
    .replace('{pct}', String(vars.pct))
    .replace('{period}', String(vars.period ?? ''));
}

/** Diamètre du donut (partagé entre le tracé et son conteneur). */
const DONUT_SIZE = 190;

/** Apparition en fondu à l'ouverture (driver natif, statique si réduit). */
function Fade({ children, style = null }) {
  const reduce = useReduceMotion();
  const opacity = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) {
      opacity.setValue(1);
      return;
    }
    Animated.timing(opacity, { toValue: 1, duration: duration.normal, useNativeDriver: true }).start();
  }, [opacity, reduce]);
  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
}

export default function StatsScreen() {
  const { transactions, isDark, accentColor, devise, isDiscreteMode, isUserDataLoaded } = useFinance();
  const { t, currentLanguage } = useTranslation();
  const { contentMaxWidth, contentPadding } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding);
  const deviseSymbol = devise?.split(' ')[0] || 'F';
  const colors = useColors();
  const header = useCollapsingHeader();
  const quick = useQuickAdd();

  // La semaine par défaut : c'est l'unité de décision courante (dépenses de
  // la semaine en cours), et celle qui laisse le moins de trous dans l'écran.
  const [period, setPeriod] = useState('semaine');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  // Mémoïsé : un tableau littéral à chaque rendu annulait les dépendances de
  // `filtered`, `prevFiltered` et `dailyExpenseData` — les 4 mémos étaient
  // recalculés inutilement à chaque rendu (filtrage O(n) sur gros historiques).
  const safeTransactions = useMemo(
    () => (Array.isArray(transactions) ? transactions.filter(Boolean) : []),
    [transactions]
  );

  const changePeriod = (p) => {
    setPeriod(p);
    setSelectedCat(null);
    setSelectedDay(null);
  };

  // ── Filtrage par période (mêmes helpers, + année calendaire) ──────────────
  const filtered = useMemo(() => safeTransactions.filter((tx) => {
    if (!tx.date) return false;
    if (period === 'personalisé') {
      const tDate = new Date(tx.date).getTime();
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      return tDate >= start && tDate <= end;
    }
    if (period === 'semaine') return isTransactionInCurrentWeek(tx);
    if (period === 'annee') {
      const d = new Date(tx.date);
      return !isNaN(d) && d.getFullYear() === new Date().getFullYear();
    }
    return isTransactionInMonth(tx);
  }), [safeTransactions, period, startDate, endDate]);

  // ── Synthèse financière ───────────────────────────────────────────────────
  const { totalIncome, totalExpenses } = computeIncomeExpenseTotals(filtered);
  const balance = totalIncome - totalExpenses;

  // ── Période précédente (comparatif) ───────────────────────────────────────
  // Le comparatif se fait sur la MÊME période que l'écran : cette semaine
  // contre la semaine dernière, ce mois contre le mois dernier, cette année
  // contre l'année dernière. Comparer une semaine au mois dernier n'aurait
  // aucun sens.
  const prevFiltered = useMemo(() => {
    if (period === 'semaine') {
      return safeTransactions.filter((tx) => tx.date && isTransactionInPreviousWeek(tx));
    }
    if (period === 'annee') {
      const lastYear = new Date().getFullYear() - 1;
      return safeTransactions.filter((tx) => tx.date && isTransactionInYear(tx, lastYear));
    }
    // Mois et période personnalisée : le mois précédent.
    // `setMonth(-1)` sur un 31 déborde (31 mars → 3 mars) : on se cale au 1er
    // avant de reculer d'un mois pour viser le vrai mois précédent.
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return safeTransactions.filter((tx) => tx.date && isTransactionInMonth(tx, d));
  }, [safeTransactions, period]);
  const prevTotals = computeIncomeExpenseTotals(prevFiltered);

  // Titres des deux colonnes du comparatif et phrase de l'insight.
  const prevPeriodTitle = period === 'semaine'
    ? t('semaine_derniere')
    : period === 'annee'
      ? t('annee_derniere')
      : t('mois_dernier');
  const prevPeriodPhrase = period === 'semaine'
    ? t('prec_semaine')
    : period === 'annee'
      ? t('prec_annee')
      : t('prec_mois');

  // ── Prêts & Dettes (logique reprise telle quelle) ─────────────────────────
  const totalBorrowed = filtered.filter((tx) => (tx.type === 'income' || tx.type === 'revenu') && tx.category === 'Emprunt').reduce((s, tx) => s + Math.abs(toNumber(tx.amount)), 0);
  const totalRepaid = filtered.filter((tx) => (tx.type === 'expense' || tx.type === 'depense') && tx.category === 'Remboursement').reduce((s, tx) => s + Math.abs(toNumber(tx.amount)), 0);
  const debtStatus = totalBorrowed - totalRepaid;

  // ── Frais de retrait MoMo (logique reprise telle quelle) ──────────────────
  const networkFeesMap = {};
  let totalWithdrawalFees = 0;
  filtered.forEach((tx) => {
    let fee = 0;
    let network = tx.momoNetwork || 'Autre';
    if (tx.type === 'transfert' && toNumber(tx.momoFee) > 0) {
      fee = toNumber(tx.momoFee);
    } else if (tx.category === 'Frais & Retraits') {
      fee = toNumber(tx.amount);
      if (tx.momoNetwork) network = tx.momoNetwork;
    }
    if (fee > 0) {
      networkFeesMap[network] = (networkFeesMap[network] || 0) + fee;
      totalWithdrawalFees += fee;
    }
  });
  const sortedNetworkFees = Object.entries(networkFeesMap).sort((a, b) => b[1] - a[1]);

  // ── Activité des dépenses (7 derniers jours, logique inchangée) ───────────
  const dailyExpenseData = useMemo(() => {
    const dayNames = {
      fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
      en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    };
    const labels = dayNames[currentLanguage] || dayNames['fr'];
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const target = new Date();
      target.setDate(target.getDate() - i);
      out.push({
        label: labels[target.getDay()],
        value: Math.round(
          safeTransactions
            .filter((tx) =>
              (tx.type === 'expense' || tx.type === 'depense') &&
              tx.category !== 'Remboursement' &&
              tx.date &&
              new Date(tx.date).toDateString() === target.toDateString()
            )
            .reduce((sum, tx) => sum + Math.abs(toNumber(tx.amount)), 0)
        ),
      });
    }
    return out;
  }, [safeTransactions, currentLanguage]);
  const maxDaily = Math.max(...dailyExpenseData.map((d) => d.value), 1);

  // ── Catégories de dépenses (logique inchangée, top 6 + regroupement) ──────
  // Mémoïsé sur `filtered` : un tableau reconstruit à chaque rendu dans les
  // deps de `insights` annulait sa mémoïsation (recalcul complet, chaînes
  // localisées comprises, à chaque rendu).
  const ranked = useMemo(() => {
    const categoryMap = {};
    filtered
      .filter((tx) => (tx.type === 'expense' || tx.type === 'depense') && tx.category !== 'Remboursement')
      .forEach((tx) => {
        const cat = tx.category || 'Général';
        categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(toNumber(tx.amount));
      });
    return Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
  }, [filtered]);
  const topSlices = ranked.slice(0, 6);
  const restValue = ranked.slice(6).reduce((s, [, v]) => s + v, 0);
  if (restValue > 0) topSlices.push(['__rest__', restValue]);

  const catLabel = (key) => {
    if (key === '__rest__') return t('autres');
    const tKey = CAT_TKEY[key] || LEGACY_TKEY[key];
    return tKey ? t(tKey) : key;
  };

  const donutTotal = topSlices.reduce((s, [, v]) => s + v, 0);
  const R = 70;
  const CIRC = 2 * Math.PI * R;
  const SIZE = DONUT_SIZE;
  let acc = 0;
  const slices = topSlices.map(([key, value], i) => {
    const frac = donutTotal > 0 ? value / donutTotal : 0;
    const len = Math.max(frac * CIRC - 3, frac > 0 ? 2 : 0);
    const item = {
      key, value,
      label: catLabel(key),
      pct: donutTotal > 0 ? Math.round((value / donutTotal) * 100) : 0,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
      len, offset: -acc,
    };
    acc += frac * CIRC;
    return item;
  });
  const selectedSlice = slices.find((s) => s.key === selectedCat) || null;

  const top3 = ranked.slice(0, 3);
  const top3Max = top3.length ? top3[0][1] : 1;

  // ── Insights en langage naturel (calculés localement) ─────────────────────
  const insights = useMemo(() => {
    const out = [];
    if (ranked.length > 0 && totalExpenses > 0) {
      const [topKey, topVal] = ranked[0];
      out.push(fillTemplate(t('insight_top'), {
        cat: catLabel(topKey),
        pct: Math.round((topVal / totalExpenses) * 100),
      }));
    }
    // Plus forte variation par catégorie vs période précédente.
    const prevMap = {};
    prevFiltered
      .filter((tx) => (tx.type === 'expense' || tx.type === 'depense') && tx.category !== 'Remboursement')
      .forEach((tx) => {
        const cat = tx.category || 'Général';
        prevMap[cat] = (prevMap[cat] || 0) + Math.abs(toNumber(tx.amount));
      });
    let mover = null;
    ranked.forEach(([cat, cur]) => {
      const prev = prevMap[cat] || 0;
      if (prev > 0 && cur > 0) {
        const pct = Math.round(((cur - prev) / prev) * 100);
        if (!mover || Math.abs(pct) > Math.abs(mover.pct)) mover = { cat, pct };
      }
    });
    if (mover && Math.abs(mover.pct) >= 10) {
      out.push(fillTemplate(t('insight_move_vs'), {
        cat: catLabel(mover.cat),
        pct: `${mover.pct >= 0 ? '+' : ''}${mover.pct}`,
        period: prevPeriodPhrase,
      }));
    }
    if (totalIncome > 0) {
      if (balance >= 0) {
        out.push(fillTemplate(t('insight_save'), { cat: '', pct: Math.round((balance / totalIncome) * 100) }));
      } else {
        out.push(fillTemplate(t('insight_over'), { cat: '', pct: Math.round((-balance / totalIncome) * 100) }));
      }
    }
    return out.slice(0, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranked, totalExpenses, totalIncome, balance, prevFiltered, prevPeriodPhrase, currentLanguage]);

  const localeDateStr = currentLanguage === 'en' ? 'en-US' : (currentLanguage === 'es' ? 'es-ES' : 'fr-FR');

  const periodOptions = [
    { value: 'semaine', label: t('semaine') },
    { value: 'mois', label: t('mois') },
    { value: 'annee', label: t('annee') },
    { value: 'personalisé', label: t('perso') },
  ];

  const periodLabel = period === 'personalisé'
    ? `${startDate.toLocaleDateString(localeDateStr)} – ${endDate.toLocaleDateString(localeDateStr)}`
    : t(period === 'annee' ? 'annee' : period);

  const sparkData = dailyExpenseData.map((d) => d.value);

  if (!isUserDataLoaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.scrollContainer}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Animated.ScrollView (et non ScrollView) : `header.onScroll` est un
          AnimatedEvent NATIF (useNativeDriver) renvoyé sous forme d'objet —
          seul un composant animé le convertit en fonction via `__getHandler()`. */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        onScroll={header.onScroll}
        scrollEventThrottle={16}
      >
        <Animated.Text style={[styles.headerTitle, { color: colors.text }, header.largeStyle]}>
          {t('statsTitle')}
        </Animated.Text>

        <SegmentedControl
          options={periodOptions}
          value={period}
          onChange={changePeriod}
          accessibilityLabel={t('statsTitle')}
          style={styles.segment}
        />

        {period === 'personalisé' && (
          <View style={[styles.customRow, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.dateBtn, { backgroundColor: colors.sunken }]}
              onPress={() => setShowStartPicker(true)}
              accessibilityRole="button"
              accessibilityLabel={t('startDateLabel')}
            >
              <Text style={[typography.micro, { color: colors.inkMid }]}>{t('startDateLabel')}</Text>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>
                {startDate.toLocaleDateString(localeDateStr)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateBtn, { backgroundColor: colors.sunken }]}
              onPress={() => setShowEndPicker(true)}
              accessibilityRole="button"
              accessibilityLabel={t('endDateLabel')}
            >
              <Text style={[typography.micro, { color: colors.inkMid }]}>{t('endDateLabel')}</Text>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>
                {endDate.toLocaleDateString(localeDateStr)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showStartPicker && (
          <CrossPlatformDatePicker
            value={startDate}
            mode="date"
            onChange={(_, d) => { setShowStartPicker(false); if (d) setStartDate(d); }}
          />
        )}
        {showEndPicker && (
          <CrossPlatformDatePicker
            value={endDate}
            mode="date"
            onChange={(_, d) => { setShowEndPicker(false); if (d) setEndDate(d); }}
          />
        )}

        {filtered.length === 0 ? (
          <EmptyState
            illustration={
              <View style={[styles.emptyCircle, { backgroundColor: colors.accentSoft }]}>
                <PieIcon color={colors.accent} size={30} />
              </View>
            }
            title={t('emptyTransactions')}
            actionLabel={t('ajouter_premiere')}
            onAction={() => quick.open('expense')}
          />
        ) : (
          <Fade key={periodLabel}>
            {/* Synthèse */}
            <Card>
              <View style={styles.synthRow}>
                <View style={styles.synthCell}>
                  <Text style={[typography.micro, { color: colors.inkMid }]} numberOfLines={1}>
                    {t('incomeLabel')}
                  </Text>
                  <AmountText value={totalIncome} size="amount" tone="income" signed align="left" currency={deviseSymbol} masked={isDiscreteMode} />
                </View>
                <View style={styles.synthCell}>
                  <Text style={[typography.micro, { color: colors.inkMid }]} numberOfLines={1}>
                    {t('expenseLabel')}
                  </Text>
                  <AmountText value={totalExpenses} size="amount" tone="expense" align="left" currency={deviseSymbol} masked={isDiscreteMode} />
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.ruleSoft }]} />
              <View style={styles.synthRow}>
                <View style={styles.synthCell}>
                  <Text style={[typography.micro, { color: colors.inkMid }]} numberOfLines={1}>
                    {t('netBalanceLabel')} · {periodLabel}
                  </Text>
                  <AmountText
                    value={balance}
                    size="figure"
                    tone={balance >= 0 ? 'income' : 'expense'}
                    signed
                    align="left"
                    currency={deviseSymbol}
                    masked={isDiscreteMode}
                  />
                </View>
                <View style={styles.synthCell}>
                  <Text style={[typography.micro, { color: colors.inkMid }]} numberOfLines={1}>
                    {filtered.length} {filtered.length > 1 ? t('operationsLabel') : t('operationLabel')}
                  </Text>
                  <Sparkline data={sparkData} width={120} height={40} stroke={colors.expense} />
                </View>
              </View>
            </Card>

            {/* Donut interactif */}
            {slices.length > 0 && (
              <Card>
                <Text style={[typography.caption, styles.cardLabel, { color: colors.inkMid }]}>
                  {t('chartTitle')}
                </Text>
                <View style={styles.donutWrap}>
                  <View style={styles.donut}>
                    <Svg width={SIZE} height={SIZE}>
                      <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
                        {slices.map((s) => (
                          <Circle
                            key={s.key}
                            cx={SIZE / 2}
                            cy={SIZE / 2}
                            r={R}
                            fill="none"
                            stroke={s.color}
                            strokeWidth={selectedCat === s.key ? 32 : 24}
                            strokeDasharray={`${s.len} ${CIRC - s.len}`}
                            strokeDashoffset={s.offset}
                            strokeLinecap="butt"
                            opacity={selectedCat && selectedCat !== s.key ? 0.35 : 1}
                            onPress={() => setSelectedCat((prev) => (prev === s.key ? null : s.key))}
                          />
                        ))}
                      </G>
                    </Svg>
                    <View style={styles.donutCenter} pointerEvents="none">
                      {selectedSlice ? (
                        <>
                          <Text style={[typography.subtitle, { color: colors.ink }]}>{selectedSlice.pct} %</Text>
                          <AmountText value={selectedSlice.value} size="amountSm" tone="mid" currency={deviseSymbol} masked={isDiscreteMode} />
                        </>
                      ) : (
                        <>
                          <Text style={[typography.micro, { color: colors.inkMid }]}>{t('depenses')}</Text>
                          <AmountText value={donutTotal} size="amount" currency={deviseSymbol} masked={isDiscreteMode} />
                        </>
                      )}
                    </View>
                  </View>
                  <View style={styles.legend}>
                    {slices.map((s) => (
                      <TouchableOpacity
                        key={s.key}
                        style={[
                          styles.legendRow,
                          selectedCat === s.key && { backgroundColor: colors.accentSoft, borderRadius: radius.sm },
                        ]}
                        onPress={() => setSelectedCat((prev) => (prev === s.key ? null : s.key))}
                        accessibilityRole="button"
                        accessibilityLabel={`${s.label}, ${s.pct} %`}
                      >
                        <View style={[styles.dot, { backgroundColor: s.color }]} />
                        <Text style={[typography.body, styles.legendName, { color: colors.ink }]} numberOfLines={1}>
                          {s.label}
                        </Text>
                        <Text style={[typography.caption, { color: colors.inkMid }]}>{s.pct} %</Text>
                        <AmountText value={s.value} size="amountSm" tone="mid" currency={deviseSymbol} masked={isDiscreteMode} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <Text style={[typography.micro, styles.hint, { color: colors.inkFaint }]}>
                  {selectedSlice ? selectedSlice.label : t('touche_detail')}
                </Text>
              </Card>
            )}

            {/* Barres 7 jours pressables */}
            <Card>
              <Text style={[typography.caption, styles.cardLabel, { color: colors.expense }]}>
                {t('activite_quotidienne')}
              </Text>
              <View style={styles.bars}>
                {dailyExpenseData.map((d, i) => {
                  const active = selectedDay === i;
                  const h = Math.round((d.value / maxDaily) * 100);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={styles.barCol}
                      onPress={() => setSelectedDay((prev) => (prev === i ? null : i))}
                      accessibilityRole="button"
                      accessibilityLabel={`${d.label}, ${isDiscreteMode ? t('mode_discret') : `${d.value} ${deviseSymbol}`}`}
                    >
                      <Text style={[typography.micro, { color: active ? colors.ink : colors.inkFaint }]}>
                        {active ? (isDiscreteMode ? '••••' : d.value.toLocaleString('fr-FR')) : ''}
                      </Text>
                      <View style={[styles.barTrack, { backgroundColor: colors.track }]}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: `${Math.max(h, d.value > 0 ? 6 : 0)}%`,
                              backgroundColor: active ? colors.expense : `${colors.expense}99`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[typography.micro, { color: active ? colors.ink : colors.inkMid }]}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* Comparatif : période courante contre la même période
                précédente (semaine contre semaine dernière, etc.). */}
            <Card>
              <View style={styles.compareHead}>
                <Text style={[typography.caption, { color: colors.inkMid }]}>{periodLabel}</Text>
                <Text style={[typography.caption, { color: colors.inkMid }]}>{prevPeriodTitle}</Text>
              </View>
              <CompareRow
                label={t('incomeLabel')}
                cur={totalIncome}
                prev={prevTotals.totalIncome}
                goodWhenUp
                currency={deviseSymbol}
                masked={isDiscreteMode}
                colors={colors}
              />
              <CompareRow
                label={t('expenseLabel')}
                cur={totalExpenses}
                prev={prevTotals.totalExpenses}
                goodWhenUp={false}
                currency={deviseSymbol}
                masked={isDiscreteMode}
                colors={colors}
              />
            </Card>

            {/* Top 3 */}
            {top3.length > 0 && (
              <Card>
                <Text style={[typography.caption, styles.cardLabel, { color: colors.inkMid }]}>
                  {t('top_categories')}
                </Text>
                {top3.map(([cat, val], i) => {
                  const pct = top3Max > 0 ? Math.round((val / top3Max) * 100) : 0;
                  const share = totalExpenses > 0 ? Math.round((val / totalExpenses) * 100) : 0;
                  return (
                    <View key={cat} style={styles.topRow}>
                      <View style={styles.topHead}>
                        <View style={[styles.dot, { backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }]} />
                        <Text style={[typography.bodyStrong, styles.topName, { color: colors.ink }]} numberOfLines={1}>
                          {catLabel(cat)}
                        </Text>
                        <Text style={[typography.caption, { color: colors.inkMid }]}>{share} %</Text>
                      </View>
                      <ProgressBar value={val} max={top3Max} color={SLICE_COLORS[i % SLICE_COLORS.length]} />
                      <AmountText value={val} size="amountSm" tone="mid" align="right" currency={deviseSymbol} masked={isDiscreteMode} />
                    </View>
                  );
                })}
              </Card>
            )}

            {/* Insights */}
            {insights.map((msg, i) => (
              <Card key={i} padding={16}>
                <View style={styles.insight}>
                  <Lightbulb color={colors.gold} size={20} />
                  <Text style={[typography.body, styles.insightText, { color: colors.ink }]}>
                    {msg}
                  </Text>
                </View>
              </Card>
            ))}

            {/* Prêts & Dettes */}
            {(totalBorrowed > 0 || totalRepaid > 0) && (
              <Card>
                <Text style={[typography.caption, styles.cardLabel, { color: colors.inkMid }]}>
                  {t('suivi_dettes')}
                </Text>
                <View style={styles.synthRow}>
                  <View style={styles.synthCell}>
                    <Text style={[typography.micro, { color: colors.inkMid }]}>{t('emprunte')}</Text>
                    <AmountText value={totalBorrowed} size="amount" signed align="left" currency={deviseSymbol} masked={isDiscreteMode} />
                  </View>
                  <View style={styles.synthCell}>
                    <Text style={[typography.micro, { color: colors.inkMid }]}>{t('rembourse')}</Text>
                    <AmountText value={-totalRepaid} size="amount" tone="income" align="left" currency={deviseSymbol} masked={isDiscreteMode} />
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.ruleSoft }]} />
                <View style={styles.synthRow}>
                  <Text style={[typography.body, { color: colors.ink }]}>{t('reste_rembourser')}</Text>
                  <AmountText
                    value={debtStatus}
                    size="amount"
                    tone={debtStatus > 0 ? 'expense' : 'income'}
                    currency={deviseSymbol}
                    masked={isDiscreteMode}
                  />
                </View>
              </Card>
            )}

            {/* Frais réseaux */}
            {totalWithdrawalFees > 0 && (
              <Card>
                <View style={styles.synthRow}>
                  <Text style={[typography.caption, { color: colors.warning }]}>
                    {t('frais_retrait_mobiles')}
                  </Text>
                  <AmountText value={totalWithdrawalFees} size="amount" currency={deviseSymbol} masked={isDiscreteMode} />
                </View>
                {sortedNetworkFees.map(([network, amount]) => {
                  const pct = Math.round((amount / totalWithdrawalFees) * 100);
                  return (
                    <View key={network} style={styles.topRow}>
                      <View style={styles.topHead}>
                        <Text style={[typography.body, styles.topName, { color: colors.ink }]} numberOfLines={1}>
                          {network}
                        </Text>
                        <Text style={[typography.caption, { color: colors.inkMid }]}>{pct} %</Text>
                      </View>
                      <ProgressBar value={amount} max={sortedNetworkFees[0][1]} color={colors.warning} />
                    </View>
                  );
                })}
              </Card>
            )}
          </Fade>
        )}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
      <CollapsingBar title={t('statsTitle')} style={header.compactStyle} />
    </SafeAreaView>
  );
}

/** Ligne de comparatif : valeur période, valeur précédente, badge de variation. */
function CompareRow({ label, cur, prev, goodWhenUp, currency, masked, colors }) {
  const d = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
  const good = d === null ? null : goodWhenUp ? d >= 0 : d <= 0;
  const BadgeIcon = d === null || d === 0 ? Minus : d > 0 ? TrendingUp : TrendingDown;
  const badgeColor = d === null || d === 0 ? colors.inkFaint : good ? colors.income : colors.expense;
  return (
    <View style={compareStyles.row}>
      <View style={compareStyles.cell}>
        <Text style={[typography.micro, { color: colors.inkMid }]} numberOfLines={1}>{label}</Text>
        <AmountText value={cur} size="amountSm" tone="mid" align="left" currency={currency} masked={masked} />
      </View>
      <View style={[compareStyles.badge, { backgroundColor: `${badgeColor}22` }]}>
        <BadgeIcon color={badgeColor} size={14} />
        <Text style={[typography.caption, { color: badgeColor }]}>
          {d === null ? '—' : `${d >= 0 ? '+' : ''}${d} %`}
        </Text>
      </View>
      <View style={compareStyles.cellRight}>
        <AmountText value={prev} size="amountSm" tone="faint" align="right" currency={currency} masked={masked} />
      </View>
    </View>
  );
}

const compareStyles = {
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  cell: { flex: 1, minWidth: 0 },
  cellRight: { flex: 1, minWidth: 0 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
};

const createStyles = (cp, cpad) => StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: {
    paddingHorizontal: cpad,
    paddingTop: 10,
    paddingBottom: 40,
    maxWidth: cp,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitle: { ...typography.title, marginTop: 10, marginBottom: 16 },
  segment: { marginBottom: 14 },
  customRow: { flexDirection: 'row', gap: 10, borderRadius: radius.md, padding: 12, marginBottom: 12 },
  dateBtn: { flex: 1, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', gap: 2, minHeight: 44, justifyContent: 'center' },
  cardLabel: { marginBottom: 14 },
  synthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  synthCell: { flex: 1, minWidth: 0 },
  divider: { height: 1, marginVertical: 12 },
  donutWrap: { alignItems: 'center' },
  donut: { width: DONUT_SIZE, height: DONUT_SIZE },
  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  legend: { width: '100%', marginTop: 12, gap: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 8, minHeight: 44 },
  legendName: { flex: 1, minWidth: 0 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  hint: { textAlign: 'center', marginTop: 10 },
  bars: { flexDirection: 'row', alignItems: 'stretch', gap: 6, height: 170 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4, minWidth: 0 },
  barTrack: { width: '70%', height: 120, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6 },
  compareHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  topRow: { marginBottom: 14, gap: 6 },
  topHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topName: { flex: 1, minWidth: 0 },
  insight: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  insightText: { flex: 1 },
  emptyCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
