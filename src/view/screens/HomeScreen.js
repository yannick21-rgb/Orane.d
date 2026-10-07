import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  LayoutAnimation,
  TextInput,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
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
import { Trash2, CheckSquare, Square, X, Eye, EyeOff, Search } from 'lucide-react-native';
import PinAuthModal from '../components/PinAuthModal';
import { buildColors } from '../theme';
import { DEFAULT_ACCENT } from '../../model/ThemeModel';
import { type } from '../theme/type';
import { radius, touchTarget } from '../theme/tokens';
import { Amount, Button, Cells, Cell, Rule, SectionHeader } from '../components/ui';

/* ------------------------------------------------------------------ */
/* Catégories                                                          */
/* ------------------------------------------------------------------ */

/**
 * Les catégories ne sont plus des emoji.
 *
 * Douze pictogrammes système pour douze catégories : ils ne partagent ni la
 * même taille, ni la même ligne de base, ni les mêmes couleurs d'une
 * plateforme à l'autre, et ils finissent par raconter autre chose que la
 * catégorie. Ici la catégorie est *nommée* en toutes lettres, et c'est la
 * colonne des montants qui porte le sens de l'opération (signe et couleur).
 */

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

const INCOME_TYPES = ['income', 'revenu'];

/** Teinte du montant : c'est elle qui dit si l'argent entre ou sort. */
function toneOf(item) {
  if (item.type === 'transfert') return 'transfer';
  if (INCOME_TYPES.includes(item.type)) return 'income';
  return 'expense';
}

export default function HomeScreen({ navigation }) {
  usePreventScreenCapture();
  const { t, currentLanguage } = useTranslation();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinRemainingText, setPinRemainingText] = useState('');
  const [syncStatus, setSyncStatus] = useState({ pendingCount: 0 });

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
  } = useFinance();

  const { totalToReceive, totalToRepay } = useDebts();
  const { overallSummary } = useTontines();
  const { userId, loading } = useAuth();
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

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d)) return '';
    const locale = currentLanguage === 'en' ? 'en-US' : currentLanguage === 'es' ? 'es-ES' : 'fr-FR';
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
  };

  const hasDebts = totalToReceive > 0 || totalToRepay > 0 || overallSummary.totalPaid > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContainer}
      >
        {/* En-tête : la marque, l'état de la synchronisation, la vie privée */}
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
              <Text style={[styles.selectionCount, type.heading, { color: colors.ink }]}>
                {selectedIds.size} {selectedIds.size > 1 ? t('operationsLabel') : t('operationLabel')}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.wordmark, type.title, { color: colors.ink }]}>Orane</Text>
              {userId && syncStatus.pendingCount > 0 ? (
                <View style={styles.syncRow}>
                  <View style={[styles.syncDot, { backgroundColor: colors.warning }]} />
                  <Text style={[type.micro, { color: colors.inkMid }]}>
                    {syncStatus.pendingCount} {t('en_attente')}
                  </Text>
                </View>
              ) : null}
            </>
          )}

          <TouchableOpacity
            onPress={() => {
              if (isDiscreteMode) {
                setShowPinModal(true);
              } else {
                toggleDiscreteMode();
              }
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.privacyHit}
            accessibilityRole="button"
            accessibilityLabel={isDiscreteMode ? t('mode_discret') : t('mode_visible')}
          >
            {isDiscreteMode ? (
              <EyeOff color={colors.inkMid} size={22} />
            ) : (
              <Eye color={colors.inkMid} size={22} />
            )}
          </TouchableOpacity>
        </View>

        {/* Le solde. Le seul chiffre que l'écran ne traite pas comme un égal. */}
        <View style={styles.balance}>
          <Text style={[type.micro, { color: colors.inkMid }]}>{t('solde_disponible')}</Text>
          <Amount
            value={available}
            currency={deviseSymbol}
            size="display"
            align="left"
            masked={isDiscreteMode}
            style={styles.displayAmount}
          />
        </View>

        {/* Mouvements de la période affichée — le motif de cellules, réutilisé
            plus bas pour la progression. */}
        <View style={styles.flowRow}>
          <Cells>
            <Cell label={t('label_revenus')}>
              <Amount value={totalIncome} currency={deviseSymbol} size="figure" tone="income" signed align="left" masked={isDiscreteMode} />
            </Cell>
            <Cell label={t('label_depenses')}>
              <Amount value={totalExpenses} currency={deviseSymbol} size="figure" tone="expense" align="left" masked={isDiscreteMode} />
            </Cell>
          </Cells>
        </View>

        <Rule tone="soft" />

        {/* Les trois poches. Une seule ligne : on les consulte, on ne les
           governent pas. */}
        <View style={styles.pocketRow}>
          {[
            { name: t('pocket_momo'), value: momoBalance },
            { name: t('pocket_especes'), value: cashBalance },
            { name: t('pocket_banque'), value: banqueBalance },
          ].map((p, i) => (
            <React.Fragment key={p.name}>
              {i > 0 ? <Rule vertical tone="soft" /> : null}
              <View style={styles.pocket}>
                <Text style={[type.micro, { color: colors.inkFaint }]} numberOfLines={1}>{p.name}</Text>
                <Amount
                  value={p.value || 0}
                  size="amountSm"
                  tone="mid"
                  masked={isDiscreteMode}
                  style={styles.pocketAmount}
                />
              </View>
            </React.Fragment>
          ))}
        </View>

        {hasDebts && !isDiscreteMode && (
          <>
            <Rule />
            <View style={styles.debtRow}>
              {totalToReceive > 0 ? (
                <DebtCell label={t('a_recevoir')} value={totalToReceive} currency={deviseSymbol} tone="income" colors={colors} />
              ) : null}
              {totalToRepay > 0 ? (
                <DebtCell label={t('a_rembourser')} value={totalToRepay} currency={deviseSymbol} tone="expense" colors={colors} />
              ) : null}
              {overallSummary.totalPaid > 0 ? (
                <DebtCell label={t('tontine')} value={overallSummary.totalPaid} currency={deviseSymbol} tone="transfer" colors={colors} />
              ) : null}
            </View>
          </>
        )}

        <Rule />
        <View style={styles.sectionHead}>
          <SectionHeader
            title={t('toutes_operations')}
            style={styles.sectionHeaderInner}
            trailing={
              <TouchableOpacity
                onPress={() => setSearchOpen((v) => !v)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={t('rechercher')}
              >
                <Search color={query ? accentColor : colors.inkMid} size={18} />
              </TouchableOpacity>
            }
          />
        </View>

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
          <View style={styles.empty}>
            <Text style={[type.body, { color: colors.inkMid }]}>{t('aucune_operation')}</Text>
            <Button
              label={t('ajouter_premiere')}
              onPress={() => { setEditingTransaction(null); navigation?.navigate('Ajout'); }}
              size="md"
              style={styles.emptyButton}
            />
          </View>
        ) : (
          filtered.map((item, index) => {
            if (!item) return null;
            const isSelected = selectedIds.has(item.id);
            const tone = toneOf(item);
            const isTransfer = tone === 'transfer';
            return (
              <View key={item.id}>
                <Rule />
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    styles.row,
                    isSelected && { backgroundColor: colors.accentSoft },
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
                  <View style={styles.rowMain}>
                    <Text
                      style={[type.bodyStrong, styles.rowTitle, { color: colors.ink }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>

                    <View style={styles.rowMeta}>
                      <Text style={[type.label, { color: colors.inkMid }]} numberOfLines={1}>
                        {t(CATEGORY_KEY_MAP[item.category] || 'general')}
                      </Text>
                      <Text style={[type.label, { color: colors.inkFaint }]}>
                        {formatDate(item.date)}
                      </Text>
                    </View>

                    {item.note ? (
                      <Text style={[type.micro, styles.rowNote, { color: colors.inkFaint }]} numberOfLines={1}>
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
              </View>
            );
          })
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
    </SafeAreaView>
  );
}

/** Dette / tontine : une cellule du même motif que le reste de la page. */
function DebtCell({ label, value, currency, tone, colors }) {
  return (
    <View style={styles.debtCell}>
      <Text style={[type.micro, { color: colors.inkFaint }]} numberOfLines={1}>{label}</Text>
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
    marginBottom: 24,
    gap: 12,
  },
  wordmark: { flexShrink: 1 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  syncDot: { width: 5, height: 5, borderRadius: radius.pill },
  selectionCount: { flex: 1 },
  privacyHit: { marginLeft: 'auto', padding: 4 },

  /* Le solde — le seul corps très marqué de l'app. */
  balance: { marginBottom: 20 },
  displayAmount: { marginTop: 6 },

  flowRow: { paddingBottom: 16 },

  /* Les trois poches sur une seule ligne. */
  pocketRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  pocket: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  pocketAmount: { marginTop: 3 },

  debtRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  debtCell: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  debtAmount: { marginTop: 3 },

  sectionHead: { paddingTop: 20 },
  sectionHeaderInner: { marginBottom: 0 },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },

  /* Une ligne d'opération : elle repose sur un filet, pas dans une boîte. */
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { marginBottom: 3 },
  rowMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  rowNote: { marginTop: 3 },
  rowAmount: { minWidth: 96 },
  rowCheck: { marginLeft: 4 },
  rowDelete: { padding: 6, marginRight: -2 },

  footnote: { ...type.micro, marginTop: 14 },

  empty: { alignItems: 'flex-start', paddingVertical: 28 },
  emptyButton: { marginTop: 18 },
});