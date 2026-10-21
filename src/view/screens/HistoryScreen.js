/**
 * Historique complet — FlashList, sections jour collantes, recherche et
 * filtres (type, portefeuille, catégorie, période).
 *
 * Suppression par swipe avec confirmation puis bandeau « Annuler » :
 * l'annulation ré-enregistre l'écriture à l'identique (même id) via
 * `addTransaction`, sans toucher à la logique de persistance.
 * Modification par swipe : reprend le flux d'édition existant
 * (`setEditingTransaction` + écran Ajout).
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Swipeable } from 'react-native-gesture-handler';
import {
  X, Search, Check, Trash2, SlidersHorizontal, Wallet,
  ShoppingCart, Car, Home as HomeIcon, HeartPulse, Gamepad2,
  Shirt, Briefcase, PiggyBank, Tag, Smartphone, GraduationCap, Star,
  CreditCard, Trophy, RefreshCcw, Receipt, Laptop, Globe,
  Gift, Handshake, ShoppingBag,
} from 'lucide-react-native';
import { useFinance } from '../../viewmodel/FinanceContext';
import { sync } from '../../utils/sync';
import { useQuickAdd } from '../components/QuickAddContext';
import { useTranslation } from '../../utils/LanguageManager';
import { toNumber } from '../../utils/format';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../model/TransactionModel';
import {
  isTransactionInCurrentWeek,
  isTransactionInMonth,
} from '../../utils/transactionDates';
import { useColors } from '../theme';
import { typography } from '../theme/typography';
import { radius } from '../theme/tokens';
import { Amount, Chip, EmptyState, Snackbar } from '../components/ui';

const CAT_TKEY = {};
[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].forEach((c) => { CAT_TKEY[c.key] = c.tKey; });
const LEGACY_TKEY = {
  'Vêtements': 'vetements',
  'Salaire': 'salaire',
  'Général': 'general',
  'Retrait MoMo': 'frais_retraits_cat',
};

const CAT_VISUAL = {
  'Alimentation': { Icon: ShoppingCart, color: '#E0913D' },
  'Transport': { Icon: Car, color: '#5AA9E6' },
  'Logement': { Icon: HomeIcon, color: '#9B7BE8' },
  'Santé': { Icon: HeartPulse, color: '#E05A7A' },
  'Loisirs': { Icon: Gamepad2, color: '#3FC1C9' },
  'Vêtements': { Icon: Shirt, color: '#C9A86A' },
  'Habillement': { Icon: Shirt, color: '#C9A86A' },
  'Salaire': { Icon: Briefcase, color: '#2ecc71' },
  'Salaire / Coaching': { Icon: Briefcase, color: '#2ecc71' },
  'Épargne': { Icon: PiggyBank, color: '#1FA97A' },
  'Général': { Icon: Tag, color: '#8A93A3' },
  'Autres': { Icon: Star, color: '#8A93A3' },
  'Retrait MoMo': { Icon: Smartphone, color: '#E08A1E' },
  'Education/Formation': { Icon: GraduationCap, color: '#7C4DE0' },
  'Abonnements & Tech': { Icon: CreditCard, color: '#4A5BF0' },
  'Sport': { Icon: Trophy, color: '#E05A7A' },
  'Remboursement': { Icon: RefreshCcw, color: '#8A93A3' },
  'Frais & Retraits': { Icon: Receipt, color: '#E08A1E' },
  'Freelance / Dev': { Icon: Laptop, color: '#5AA9E6' },
  'Projets Web': { Icon: Globe, color: '#4A5BF0' },
  'Cadeau': { Icon: Gift, color: '#E05A7A' },
  'Emprunt': { Icon: Handshake, color: '#E08A1E' },
  'Ventes': { Icon: ShoppingBag, color: '#E0913D' },
  'Loisirs ': { Icon: Gamepad2, color: '#3FC1C9' },
};

const FALLBACK_VISUAL = { Icon: Tag, color: '#8A93A3' };
const INCOME_TYPES = ['income', 'revenu'];

function normType(ty) {
  if (ty === 'expense') return 'depense';
  if (ty === 'income') return 'revenu';
  return ty;
}

function toneOf(item) {
  if (item.type === 'transfert') return 'transfer';
  if (INCOME_TYPES.includes(item.type)) return 'income';
  return 'expense';
}

export default function HistoryScreen({ onClose, navigation }) {
  const { t, currentLanguage } = useTranslation();
  const colors = useColors();
  const {
    transactions = [],
    deleteTransaction,
    addTransaction,
    setEditingTransaction,
    devise,
    isDiscreteMode,
  } = useFinance();
  const deviseSymbol = devise?.split(' ')[0] || '€';
  const locale = currentLanguage === 'en' ? 'en-US' : currentLanguage === 'es' ? 'es-ES' : 'fr-FR';

  const [query, setQuery] = useState('');
  // La saisie met à jour `query` (champ réactif) ; le filtrage n'est relancé
  // qu'après une courte pause, pour ne pas recalculer/trier toute la liste à
  // chaque frappe.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(id);
  }, [query]);
  const [typeF, setTypeF] = useState('tout');
  const [walletF, setWalletF] = useState('tout');
  const [catF, setCatF] = useState('tout');
  const [periodF, setPeriodF] = useState('tout');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [snack, setSnack] = useState(null);
  const swipeRefs = useRef({});
  const quick = useQuickAdd();

  const catLabel = (key) => {
    const tKey = CAT_TKEY[key] || LEGACY_TKEY[key];
    return tKey ? t(tKey) : key;
  };

  const dayLabel = (isoString) => {
    const d = new Date(isoString);
    if (isNaN(d)) return '';
    const startOf = (x) => { const c = new Date(x); c.setHours(0, 0, 0, 0); return c; };
    const diff = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
    if (diff === 0) return t('aujourdhui');
    if (diff === 1) return t('hier');
    return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  const presentCats = useMemo(() => {
    const counts = {};
    (transactions || []).forEach((tx) => {
      if (tx?.category) counts[tx.category] = (counts[tx.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return [...(transactions || []).filter(Boolean)]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .filter((tx) => {
        if (typeF !== 'tout' && normType(tx.type) !== typeF) return false;
        if (walletF !== 'tout' && (tx.wallet || 'momo') !== walletF) return false;
        if (catF !== 'tout' && tx.category !== catF) return false;
        if (periodF === 'semaine' && !isTransactionInCurrentWeek(tx)) return false;
        if (periodF === 'mois' && !isTransactionInMonth(tx)) return false;
        if (q && !((tx.title || '').toLowerCase().includes(q) || (tx.note || '').toLowerCase().includes(q))) return false;
        return true;
      });
  }, [transactions, debouncedQuery, typeF, walletF, catF, periodF]);

  const hasFilters = query.trim() || typeF !== 'tout' || walletF !== 'tout' || catF !== 'tout' || periodF !== 'tout';
  const resetFilters = () => {
    setQuery('');
    setTypeF('tout');
    setWalletF('tout');
    setCatF('tout');
    setPeriodF('tout');
  };

  const flat = useMemo(() => {
    const out = [];
    const sticky = [];
    let currentKey = null;
    filtered.forEach((tx) => {
      const d = new Date(tx.date);
      const key = isNaN(d) ? '?' : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (key !== currentKey) {
        currentKey = key;
        sticky.push(out.length);
        out.push({ kind: 'header', key: `h-${key}-${out.length}`, label: dayLabel(tx.date) });
      }
      out.push({ kind: 'row', key: tx.id, item: tx });
    });
    return { out, sticky };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, currentLanguage]);

  const closeSwipe = (id) => swipeRefs.current[id]?.close?.();

  const confirmDelete = (item) => {
    closeSwipe(item.id);
    Alert.alert(
      t('supprimer'),
      `"${item.title || t('cette_operation')}" ?`,
      [
        { text: t('annuler'), style: 'cancel' },
        {
          text: t('supprimer'),
          style: 'destructive',
          onPress: () => {
            // Capture la transaction sœur `${id}_fee` (frais de retrait MoMo)
            // avant suppression : l'undo doit la remettre aussi, sinon le
            // retrait revient mais ses frais sont perdus.
            const feeTx = transactions.find((x) => x && x.id === `${item.id}_fee`);
            deleteTransaction(item.id);
            setSnack({ item, feeTx });
          },
        },
      ]
    );
  };

  const undoDelete = () => {
    if (snack?.item) {
      // Retire le tombstone posé par `deleteTransaction` AVANT de ré-ajouter :
      // sinon le filtre `sync.filterDeleted` au prochain lancement retirait à
      // nouveau la ligne et l'annulation était perdue (perte de données).
      sync
        .clearTombstones('transactions', [snack.item.id, `${snack.item.id}_fee`])
        .catch(() => {});
      addTransaction({ ...snack.item });
      if (snack.feeTx) addTransaction({ ...snack.feeTx });
    }
    setSnack(null);
  };

  const editItem = (item) => {
    closeSwipe(item.id);
    setEditingTransaction(item);
    onClose();
  };

  const renderRow = ({ item }) => {
    if (item.kind === 'header') {
      return (
        <Text style={[typography.caption, styles.groupLabel, { color: colors.inkFaint, backgroundColor: colors.bg }]}>
          {item.label}
        </Text>
      );
    }
    const tx = item.item;
    const tone = toneOf(tx);
    const isTransfer = tone === 'transfer';
    const visual = CAT_VISUAL[tx.category] || FALLBACK_VISUAL;
    const CatIcon = visual.Icon;
    return (
      <Swipeable
        ref={(ref) => {
          if (ref) swipeRefs.current[tx.id] = ref;
          else delete swipeRefs.current[tx.id];
        }}
        overshootLeft={false}
        overshootRight={false}
        onSwipeableOpen={(dir) => {
          if (dir === 'left') confirmDelete(tx);
          if (dir === 'right') editItem(tx);
        }}
        renderRightActions={() => (
          <TouchableOpacity
            style={[styles.swipeAction, { backgroundColor: colors.danger }]}
            onPress={() => confirmDelete(tx)}
            accessibilityRole="button"
            accessibilityLabel={t('supprimer')}
          >
            <Trash2 size={20} color="#ffffff" />
          </TouchableOpacity>
        )}
        renderLeftActions={() => (
          <TouchableOpacity
            style={[styles.swipeAction, { backgroundColor: colors.accent }]}
            onPress={() => editItem(tx)}
            accessibilityRole="button"
            accessibilityLabel={t('mettre_a_jour')}
          >
            <Check size={20} color={colors.accentFg} />
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => editItem(tx)}
          accessibilityRole="button"
        >
          <View style={[styles.catCircle, { backgroundColor: `${visual.color}22` }]}>
            <CatIcon color={visual.color} size={19} />
          </View>
          <View style={styles.rowMain}>
            <Text style={[typography.bodyStrong, { color: colors.ink }]} numberOfLines={1}>
              {tx.title}
            </Text>
            <View style={styles.rowMeta}>
              <Text style={[typography.caption, { color: colors.inkMid }]} numberOfLines={1}>
                {catLabel(tx.category)}
              </Text>
              <Text style={[typography.caption, { color: colors.inkFaint }]}>
                {formatTime(tx.date)}
              </Text>
            </View>
          </View>
          <Amount
            value={toNumber(tx.amount)}
            currency={deviseSymbol}
            size="amount"
            tone={tone}
            signed={!isTransfer}
            masked={isDiscreteMode}
            style={styles.rowAmount}
          />
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.rule }]}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={t('annuler')}>
          <X size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={[typography.title, { color: colors.ink }]}>
          {t('toutes_operations')} · {filtered.length}
        </Text>
        <TouchableOpacity
          onPress={() => setFiltersOpen((v) => !v)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('rechercher')}
        >
          <SlidersHorizontal color={hasFilters ? colors.accent : colors.inkMid} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Search color={colors.inkFaint} size={18} />
        <TextInput
          style={[styles.searchInput, { color: colors.ink }]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('rechercher')}
          placeholderTextColor={colors.inkFaint}
          returnKeyType="search"
          accessibilityLabel={t('rechercher')}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={t('annuler')}>
            <X color={colors.inkMid} size={16} />
          </TouchableOpacity>
        ) : null}
      </View>

      {filtersOpen && (
        <View style={styles.filters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Chip label={t('tout')} selected={typeF === 'tout'} onPress={() => setTypeF('tout')} />
            <Chip label={t('label_depenses')} selected={typeF === 'depense'} onPress={() => setTypeF('depense')} />
            <Chip label={t('label_revenus')} selected={typeF === 'revenu'} onPress={() => setTypeF('revenu')} />
            <Chip label={t('type_transfert')} selected={typeF === 'transfert'} onPress={() => setTypeF('transfert')} />
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Chip label={t('tout')} selected={walletF === 'tout'} onPress={() => setWalletF('tout')} />
            <Chip label={t('pocket_momo')} selected={walletF === 'momo'} onPress={() => setWalletF('momo')} />
            <Chip label={t('pocket_especes')} selected={walletF === 'cash'} onPress={() => setWalletF('cash')} />
            <Chip label={t('pocket_banque')} selected={walletF === 'banque'} onPress={() => setWalletF('banque')} />
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Chip label={t('tout')} selected={periodF === 'tout'} onPress={() => setPeriodF('tout')} />
            <Chip label={t('semaine')} selected={periodF === 'semaine'} onPress={() => setPeriodF('semaine')} />
            <Chip label={t('mois')} selected={periodF === 'mois'} onPress={() => setPeriodF('mois')} />
          </ScrollView>
          {presentCats.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Chip label={t('tout')} selected={catF === 'tout'} onPress={() => setCatF('tout')} />
              {presentCats.map((c) => (
                <Chip key={c} label={catLabel(c)} selected={catF === c} onPress={() => setCatF(catF === c ? 'tout' : c)} />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <View style={styles.listWrap}>
        <FlashList
          data={flat.out}
          keyExtractor={(it) => it.key}
          renderItem={renderRow}
          getItemType={(it) => it.kind}
          stickyHeaderIndices={flat.sticky}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              illustration={
                <View style={[styles.emptyCircle, { backgroundColor: colors.accentSoft }]}>
                  {hasFilters
                    ? <Search color={colors.accent} size={30} />
                    : <Wallet color={colors.accent} size={30} />}
                </View>
              }
              title={hasFilters ? t('aucun_resultat') : t('aucune_operation')}
              message={hasFilters ? `« ${query.trim()} »` : undefined}
              actionLabel={hasFilters ? t('reinit_filtres') : t('ajouter_premiere')}
              onAction={hasFilters ? resetFilters : () => quick.open('expense')}
            />
          }
        />
      </View>

      <Snackbar
        visible={!!snack}
        message={t('operation_supprimee')}
        actionLabel={t('annuler')}
        onAction={undoDelete}
        onDismiss={() => setSnack(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  filters: { paddingBottom: 8, gap: 8 },
  chipRow: { gap: 8, paddingHorizontal: 20 },
  listWrap: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  groupLabel: { paddingTop: 14, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  catCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, minWidth: 0 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  rowAmount: { minWidth: 96 },
  swipeAction: { width: 72, borderRadius: radius.md, marginVertical: 6, alignItems: 'center', justifyContent: 'center' },
  emptyCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
