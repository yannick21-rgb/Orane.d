import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
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
import { useTranslation } from '../../utils/LanguageManager';
import { toNumber } from '../../utils/format';
import { Trash2, CheckSquare, Square, X, Eye, EyeOff } from 'lucide-react-native';
import PinAuthModal from '../components/PinAuthModal';

const CATEGORY_ICONS = {
  'Alimentation': '🛒',
  'Transport':    '🚗',
  'Logement':     '🏠',
  'Santé':        '💊',
  'Loisirs':      '🎮',
  'Vêtements':    '👗',
  'Salaire':      '💼',
  'Épargne':      '🏦',
  'Général':      '📦',
};

const CATEGORY_KEY_MAP = {
  'Alimentation': 'alimentation',
  'Transport':    'transport',
  'Logement':     'logement',
  'Santé':        'sante',
  'Loisirs':      'loisirs',
  'Vêtements':    'vetements',
  'Salaire':      'salaire',
  'Épargne':      'epargne',
  'Général':      'general',
  'Retrait MoMo': 'frais_retraits_cat',
};

export default function HomeScreen({ navigation }) {
  usePreventScreenCapture();
  const { t, currentLanguage } = useTranslation();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinRemainingText, setPinRemainingText] = useState('');

  const {
    transactions = [],
    isDark = false,
    accentColor = '#3b82f6',
    deleteTransaction,
    deleteMultipleTransactions,
    devise,
    isDiscreteMode,
    hasPinCode,
    isUserDataLoaded,
    saveNewPin,
    unlockDiscreteMode,
    toggleDiscreteMode,
    momoBalance,
    cashBalance,
  } = useFinance();

  const { totalToReceive, totalToRepay } = useDebts();
  const { overallSummary } = useTontines();
  const { userId } = useAuth();

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

  const deviseSymbol = devise?.split(' ')[0] || '€';

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const colors = {
    bg:      isDark ? '#0f1015' : '#f5f6fa',
    cardBg:  isDark ? '#16171f' : '#ffffff',
    text:    isDark ? '#ffffff' : '#131419',
    subText: isDark ? '#8c8e9b' : '#6a6c7a',
    border:  isDark ? 'transparent' : '#eef0f5',
    income:  '#2ecc71',
    expense: '#ff5c5c',
  };

  const safeTransactions = Array.isArray(transactions)
    ? transactions.filter(Boolean)
    : [];

  const sorted = [...safeTransactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const totalIncome = sorted
    .filter((t) => t.type === 'income' || t.type === 'revenu')
    .reduce((sum, t) => sum + Math.abs(toNumber(t.amount)), 0);

  const totalExpenses = sorted
    .filter((t) => (t.type === 'expense' || t.type === 'depense') && t.type !== 'transfert')
    .reduce((sum, t) => sum + Math.abs(toNumber(t.amount)), 0);

  const enterSelectionMode = (id) => {
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

  const getTxIcon = (item) => {
    if (item.type === 'transfert') return '💸';
    if (item.category && CATEGORY_ICONS[item.category]) {
      return CATEGORY_ICONS[item.category];
    }
    return item.type === 'income' || item.type === 'revenu' ? '💰' : '📦';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>

        {selectionMode ? (
          <View style={styles.selectionBar}>
            <TouchableOpacity onPress={cancelSelection} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X color={colors.text} size={20} />
            </TouchableOpacity>
            <Text style={[styles.selectionCount, { color: colors.text }]}>
              {selectedIds.size} {selectedIds.size > 1 ? t('operationsLabel') : t('operationLabel')}
            </Text>
            <TouchableOpacity onPress={handleBulkDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Trash2 color={colors.expense} size={20} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                {t('home')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (isDiscreteMode) {
                  setShowPinModal(true);
                } else {
                  toggleDiscreteMode();
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isDiscreteMode ? (
                <EyeOff color={colors.subText} size={24} />
              ) : (
                <Eye color={accentColor} size={24} />
              )}
            </TouchableOpacity>
          </View>
        )}

        <View
          style={[
            styles.mainCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: isDark ? 0 : 1 },
          ]}
        >
          {/* Solde MoMo */}
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.mainLabel, { color: colors.subText }]}>📱 Solde MoMo</Text>
            <Text style={[styles.mainValue, { color: colors.text }]}>
              {isDiscreteMode ? '••••' : `${momoBalance >= 0 ? '+' : '-'}${Math.abs(momoBalance).toFixed(2)} ${deviseSymbol}`}
            </Text>
          </View>

          <View style={{ height: 1, backgroundColor: isDark ? '#222431' : '#eef0f5' }} />

          {/* Solde Cash */}
          <View style={{ marginTop: 16, marginBottom: 16 }}>
            <Text style={[styles.mainLabel, { color: colors.subText }]}>💵 Solde Espèces</Text>
            <Text style={[styles.mainValue, { color: colors.text }]}>
              {isDiscreteMode ? '••••' : `${cashBalance >= 0 ? '+' : '-'}${Math.abs(cashBalance).toFixed(2)} ${deviseSymbol}`}
            </Text>
          </View>

          <View style={styles.rowStats}>
            <View style={styles.statContainer}>
              <Text style={[styles.statLabel, { color: colors.subText }]}>{t('revenus')}</Text>
              <Text style={[styles.statValue, { color: colors.income }]}>
                {isDiscreteMode ? '••••' : `+${totalIncome.toFixed(2)} ${deviseSymbol}`}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? '#222431' : '#eef0f5' }]} />
            <View style={styles.statContainer}>
              <Text style={[styles.statLabel, { color: colors.subText }]}>{t('depenses')}</Text>
              <Text style={[styles.statValue, { color: colors.expense }]}>
                {isDiscreteMode ? '••••' : `-${totalExpenses.toFixed(2)} ${deviseSymbol}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Solde total combiné (compact) */}
        <View style={{ marginTop: -20, marginBottom: 24, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: colors.subText }}>
            Total : {isDiscreteMode ? '••••' : `${(momoBalance + cashBalance) >= 0 ? '+' : '-'}${Math.abs(momoBalance + cashBalance).toFixed(2)} ${deviseSymbol}`}
          </Text>
        </View>

        {(totalToReceive > 0 || totalToRepay > 0 || overallSummary.totalPaid > 0) && !isDiscreteMode && (
          <View style={styles.debtSummaryRow}>
            {totalToReceive > 0 && (
              <View style={[styles.debtBadge, { backgroundColor: '#2ecc71' + '20' }]}>
                <Text style={styles.debtBadgeIcon}>💸</Text>
                <View>
                  <Text style={[styles.debtBadgeLabel, { color: colors.subText }]}>À recevoir</Text>
                  <Text style={[styles.debtBadgeValue, { color: '#2ecc71' }]}>
                    +{totalToReceive.toLocaleString()} {deviseSymbol}
                  </Text>
                </View>
              </View>
            )}
            {totalToRepay > 0 && (
              <View style={[styles.debtBadge, { backgroundColor: '#ef4444' + '20' }]}>
                <Text style={styles.debtBadgeIcon}>💳</Text>
                <View>
                  <Text style={[styles.debtBadgeLabel, { color: colors.subText }]}>À rembourser</Text>
                  <Text style={[styles.debtBadgeValue, { color: '#ef4444' }]}>
                    -{totalToRepay.toLocaleString()} {deviseSymbol}
                  </Text>
                </View>
              </View>
            )}
            {overallSummary.totalPaid > 0 && (
              <View style={[styles.debtBadge, { backgroundColor: '#f59e0b' + '20' }]}>
                <Text style={styles.debtBadgeIcon}>🔄</Text>
                <View>
                  <Text style={[styles.debtBadgeLabel, { color: colors.subText }]}>Tontine</Text>
                  <Text style={[styles.debtBadgeValue, { color: '#f59e0b' }]}>
                    {overallSummary.totalPaid.toLocaleString()} {deviseSymbol}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('toutes_operations')}</Text>
        </View>

        {sorted.length > 0 && !selectionMode && (
          <Text style={[styles.deleteHint, { color: colors.subText }]}>
            {t('appuie_poubelle')}
          </Text>
        )}

        {sorted.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: isDark ? 0 : 1 },
            ]}
          >
            <Text style={{ fontSize: 32, marginBottom: 10 }}>💳</Text>
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              {t('aucune_operation')}
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { borderColor: accentColor }]}
              onPress={() => navigation?.navigate('Ajout')}
            >
              <Text style={[styles.emptyButtonText, { color: accentColor }]}>
                {t('ajouter_premiere')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          sorted.map((item) => {
            if (!item) return null;
            const isExpense = item.type === 'expense' || item.type === 'depense';
            const isTransfer = item.type === 'transfert';
            const isSelected = selectedIds.has(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                style={[
                  styles.txCard,
                  { backgroundColor: colors.cardBg, borderColor: isSelected ? accentColor : colors.border, borderWidth: isDark ? (isSelected ? 1.5 : 0) : 1 },
                ]}
                onPress={() => {
                  if (selectionMode) {
                    toggleSelection(item.id);
                  }
                }}
                onLongPress={() => {
                  if (!selectionMode) {
                    enterSelectionMode(item.id);
                  }
                }}
              >
                {selectionMode && (
                  <View style={styles.checkboxContainer}>
                    {isSelected ? (
                      <CheckSquare color={accentColor} size={22} />
                    ) : (
                      <Square color={colors.subText} size={22} />
                    )}
                  </View>
                )}
                <View style={styles.txLeft}>
                  <View
                    style={[
                      styles.txIconBox,
                      { backgroundColor: isExpense ? 'rgba(255,92,92,0.1)' : 'rgba(46,204,113,0.1)' },
                    ]}
                  >
                    <Text style={{ fontSize: 17 }}>{getTxIcon(item)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.txCategory, { color: colors.subText }]}>
                      {t(CATEGORY_KEY_MAP[item.category] || 'general')} · {formatDate(item.date)}
                    </Text>
                    {item.note ? (
                      <Text style={[styles.txNote, { color: colors.subText }]} numberOfLines={1}>
                        {item.note}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {!selectionMode && (
                  <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: isTransfer ? '#f59e0b' : isExpense ? colors.expense : colors.income }]}>
                      {isDiscreteMode
                        ? '••••'
                        : `${isTransfer ? '↻' : isExpense ? '-' : '+'}${Math.abs(toNumber(item.amount)).toFixed(2)} ${deviseSymbol}`
                      }
                    </Text>

                    {!isDiscreteMode && (
                      <TouchableOpacity
                        onPress={() => handleDelete(item)}
                        style={styles.deleteButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 color={colors.subText} size={16} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {selectionMode && (
                  <Text style={[styles.txAmountSelection, { color: isTransfer ? '#f59e0b' : isExpense ? colors.expense : colors.income }]}>
                    {isDiscreteMode
                      ? '••••'
                      : `${isTransfer ? '↻' : isExpense ? '-' : '+'}${Math.abs(toNumber(item.amount)).toFixed(2)} ${deviseSymbol}`
                    }
                  </Text>
                )}
              </TouchableOpacity>
            );
          })
        )}
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

const styles = StyleSheet.create({
  container:       { flex: 1 },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 25 },
  title:           { fontSize: 32, fontWeight: 'bold', marginTop: 2 },

  selectionBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 25 },
  selectionCount:  { fontSize: 16, fontWeight: 'bold' },

  mainCard:    { padding: 24, borderRadius: 28, marginBottom: 30 },
  mainLabel:   { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  mainValue:   { fontSize: 36, fontWeight: 'bold', marginTop: 8 },
  rowStats:    { flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(120,120,120,0.08)' },
  statContainer: { flex: 1 },
  statLabel:   { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  statValue:   { fontSize: 16, fontWeight: '700' },
  statDivider: { width: 1, height: 35, marginHorizontal: 15 },

  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle:   { fontSize: 18, fontWeight: 'bold' },
  deleteHint:     { fontSize: 11, fontWeight: '500', marginBottom: 14, opacity: 0.7 },

  txCard:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12 },
  checkboxContainer: { marginRight: 10 },
  txLeft:      { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  txIconBox:   { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  txTitle:     { fontSize: 15, fontWeight: '600' },
  txCategory:  { fontSize: 12, fontWeight: '500', marginTop: 2 },
  txNote:      { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  
  txRight:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txAmount:    { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  txAmountSelection: { fontSize: 14, fontWeight: 'bold', textAlign: 'right', marginLeft: 8 },
  deleteButton: { padding: 4, opacity: 0.8 },

  emptyCard:       { padding: 30, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyText:       { fontSize: 14, textAlign: 'center', marginBottom: 15 },
  emptyButton:     { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' },
  emptyButtonText: { fontSize: 13, fontWeight: '600' },

  debtSummaryRow: {
    flexDirection: 'row', gap: 12, marginBottom: 20,
  },
  debtBadge: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 16,
  },
  debtBadgeIcon: { fontSize: 22 },
  debtBadgeLabel: { fontSize: 11, fontWeight: '600' },
  debtBadgeValue: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
});
