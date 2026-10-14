/**
 * Accueil premium « Old Money ».
 *
 * LOGIQUE INCHANGÉE (règle 1) : sélection, recherche, suppression,
 * synchronisation, PIN / mode discret, navigation — tout est repris tel
 * quel. Seul le rendu est restructuré en blocs : salutation + avatar,
 * carte héro en dégradé avec compteur animé, carrousel des portefeuilles,
 * actions rapides, sparkline 7 jours, budget animé, transactions groupées
 * par jour. Apparition en cascade, skeletons, pull-to-refresh local.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  LayoutAnimation,
  TextInput,
  Animated,
  RefreshControl,
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
let usePreventScreenCapture = () => {};
try {
  const sc = require('expo-screen-capture');
  usePreventScreenCapture = sc.usePreventScreenCapture || (() => {});
} catch (e) {}
import { useFinance } from '../../viewmodel/FinanceContext';
import { useDebts } from '../../viewmodel/DebtContext';
import { useTontines } from '../../viewmodel/TontineContext';
import { useAuth } from '../../viewmodel/AuthContext';
import { checkPinRateLimit, getRemainingAttemptsText } from '../../utils/security';
import { sync } from '../../utils/sync';
import { useTranslation } from '../../utils/LanguageManager';
import { toNumber } from '../../utils/format';
import { computeIncomeExpenseTotals } from '../../utils/transactionTotals';
import { useResponsive } from '../../utils/responsive';
import { useReduceMotion } from '../../utils/useReduceMotion';
import {
  Trash2, CheckSquare, Square, X, Eye, EyeOff, Search,
  Smartphone, Banknote, Landmark, TrendingUp, TrendingDown,
  ArrowLeftRight, Users, Handshake, Wallet,
  ShoppingCart, Car, Home as HomeIcon, HeartPulse, Gamepad2,
  Shirt, Briefcase, PiggyBank, Tag, GraduationCap, Star,
} from 'lucide-react-native';
import PinAuthModal from '../components/PinAuthModal';
import { useQuickAdd } from '../components/QuickAddContext';
import DebtsScreen from './DebtsScreen';
import TontinesScreen from './TontinesScreen';
import HistoryScreen from './HistoryScreen';
import Sparkline from '../components/Sparkline';
import { buildColors, GOLD } from '../theme';
import { type } from '../theme/type';
import { typography, maxFontScale } from '../theme/typography';
import { radius, touchTarget, duration } from '../theme/tokens';
import { shadows } from '../theme/shadows';
import { DEFAULT_ACCENT } from '../../model/ThemeModel';
import {
  Amount, AmountText, Card, EmptyState, IconButton,
  ProgressBar, SkeletonRow, Avatar,
} from '../components/ui';

/* ------------------------------------------------------------------ */
/* Catégories                                                          */
/* ------------------------------------------------------------------ */

const CATEGORY_KEY_MAP = {
  'Alimentation': 'alimentation',
  'Transport': 'transport',
  'Logement': 'logement',
  'Santé': 'sante',
  'Loisirs': 'loisirs',
  'Vêtements': 'vetements',
  'Salaire': 'salaire',
  'Épargne': 'epargne',
  'Général': 'general',
  'Retrait MoMo': 'frais_retraits_cat',
  'Education/Formation': 'education_formation',
  'Autres': 'autres',
};

/** Pictogramme + teinte par catégorie (pastille colorée). */
const CATEGORY_VISUAL = {
  'Alimentation': { Icon: ShoppingCart, color: '#E0913D' },
  'Transport': { Icon: Car, color: '#5AA9E6' },
  'Logement': { Icon: HomeIcon, color: '#9B7BE8' },
  'Santé': { Icon: HeartPulse, color: '#E05A7A' },
  'Loisirs': { Icon: Gamepad2, color: '#3FC1C9' },
  'Vêtements': { Icon: Shirt, color: '#C9A86A' },
  'Salaire': { Icon: Briefcase, color: '#2ecc71' },
  'Épargne': { Icon: PiggyBank, color: '#1FA97A' },
  'Général': { Icon: Tag, color: '#8A93A3' },
  'Retrait MoMo': { Icon: Smartphone, color: '#E08A1E' },
  'Education/Formation': { Icon: GraduationCap, color: '#4A5BF0' },
  'Autres': { Icon: Star, color: '#8A93A3' },
};

const INCOME_TYPES = ['income', 'revenu'];
const normalizeLocalType = (ty) => {
  if (ty === 'expense') return 'depense';
  if (ty === 'income') return 'revenu';
  return ty;
};

/** Teinte du montant : c'est elle qui dit si l'argent entre ou sort. */
function toneOf(item) {
  if (item.type === 'transfert') return 'transfer';
  if (INCOME_TYPES.includes(item.type)) return 'income';
  return 'expense';
}

/* ------------------------------------------------------------------ */
/* Compteur animé + apparition en cascade                              */
/* ------------------------------------------------------------------ */

/** Compte de l'ancienne vers la nouvelle valeur (600 ms, instantané si réduit). */
function useCountUp(value, ms = 600) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const reduce = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { reduce.current = v; }).catch(() => {});
  }, []);

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value || reduce.current) {
      setDisplay(value);
      return undefined;
    }
    let raf;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / ms, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);

  return display;
}

/** Un bloc qui monte en fondu, décalé de 70 ms par rang. Statique si
 * « réduire les animations » est activé. */
function Rise({ index = 0, children, style = null }) {
  const reduce = useReduceMotion();
  const opacity = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduce ? 0 : 12)).current;

  useEffect(() => {
    if (reduce) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: duration.normal, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: duration.normal, useNativeDriver: true }),
      ]).start();
    }, index * 70);
    return () => clearTimeout(t);
  }, [index, opacity, translateY, reduce]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Écran                                                               */
/* ------------------------------------------------------------------ */

export default function HomeScreen({ navigation }) {
  usePreventScreenCapture();
  const { t, currentLanguage } = useTranslation();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinRemainingText, setPinRemainingText] = useState('');
  const [syncStatus, setSyncStatus] = useState({ pendingCount: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [showDebts, setShowDebts] = useState(false);
  const [showTontines, setShowTontines] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [walletIndex, setWalletIndex] = useState(0);
  const { width: windowWidth } = useWindowDimensions();

  const {
    transactions = [],
    isDark = false,
    accentColor = DEFAULT_ACCENT,
    deleteTransaction,
    deleteMultipleTransactions,
    setEditingTransaction,
    devise,
    isDiscreteMode,
    hasPinCode,
    isUserDataLoaded,
    saveNewPin,
    unlockDiscreteMode,
    toggleDiscreteMode,
    momoBalance,
    cashBalance,
    banqueBalance,
    budgetLimit,
    getPeriodExpenses,
  } = useFinance();

  const { totalToReceive, totalToRepay } = useDebts();
  const { overallSummary } = useTontines();
  const { user, userId, loading } = useAuth();
  const { contentMaxWidth, contentPadding } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding);

  const hasCheckedPinRef = useRef(false);

  useEffect(() => {
    if (!isUserDataLoaded) return;
    if (hasCheckedPinRef.current) return;
    if (isDiscreteMode && !hasPinCode) {
      setShowPinModal(true);
    }
    hasCheckedPinRef.current = true;
  }, [isUserDataLoaded, isDiscreteMode, hasPinCode]);

  useEffect(() => {
    if (userId && hasPinCode) {
      getRemainingAttemptsText(userId).then(setPinRemainingText).catch(() => {});
      checkPinRateLimit(userId).then((info) => {
        if (info.totalAttempts > 0) {
          getRemainingAttemptsText(userId).then(setPinRemainingText);
        }
      }).catch(() => {});
    }
  }, [hasPinCode, userId]);

  useEffect(() => {
    if (!userId || loading) return;
    setSyncStatus(sync.getStatus());
    const unsub = sync.subscribe(setSyncStatus);
    return unsub;
  }, [userId, loading]);

  const deviseSymbol = devise?.split(' ')[0] || '€';

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const colors = useMemo(() => buildColors(isDark, accentColor), [isDark, accentColor]);

  const safeTransactions = Array.isArray(transactions)
    ? transactions.filter(Boolean)
    : [];

  const sorted = [...safeTransactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const query = searchQuery.trim();
  const filtered = query
    ? sorted.filter((tx) => {
        const q = query.toLowerCase();
        return (tx.title && tx.title.toLowerCase().includes(q)) ||
               (tx.note && tx.note.toLowerCase().includes(q));
      })
    : sorted;

  const { totalIncome, totalExpenses } = computeIncomeExpenseTotals(filtered);

  // Ce qui est réellement disponible maintenant, toutes poches confondues :
  // c'est le seul chiffre que l'on consulte dix fois par jour.
  const available = useMemo(
    () => (momoBalance || 0) + (cashBalance || 0) + (banqueBalance || 0),
    [momoBalance, cashBalance, banqueBalance]
  );
  const animatedAvailable = useCountUp(isDiscreteMode ? 0 : available);

  const select = (id) => {
    setSelectedIds(new Set([id]));
    setSelectionMode(true);
  };

  const toggleSelection = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    if (next.size === 0) {
      setSelectionMode(false);
    }
    setSelectedIds(next);
  };

  const cancelSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleDelete = (item) => {
    Alert.alert(
      t('supprimer'),
      `${t('supprimer')} "${item.title || t('cette_operation')}" ?`,
      [
        { text: t('annuler'), style: 'cancel' },
        {
          text: t('supprimer'),
          style: 'destructive',
          onPress: () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            deleteTransaction(item.id);
          },
        },
      ]
    );
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    Alert.alert(
      t('supprimer'),
      `${t('supprimer')} ${count} ${count > 1 ? t('operationsLabel') : t('operationLabel')} ?`,
      [
        { text: t('annuler'), style: 'cancel' },
        {
          text: t('supprimer'),
          style: 'destructive',
          onPress: () => {
            deleteMultipleTransactions([...selectedIds]);
            setSelectedIds(new Set());
            setSelectionMode(false);
          },
        },
      ]
    );
  };

  // Déclaré AVANT `goAdd` : `quick` figure dans le tableau des dépendances,
  // qui est évalué pendant le rendu — le déclarer plus bas déclenchait une
  // ReferenceError (TDZ) au premier rendu de l'écran d'accueil.
  const quick = useQuickAdd();

  const refreshTimer = useRef(null);
  const onRefresh = useCallback(() => {
    // 100 % local : on rejoue la lecture des données déjà en mémoire.
    setRefreshing(true);
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => setRefreshing(false), 700);
  }, []);

  useEffect(() => () => clearTimeout(refreshTimer.current), []);

  const goAdd = useCallback(() => {
    quick.open('expense');
  }, [quick]);

  const locale = currentLanguage === 'en' ? 'en-US' : currentLanguage === 'es' ? 'es-ES' : 'fr-FR';

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  const dayLabel = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d)) return '';
    const startOf = (x) => { const c = new Date(x); c.setHours(0, 0, 0, 0); return c; };
    const diff = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
    if (diff === 0) return t('aujourdhui');
    if (diff === 1) return t('hier');
    return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // Dépenses des 7 derniers jours (dépenses + frais de transfert).
  const last7 = useMemo(() => {
    const days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return days.map((day) => {
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      return safeTransactions
        .filter((tx) => {
          if (!tx) return false;
          const tp = normalizeLocalType(tx.type);
          if (tp !== 'depense' && tp !== 'transfert') return false;
          const d = new Date(tx.date);
          return d >= day && d < next;
        })
        .reduce((sum, tx) => {
          if (normalizeLocalType(tx.type) === 'transfert') {
            return sum + (Number(tx.frais ?? tx.momoFee) || 0);
          }
          return sum + (Number(tx.amount) || 0);
        }, 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);
  const total7 = useMemo(() => last7.reduce((s, v) => s + v, 0), [last7]);

  // Budget du mois : dépensé vs limite, couleur vert → orange → rouge.
  const periodExpenses = budgetLimit > 0 ? getPeriodExpenses() : 0;
  const budgetRatio = budgetLimit > 0 ? periodExpenses / budgetLimit : 0;
  const budgetColor = budgetRatio >= 1
    ? colors.expense
    : budgetRatio >= 0.8 ? colors.warning : colors.income;

  const hasDebts = totalToReceive > 0 || totalToRepay > 0 || overallSummary.totalPaid > 0;

  const hour = new Date().getHours();
  const greeting = hour < 18 ? t('bonjour') : t('bonsoir');
  const displayName = user?.name || '';
  const heroInk = isDark ? '#FFF7E8' : GOLD.night;
  const heroSub = isDark ? 'rgba(255,247,232,0.72)' : 'rgba(42,36,23,0.68)';

  const wallets = [
    { key: 'momo', name: t('pocket_momo'), value: momoBalance, Icon: Smartphone },
    { key: 'cash', name: t('pocket_especes'), value: cashBalance, Icon: Banknote },
    { key: 'banque', name: t('pocket_banque'), value: banqueBalance, Icon: Landmark },
  ];
  const cardWidth = Math.min(windowWidth - contentPadding * 2, 320);

  const quickActions = [
    { key: 'depense', label: t('label_depenses'), Icon: TrendingDown, tone: 'expense', onPress: () => quick.open('expense') },
    { key: 'revenu', label: t('label_revenus'), Icon: TrendingUp, tone: 'income', onPress: () => quick.open('income') },
    { key: 'transfert', label: t('type_transfert'), Icon: ArrowLeftRight, tone: 'transfer', onPress: () => quick.open('transfert') },
    { key: 'tontine', label: t('tontine'), Icon: Users, tone: 'info', onPress: () => setShowTontines(true) },
    { key: 'dette', label: t('action_dette'), Icon: Handshake, tone: 'warning', onPress: () => setShowDebts(true) },
  ];

  // L'accueil montre les 15 récentes ; l'historique complet (filtres,
  // FlashList, swipe, annulation) vit dans HistoryScreen.
  const RECENT_LIMIT = 15;
  const displayList = query ? filtered : filtered.slice(0, RECENT_LIMIT);

  // Transactions groupées par jour (ordre décroissant conservé).
  const groups = useMemo(() => {
    const out = [];
    const map = new Map();
    displayList.forEach((tx) => {
      if (!tx) return;
      const d = new Date(tx.date);
      const key = isNaN(d) ? '?' : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) {
        const g = { key, label: dayLabel(tx.date), items: [] };
        map.set(key, g);
        out.push(g);
      }
      map.get(key).items.push(tx);
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayList, currentLanguage]);

  if (!isUserDataLoaded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.scrollContainer}>
          <View style={styles.header}>
            <SkeletonRow />
          </View>
          <SkeletonRow />
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.inkMid} />
        }
      >
        {/* En-tête : avatar, salutation, vie privée */}
        <Rise index={0}>
          <View style={styles.header}>
            {selectionMode ? (
              <>
                <TouchableOpacity
                  onPress={cancelSelection}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('annuler')}
                >
                  <X color={colors.ink} size={20} />
                </TouchableOpacity>
                <Text style={[styles.selectionCount, typography.subtitle, { color: colors.ink }]}>
                  {selectedIds.size} {selectedIds.size > 1 ? t('operationsLabel') : t('operationLabel')}
                </Text>
                <TouchableOpacity
                  onPress={handleBulkDelete}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.privacyHit}
                  accessibilityRole="button"
                  accessibilityLabel={t('supprimer')}
                >
                  <Trash2 color={colors.expense} size={20} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Avatar name={displayName || '?'} size={42} />
                <View style={styles.hello}>
                  <Text style={[typography.micro, { color: colors.inkMid }]} numberOfLines={1}>
                    {greeting}{displayName ? `, ${displayName}` : ''}
                  </Text>
                  {userId && syncStatus.pendingCount > 0 ? (
                    <View style={styles.syncRow}>
                      <View style={[styles.syncDot, { backgroundColor: colors.warning }]} />
                      <Text style={[typography.micro, { color: colors.inkMid }]}>
                        {syncStatus.pendingCount} {t('en_attente')}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <IconButton
                  onPress={() => {
                    if (isDiscreteMode) {
                      setShowPinModal(true);
                    } else {
                      toggleDiscreteMode();
                    }
                  }}
                  accessibilityLabel={isDiscreteMode ? t('mode_discret') : t('mode_visible')}
                >
                  {isDiscreteMode ? (
                    <EyeOff color={colors.inkMid} size={22} />
                  ) : (
                    <Eye color={colors.inkMid} size={22} />
                  )}
                </IconButton>
              </>
            )}
          </View>
        </Rise>

        {/* Carte héro : le solde, en dégradé Old Money */}
        <Rise index={1}>
          <LinearGradient
            colors={colors.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, shadows.raised]}
          >
            <Text style={[typography.micro, { color: heroSub }]}>
              {t('solde_disponible')}
            </Text>
            <Amount
              value={animatedAvailable}
              currency={deviseSymbol}
              size="display"
              align="left"
              masked={isDiscreteMode}
              style={styles.displayAmount}
            />
            <View style={styles.heroFlow}>
              <View style={styles.heroCell}>
                <Text style={[typography.micro, { color: heroSub }]} numberOfLines={1}>
                  {t('label_revenus')}
                </Text>
                <Amount value={totalIncome} currency={deviseSymbol} size="amount" tone="income" signed align="left" masked={isDiscreteMode} />
              </View>
              <View style={[styles.heroDivider, { backgroundColor: heroSub }]} />
              <View style={styles.heroCell}>
                <Text style={[typography.micro, { color: heroSub }]} numberOfLines={1}>
                  {t('label_depenses')}
                </Text>
                <Amount value={totalExpenses} currency={deviseSymbol} size="amount" tone="expense" align="left" masked={isDiscreteMode} />
              </View>
            </View>
          </LinearGradient>
        </Rise>

        {/* Portefeuilles : carrousel façon cartes bancaires */}
        <Rise index={2}>
          <Text style={[typography.caption, styles.blockLabel, { color: colors.inkMid }]}>
            {t('portefeuilles')}
          </Text>
          <ScrollView
            horizontal
            pagingEnabled={false}
            snapToInterval={cardWidth + 12}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
            onMomentumScrollEnd={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + 12));
              setWalletIndex(Math.max(0, Math.min(i, wallets.length - 1)));
            }}
          >
            {wallets.map((w) => (
              <LinearGradient
                key={w.key}
                colors={colors.heroGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.walletCard, { width: cardWidth }]}
              >
                <View style={styles.walletTop}>
                  <w.Icon color={colors.gold} size={22} />
                  <Text style={[typography.caption, { color: heroSub }]} numberOfLines={1}>
                    {w.name}
                  </Text>
                </View>
                <AmountText
                  value={w.value || 0}
                  currency={deviseSymbol}
                  size="figure"
                  align="left"
                  masked={isDiscreteMode}
                />
                <Text style={[typography.micro, { color: heroSub }]}>
                  •••• {w.key === 'momo' ? 'MoMo' : w.key === 'cash' ? 'Cash' : 'BK'}
                </Text>
              </LinearGradient>
            ))}
          </ScrollView>
          <View style={styles.dots}>
            {wallets.map((w, i) => (
              <View
                key={w.key}
                style={[
                  styles.dot,
                  { backgroundColor: i === walletIndex ? colors.gold : colors.dot },
                ]}
              />
            ))}
          </View>
        </Rise>

        {/* Actions rapides : le geste à moins de 5 secondes commence ici */}
        <Rise index={3}>
          <View style={styles.quickRow}>
            {quickActions.map((a) => {
              const toneColor = colors[a.tone] || colors.inkMid;
              return (
                <TouchableOpacity
                  key={a.key}
                  onPress={a.onPress}
                  style={styles.quick}
                  accessibilityRole="button"
                  accessibilityLabel={a.label}
                >
                  <View style={[styles.quickCircle, { backgroundColor: `${toneColor}22` }]}>
                    <a.Icon color={toneColor} size={22} />
                  </View>
                  <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={maxFontScale}
                    style={[typography.micro, { color: colors.inkMid }]}
                  >
                    {a.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Rise>

        {/* Dettes et tontines : rappel compact, montants masqués en discret */}
        {hasDebts && !isDiscreteMode && (
          <Rise index={5}>
            <View style={styles.debtRow}>
              {totalToReceive > 0 ? (
                <DebtCell label={t('a_recevoir')} value={totalToReceive} currency={deviseSymbol} tone="income" colors={colors} styles={styles} />
              ) : null}
              {totalToRepay > 0 ? (
                <DebtCell label={t('a_rembourser')} value={totalToRepay} currency={deviseSymbol} tone="expense" colors={colors} styles={styles} />
              ) : null}
              {overallSummary.totalPaid > 0 ? (
                <DebtCell label={t('tontine')} value={overallSummary.totalPaid} currency={deviseSymbol} tone="transfer" colors={colors} styles={styles} />
              ) : null}
            </View>
          </Rise>
        )}

        {/* Sparkline des 7 derniers jours */}
        <Rise index={6}>
          <Card>
            <View style={styles.sparkHead}>
              <Text style={[typography.caption, { color: colors.inkMid }]}>
                {t('depenses_7j')}
              </Text>
              <AmountText value={total7} currency={deviseSymbol} size="amountSm" tone="expense" />
            </View>
            <Sparkline data={last7} width={Math.min(windowWidth - contentPadding * 2 - 40, 600)} height={56} />
          </Card>
        </Rise>

        {/* Budget du mois : la barre qui vire au rouge */}
        {budgetLimit > 0 && (
          <Rise index={7}>
            <Card>
              <View style={styles.budgetHead}>
                <Text style={[typography.caption, { color: colors.inkMid }]}>
                  {t('budget_titre')}
                </Text>
                <Text style={[typography.caption, { color: colors.inkMid }]}>
                  {Math.round(budgetRatio * 100)} %
                </Text>
              </View>
              <View style={styles.budgetRow}>
                <AmountText value={periodExpenses} size="amountSm" tone="mid" align="left" currency={deviseSymbol} masked={isDiscreteMode} />
                <AmountText value={budgetLimit} size="amountSm" tone="mid" align="right" currency={deviseSymbol} masked={isDiscreteMode} />
              </View>
              <ProgressBar
                value={periodExpenses}
                max={budgetLimit}
                color={budgetColor}
                accessibilityLabel={t('budget_titre')}
              />
              <AmountText
                value={Math.max(budgetLimit - periodExpenses, 0)}
                size="amountSm"
                tone={budgetLimit - periodExpenses > 0 ? 'mid' : 'expense'}
                align="right"
                currency={`${deviseSymbol} ${t('budget_reste')}`}
                masked={isDiscreteMode}
                style={styles.budgetLeft}
              />
            </Card>
          </Rise>
        )}

        {/* Transactions récentes, groupées par jour */}
        <Rise index={9}>
          <View style={styles.sectionHead}>
            <Text style={[typography.subtitle, { color: colors.ink }]}>
              {t('toutes_operations')}
            </Text>
            <View style={styles.sectionActions}>
              {filtered.length > RECENT_LIMIT && !query && (
                <TouchableOpacity
                  onPress={() => setShowHistory(true)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('voir_tout')}
                >
                  <Text style={[typography.bodyStrong, { color: colors.accent }]}>
                    {t('voir_tout')}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setSearchOpen((v) => !v)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={t('rechercher')}
              >
                <Search color={query ? accentColor : colors.inkMid} size={18} />
              </TouchableOpacity>
            </View>
          </View>
        </Rise>

        {searchOpen || query ? (
          <View style={styles.searchBar}>
            <TextInput
              style={[styles.searchInput, { color: colors.ink }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('rechercher')}
              placeholderTextColor={colors.inkFaint}
              autoFocus={searchOpen && !query}
              returnKeyType="search"
              accessibilityLabel={t('rechercher')}
            />
            {query ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={t('annuler')}
              >
                <X color={colors.inkMid} size={16} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {query && filtered.length === 0 ? (
          <Text style={[styles.footnote, { color: colors.inkFaint }]}>
            {t('aucun_resultat')} « {query} »
          </Text>
        ) : null}

        {filtered.length === 0 && !query ? (
          <EmptyState
            illustration={
              <View style={[styles.emptyCircle, { backgroundColor: colors.accentSoft }]}>
                <Wallet color={colors.accent} size={30} />
              </View>
            }
            title={t('aucune_operation')}
            actionLabel={t('ajouter_premiere')}
            onAction={goAdd}
          />
        ) : (
          groups.map((g) => (
            <View key={g.key}>
              <Text style={[typography.caption, styles.groupLabel, { color: colors.inkFaint }]}>
                {g.label}
              </Text>
              {g.items.map((item) => {
                if (!item) return null;
                const isSelected = selectedIds.has(item.id);
                const tone = toneOf(item);
                const isTransfer = tone === 'transfer';
                const visual = CATEGORY_VISUAL[item.category] || CATEGORY_VISUAL['Autres'];
                const CatIcon = visual.Icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    style={[
                      styles.row,
                      isSelected && { backgroundColor: colors.accentSoft, borderRadius: radius.sm },
                    ]}
                    onPress={() => {
                      if (selectionMode) {
                        toggleSelection(item.id);
                      } else {
                        setEditingTransaction(item);
                        navigation?.navigate('Ajout');
                      }
                    }}
                    onLongPress={() => {
                      if (!selectionMode) select(item.id);
                    }}
                    accessibilityRole="button"
                  >
                    <View style={[styles.catCircle, { backgroundColor: `${visual.color}22` }]}>
                      <CatIcon color={visual.color} size={19} />
                    </View>
                    <View style={styles.rowMain}>
                      <Text
                        style={[typography.bodyStrong, styles.rowTitle, { color: colors.ink }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <View style={styles.rowMeta}>
                        <Text style={[typography.caption, { color: colors.inkMid }]} numberOfLines={1}>
                          {t(CATEGORY_KEY_MAP[item.category] || 'general')}
                        </Text>
                        <Text style={[typography.caption, { color: colors.inkFaint }]}>
                          {formatTime(item.date)}
                        </Text>
                      </View>
                      {item.note ? (
                        <Text style={[typography.micro, styles.rowNote, { color: colors.inkFaint }]} numberOfLines={1}>
                          {item.note}
                        </Text>
                      ) : null}
                    </View>

                    <Amount
                      value={toNumber(item.amount)}
                      currency={deviseSymbol}
                      size="amount"
                      tone={tone}
                      signed={!isTransfer}
                      masked={isDiscreteMode}
                      style={styles.rowAmount}
                    />

                    {selectionMode ? (
                      isSelected ? (
                        <CheckSquare color={accentColor} size={22} style={styles.rowCheck} />
                      ) : (
                        <Square color={colors.inkFaint} size={22} style={styles.rowCheck} />
                      )
                    ) : !isDiscreteMode ? (
                      <TouchableOpacity
                        onPress={() => handleDelete(item)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={styles.rowDelete}
                        accessibilityRole="button"
                        accessibilityLabel={t('supprimer')}
                      >
                        <Trash2 color={colors.inkFaint} size={16} />
                      </TouchableOpacity>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}

        {filtered.length > 0 && !selectionMode ? (
          <Text style={[styles.footnote, { color: colors.inkFaint }]}>
            {t('appuie_poubelle')}
          </Text>
        ) : null}
      </ScrollView>

      <PinAuthModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onUnlock={async (pin) => {
          try {
            await unlockDiscreteMode(pin);
            setShowPinModal(false);
            return true;
          } catch (e) {
            const txt = await getRemainingAttemptsText(userId).catch(() => '');
            setPinRemainingText(txt);
            throw e;
          }
        }}
        onSaveNewPin={(pin) => {
          saveNewPin(pin);
          setShowPinModal(false);
        }}
        remainingText={pinRemainingText}
        hasPin={hasPinCode}
        isDark={isDark}
        accentColor={accentColor}
      />

      {showDebts && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
          <DebtsScreen onClose={() => setShowDebts(false)} />
        </View>
      )}

      {showTontines && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
          <TontinesScreen onClose={() => setShowTontines(false)} />
        </View>
      )}

      {showHistory && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
          <HistoryScreen onClose={() => setShowHistory(false)} navigation={navigation} />
        </View>
      )}
    </SafeAreaView>
  );
}

/** Dette / tontine : une cellule compacte du même motif que la page. */
function DebtCell({ label, value, currency, tone, colors, styles }) {
  return (
    <View style={styles.debtCell}>
      <Text style={[typography.micro, { color: colors.inkFaint }]} numberOfLines={1}>{label}</Text>
      <Amount value={value} currency={currency} size="amount" tone={tone} signed style={styles.debtAmount} />
    </View>
  );
}

const createStyles = (cp, cpad) => StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: {
    paddingHorizontal: cpad,
    paddingBottom: 48,
    maxWidth: cp,
    width: '100%',
    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget,
    marginTop: 8,
    marginBottom: 16,
    gap: 12,
  },
  hello: { flex: 1, minWidth: 0 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  syncDot: { width: 5, height: 5, borderRadius: 3 },
  selectionCount: { flex: 1 },
  privacyHit: { marginLeft: 'auto', padding: 4 },

  /* Carte héro */
  hero: { borderRadius: radius.xl, padding: 20, marginBottom: 20 },
  displayAmount: { marginTop: 8 },
  heroFlow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  heroCell: { flex: 1, minWidth: 0 },
  heroDivider: { width: 1, alignSelf: 'stretch', opacity: 0.35, marginHorizontal: 12 },

  /* Carrousel */
  blockLabel: { marginBottom: 10 },
  carousel: { gap: 12, paddingRight: 4 },
  walletCard: { borderRadius: radius.lg, padding: 16, minHeight: 128, justifyContent: 'space-between', gap: 8 },
  walletTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  /* Actions rapides */
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18 },
  quick: { flex: 1, alignItems: 'center', gap: 6, minHeight: touchTarget, justifyContent: 'center' },
  quickCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },

  /* Dettes */
  debtRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  debtCell: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  debtAmount: { marginTop: 3 },

  /* Sparkline + budget */
  sparkHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  budgetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  budgetLeft: { marginTop: 8 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    minHeight: touchTarget,
  },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },

  groupLabel: { marginTop: 14, marginBottom: 2 },

  /* Une ligne d'opération : pastille catégorie + colonne de montants. */
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  catCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { marginBottom: 2 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowNote: { marginTop: 2 },
  rowAmount: { minWidth: 96 },
  rowCheck: { marginLeft: 4 },
  rowDelete: { padding: 6, marginRight: -2 },

  footnote: { ...typography.micro, marginTop: 14 },

  emptyCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
