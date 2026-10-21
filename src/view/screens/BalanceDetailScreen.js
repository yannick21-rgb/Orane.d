/**
 * Détail du solde — l'écran ouvert en appuyant sur la carte héro de l'accueil.
 *
 * Les trois cartes sont empilées de haut en bas :
 *
 * 1. **Portefeuilles** — le solde par poche (MoMo, espèces, banque) ;
 * 2. **Dépenses 7 jours** — la sparkline et son total ;
 * 3. **Budget** — la jauge dépensé / limite (masquée sans budget défini).
 *
 * Toutes les données viennent de l'accueil par props : cet écran n'a aucune
 * logique métier, il ne fait que présenter ce que `HomeScreen` a déjà calculé
 * (soldes, transactions des 7 jours, budget de la période). Le mode discret
 * est propagé tel quel — chaque montant reste masqué.
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useTranslation } from '../../utils/LanguageManager';
import { useResponsive } from '../../utils/responsive';
import { useColors } from '../theme';
import { typography } from '../theme/typography';
import { radius } from '../theme/tokens';
import { shadows } from '../theme/shadows';
import { Amount, AmountText, Card, ProgressBar } from '../components/ui';

export default function BalanceDetailScreen({
  onClose,
  wallets = [],
  budgetLimit = 0,
  periodExpenses = 0,
  budgetRatio = 0,
  budgetColor,
  deviseSymbol = '',
  available = 0,
  animatedAvailable = 0,
  heroSub = '',
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isDiscreteMode } = useFinance();
  const { contentMaxWidth, contentPadding } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.rule }]}>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('retour')}
        >
          <ChevronLeft size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={[typography.title, styles.headerTitle, { color: colors.ink }]} numberOfLines={1}>
          {t('solde_disponible')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* Carte héro compacte : rappel du solde qui a mené ici. */}
        <View style={[styles.heroWrap, shadows.raised]}>
          <View style={styles.hero}>
            <LinearGradient
              colors={colors.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[typography.micro, { color: heroSub }]}>
              {t('total_toutes_poches')}
            </Text>
            <Amount
              value={animatedAvailable || available}
              currency={deviseSymbol}
              size="display"
              align="left"
              masked={isDiscreteMode}
              style={styles.heroAmount}
            />
          </View>
        </View>

        {/* 1 — Portefeuilles, empilés */}
        <Text style={[typography.subtitle, styles.blockTitle, { color: colors.ink }]}>
          {t('portefeuilles')}
        </Text>
        {wallets.map((w) => (
          <Card key={w.key} style={styles.wallet}>
            <View style={styles.walletRow}>
              <View style={[styles.walletIcon, { backgroundColor: colors.accentSoft }]}>
                <w.Icon color={colors.accent} size={20} />
              </View>
              <View style={styles.walletMain}>
                <Text style={[typography.bodyStrong, { color: colors.ink }]} numberOfLines={1}>
                  {w.name}
                </Text>
                <Text style={[typography.micro, { color: colors.inkFaint }]}>
                  •••• {w.key === 'momo' ? 'MoMo' : w.key === 'cash' ? 'Cash' : 'BK'}
                </Text>
              </View>
              <AmountText
                value={w.value || 0}
                currency={deviseSymbol}
                size="amount"
                align="right"
                masked={isDiscreteMode}
              />
            </View>
          </Card>
        ))}

        {/* 2 — Budget de la période (rien à montrer sans limite définie) */}
        {budgetLimit > 0 && (
          <Card style={styles.card}>
            <View style={styles.cardHead}>
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
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (cp, cpad) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: cpad,
    paddingVertical: 14,
    borderBottomWidth: 1,
    maxWidth: cp,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitle: { flex: 1, minWidth: 0 },
  list: {
    paddingHorizontal: cpad,
    paddingTop: 16,
    paddingBottom: 40,
    maxWidth: cp,
    width: '100%',
    alignSelf: 'center',
  },

  /* Rappel du solde : l'ombre sur l'enveloppe, le rognage sur la carte
     (sur Android, `elevation` + `overflow: hidden` perd l'ombre). */
  heroWrap: { borderRadius: radius.xl, marginBottom: 24 },
  hero: { borderRadius: radius.xl, padding: 20, overflow: 'hidden' },
  heroAmount: { marginTop: 6 },

  blockTitle: { marginBottom: 12 },

  wallet: { marginBottom: 10 },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  walletMain: { flex: 1, minWidth: 0 },

  card: { marginTop: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  budgetLeft: { marginTop: 8 },
});