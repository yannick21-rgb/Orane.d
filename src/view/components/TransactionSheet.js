/**
 * TransactionSheet — saisie d'une dépense en moins de 5 secondes.
 *
 * S'ouvre depuis le « + », les actions rapides et l'onglet « Ajouter ».
 *
 * Grammaire de formulaire (alignée sur AddTransactionScreen, règle 1) :
 * **chaque bloc porte un libellé de section** — 11 px, gras, interlettrage
 * large, capitales (`sectionLabel`) — puis son contrôle, calé à gauche.
 * Un seul rythme d'espacement (libellé → contrôle, sections à `xl`).
 *
 * - **montant** : champ creux (`input`) avec l'unité au libellé
 *   « MONTANT (FCFA) » — le nombre géant reste centré, seul, sans
 *   devise flottante déconnectée ; frappe au clavier système
 *   (`number-pad`), le pavé intégré (« numérologie ») a été retiré ;
 * - **raccourcis** 500/1 000/5 000 sous le champ, à gauche ;
 * - **grille de catégories** : 3 colonnes de base fixe (aucune cellule
 *   ne s'étire, la dernière rangée garde la même largeur) et libellés
 *   sur 2 lignes — plus de troncature ;
 * - SegmentedControl portefeuilles (MoMo/Cash/Banque) ou réseau +
 *   frais de transfert, date (aujourd'hui / hier / libre), note
 *   repliable ;
 * - bouton d'enregistrement en **pied de feuille fixe**, hors
 *   défilement : entièrement visible quelle que soit la hauteur.
 *
 * CONSTRUCTION DES ÉCRITURES IDENTIQUE à AddTransactionScreen (règle 1) :
 * mêmes champs, mêmes catégories canoniques, mêmes frais de transfert et
 * même double écriture. Seul le titre est pré-rempli (clé de catégorie)
 * pour tenir les 5 secondes — l'édition complète reste sur l'écran Ajout.
 */
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  LayoutAnimation,
  Keyboard,
} from 'react-native';
import LottieView from 'lottie-react-native';
import {
  ShoppingCart, Home as HomeIcon, Car, CreditCard, Dumbbell,
  Gamepad2, Shirt, HeartPulse, PiggyBank, RefreshCcw, Receipt, BookOpen,
  Star, Briefcase, Laptop, Globe, Gift, Handshake, ShoppingBag, Trophy,
  Check,
} from 'lucide-react-native';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useTranslation } from '../../utils/LanguageManager';
import { toNumber } from '../../utils/format';
import {
  NETWORKS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, computeTransferFee,
} from '../../model/TransactionModel';
import CrossPlatformDatePicker from './CrossPlatformDatePicker';
import { SegmentedControl, Chip, Button, BottomSheetModal } from './ui';
import { useColors } from '../theme';
import { radius, touchTarget } from '../theme/tokens';
import { spacing } from '../theme/spacing';
import { typography, numericFonts, maxFontScale } from '../theme/typography';

let Haptics = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  Haptics = null;
}

function buzz(kind) {
  try {
    if (!Haptics) return;
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    else if (kind === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    else Haptics.selectionAsync().catch(() => {});
  } catch (e) {}
}

/** Icônes + teintes pour les clés canoniques de TransactionModel. */
const CAT_VISUAL = {
  'Alimentation': { Icon: ShoppingCart, color: '#E0913D' },
  'Logement': { Icon: HomeIcon, color: '#9B7BE8' },
  'Transport': { Icon: Car, color: '#5AA9E6' },
  'Abonnements & Tech': { Icon: CreditCard, color: '#4A5BF0' },
  'Sport': { Icon: Trophy, color: '#E05A7A' },
  'Loisirs': { Icon: Gamepad2, color: '#3FC1C9' },
  'Habillement': { Icon: Shirt, color: '#C9A86A' },
  'Santé': { Icon: HeartPulse, color: '#E05A7A' },
  'Épargne': { Icon: PiggyBank, color: '#1FA97A' },
  'Remboursement': { Icon: RefreshCcw, color: '#8A93A3' },
  'Frais & Retraits': { Icon: Receipt, color: '#E08A1E' },
  'Education/Formation': { Icon: BookOpen, color: '#7C4DE0' },
  'Autres': { Icon: Star, color: '#8A93A3' },
  'Salaire / Coaching': { Icon: Briefcase, color: '#2ecc71' },
  'Freelance / Dev': { Icon: Laptop, color: '#5AA9E6' },
  'Projets Web': { Icon: Globe, color: '#4A5BF0' },
  'Cadeau': { Icon: Gift, color: '#E05A7A' },
  'Emprunt': { Icon: Handshake, color: '#E08A1E' },
  'Ventes': { Icon: ShoppingBag, color: '#E0913D' },
  'DumbbellFallback': { Icon: Dumbbell, color: '#8A93A3' },
};

const FALLBACK_VISUAL = { Icon: Star, color: '#8A93A3' };
const SUGGESTIONS = [500, 1000, 5000];

export function TransactionSheet({ visible, initialType = 'expense', onClose }) {
  const { t } = useTranslation();
  const colors = useColors();
  const {
    transactions = [],
    addTransaction,
    devise,
  } = useFinance();
  const deviseSymbol = devise?.split(' ')[0] || '€';

  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState(initialType);
  const [wallet, setWallet] = useState('momo');
  const [category, setCategory] = useState('Alimentation');
  const [network, setNetwork] = useState('MTN');
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [dateMode, setDateMode] = useState('today');
  const [customDate, setCustomDate] = useState(new Date());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const closeTimer = useRef(null);

  // Réinitialise à chaque ouverture (nouvelle saisie, jamais d'édition ici).
  useEffect(() => {
    if (visible) {
      const init = initialType === 'income' ? 'income' : initialType === 'transfert' ? 'transfert' : 'expense';
      setAmountStr('');
      setType(init);
      setWallet('momo');
      setCategory(init === 'income' ? 'Salaire / Coaching' : 'Alimentation');
      setNetwork('MTN');
      setNote('');
      setNoteOpen(false);
      setDateMode('today');
      setCustomDate(new Date());
      setError('');
      setSuccess(false);
    }
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [visible, initialType]);

  const baseCats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Les plus récentes/fréquentes d'abord (usage local, aucun tri stocké).
  const orderedCats = useMemo(() => {
    const stats = {};
    (transactions || []).forEach((tx) => {
      if (!tx || !tx.category) return;
      const s = stats[tx.category] || { count: 0, last: 0 };
      s.count += 1;
      const tm = new Date(tx.date).getTime() || 0;
      if (tm > s.last) s.last = tm;
      stats[tx.category] = s;
    });
    return [...baseCats].sort((a, b) => {
      const sa = stats[a.key] || { count: 0, last: 0 };
      const sb = stats[b.key] || { count: 0, last: 0 };
      return (sb.last - sa.last) || (sb.count - sa.count);
    });
  }, [transactions, baseCats]);

  const parsed = toNumber(amountStr);
  const fee = useMemo(() => {
    if (type !== 'transfert' || parsed <= 0) return 0;
    return computeTransferFee(parsed, network);
  }, [type, parsed, network]);

  // Saisie du montant au clavier système (le pavé intégré a été retiré).
  // Mêmes règles que l'ancien pavé pour que `toNumber` retrouve la même
  // valeur : chiffres uniquement, zéros initiaux écrêtés, 9 chiffres
  // significatifs maximum. `formatted` sert de valeur affichée → le champ
  // reste formaté (1 500) pendant la frappe.
  const handleAmountChange = useCallback((raw) => {
    setError('');
    const digits = String(raw)
      .replace(/[^0-9]/g, '')
      .replace(/^0+(?=\d)/, '')
      .slice(0, 10);
    setAmountStr(digits);
  }, []);

  const resolveDate = () => {
    const now = new Date();
    if (dateMode === 'yesterday') {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return d.toISOString();
    }
    if (dateMode === 'custom' && customDate) {
      const d = new Date(customDate);
      d.setHours(now.getHours(), now.getMinutes(), 0, 0);
      return d.toISOString();
    }
    return now.toISOString();
  };

  const handleSave = () => {
    if (parsed <= 0) {
      setError(t('veuillez_montant'));
      buzz('error');
      return;
    }

    const isoDate = resolveDate();
    const title = type === 'transfert' ? `Retrait ${network}` : category;
    let customNote = note.trim();
    let finalCategory = category;

    if (type === 'transfert') {
      const netLabel = NETWORKS.find((n) => n.key === network);
      const netName = netLabel ? t(netLabel.tKey) : network;
      const details = `Retrait ${netName} : -${fee}${deviseSymbol} de frais → +${parsed}${deviseSymbol} en espèces`;
      customNote = customNote ? `${customNote} | ${details}` : details;
      finalCategory = 'Retrait MoMo';
    }

    const txId = Date.now().toString();
    addTransaction({
      id: txId,
      title,
      amount: parsed,
      type,
      wallet: type === 'transfert' ? 'momo' : wallet,
      category: finalCategory,
      note: customNote || null,
      date: isoDate,
      momoNetwork: type === 'transfert' ? network : null,
      momoFee: null,
      frais: 0,
      amountReceived: type === 'transfert' ? parsed : null,
      incomeFrequency: type === 'income' ? 'monthly' : null,
    });

    if (type === 'transfert' && fee > 0) {
      addTransaction({
        id: `${txId}_fee`,
        title: `Frais retrait ${title}`,
        amount: fee,
        type: 'expense',
        wallet: 'momo',
        category: 'Frais & Retraits',
        momoNetwork: network,
        note: `Frais automatiques ${NETWORKS.find((n) => n.key === network)?.tKey || network} : ${fee}${deviseSymbol}`,
        date: isoDate,
      });
    }

    // La liste se met à jour en animé derrière la fermeture du sheet.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSuccess(true);
    buzz('success');
    closeTimer.current = setTimeout(() => {
      onClose();
    }, 1250);
  };

  // Chiffres formatés pendant la frappe ; vide → placeholder « 0 ».
  const formatted = amountStr ? Number(amountStr).toLocaleString('fr-FR') : '';
  // Taille du montant : elle décroît avec la longueur pour ne jamais
  // déborder (l'ancien `<Text adjustsFontSizeToFit>` ne s'applique pas
  // à un champ éditable de la même façon).
  const amountFontSize = formatted.length <= 7 ? 52 : formatted.length <= 10 ? 42 : 34;

  const typeOptions = [
    { value: 'expense', label: t('label_depenses') },
    { value: 'income', label: t('label_revenus') },
    { value: 'transfert', label: t('type_transfert') },
  ];
  const walletOptions = [
    { value: 'momo', label: t('pocket_momo') },
    { value: 'cash', label: t('pocket_especes') },
    { value: 'banque', label: t('pocket_banque') },
  ];

  const switchType = (v) => {
    buzz('tap');
    setType(v);
    setError('');
    setCategory(v === 'income' ? 'Salaire / Coaching' : 'Alimentation');
    if (v === 'transfert') setWallet('momo');
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={t('nouvelle_operation')}
      accessibilityLabel={t('nouvelle_operation')}
    >
      <View style={styles.wrap}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <SegmentedControl
            options={typeOptions}
            value={type}
            onChange={switchType}
            accessibilityLabel={t('type_operation')}
          />

          {/* Montant : libellé d'unité + champ creux. Le champ se lit
              comme un champ (fond `input`, rayon), jamais comme du texte
              figé ; l'unité est portée par le libellé, donc le nombre
              géant reste centré, seul, sans devise flottante. */}
          <Text style={[styles.sectionLabel, { color: colors.subText }]}>
            {`${t('montant')} (${deviseSymbol})`}
          </Text>
          <View style={[styles.amountField, { backgroundColor: colors.input }]}>
            <TextInput
              value={formatted}
              onChangeText={handleAmountChange}
              keyboardType="number-pad"
              inputMode="numeric"
              placeholder="0"
              placeholderTextColor={colors.subText}
              maxFontSizeMultiplier={maxFontScale}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              accessibilityLabel={`${t('montant')} (${deviseSymbol})`}
              style={[
                styles.amountInput,
                { color: parsed > 0 ? colors.ink : colors.subText, fontSize: amountFontSize },
              ]}
            />
          </View>
          {error ? (
            <Text style={[styles.error, { color: colors.expense }]}>{error}</Text>
          ) : null}

          {/* Raccourcis de montant : à gauche, dans le rythme du
              formulaire (libellé → contrôle → raccourcis). */}
          <View style={styles.chips}>
            {SUGGESTIONS.map((v) => (
              <Chip
                key={v}
                label={v.toLocaleString('fr-FR')}
                selected={parsed === v}
                onPress={() => { buzz('tap'); setError(''); setAmountStr(String(v)); }}
                accessibilityLabel={`${v} ${deviseSymbol}`}
              />
            ))}
          </View>

          {type !== 'transfert' ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.subText }]}>
                {t('portefeuilles')}
              </Text>
              <SegmentedControl
                options={walletOptions}
                value={wallet}
                onChange={(v) => { buzz('tap'); setWallet(v); }}
                accessibilityLabel={t('portefeuilles')}
              />
            </>
          ) : (
            <>
              <Text style={[styles.sectionLabel, { color: colors.subText }]}>
                {t('reseau')}
              </Text>
              <View style={[styles.feeBox, { backgroundColor: colors.sunken }]}>
                <View style={styles.row}>
                  {NETWORKS.map((n) => (
                    <Chip
                      key={n.key}
                      label={t(n.tKey)}
                      selected={network === n.key}
                      onPress={() => { buzz('tap'); setNetwork(n.key); }}
                    />
                  ))}
                </View>
                {parsed > 0 && (
                  <View style={styles.feeRows}>
                    <View style={styles.feeRow}>
                      <Text style={[typography.caption, { color: colors.inkMid }]}>
                        {t('frais_auto')} ({t(NETWORKS.find((n) => n.key === network)?.tKey || network)})
                      </Text>
                      <Text style={[typography.bodyStrong, { color: colors.transfer }]}>
                        -{fee.toLocaleString('fr-FR')} {deviseSymbol}
                      </Text>
                    </View>
                    <View style={styles.feeRow}>
                      <Text style={[typography.caption, { color: colors.inkMid }]}>{t('recu_en_especes')}</Text>
                      <Text style={[typography.bodyStrong, { color: colors.income }]}>
                        +{parsed.toLocaleString('fr-FR')} {deviseSymbol}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </>
          )}

          {type !== 'transfert' && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.subText }]}>
                {t('categorie')}
              </Text>
              <View style={styles.catGrid}>
                {orderedCats.map((cat) => {
                  const visual = CAT_VISUAL[cat.key] || FALLBACK_VISUAL;
                  const active = category === cat.key;
                  const CatIcon = visual.Icon;
                  return (
                    <Pressable
                      key={cat.key}
                      onPress={() => { buzz('tap'); setCategory(cat.key); }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={t(cat.tKey)}
                      style={[styles.cat, active && { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}
                    >
                      <View style={[styles.catCircle, { backgroundColor: `${visual.color}22` }]}>
                        <CatIcon color={visual.color} size={20} />
                      </View>
                      <Text
                        numberOfLines={2}
                        maxFontSizeMultiplier={maxFontScale}
                        style={[styles.catLabel, { color: active ? colors.ink : colors.inkMid }]}
                      >
                        {t(cat.tKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Text style={[styles.sectionLabel, { color: colors.subText }]}>
            {t('date_operation')}
          </Text>
          <View style={styles.row}>
            <Chip
              label={t('aujourdhui')}
              selected={dateMode === 'today'}
              onPress={() => { buzz('tap'); setDateMode('today'); }}
            />
            <Chip
              label={t('hier')}
              selected={dateMode === 'yesterday'}
              onPress={() => { buzz('tap'); setDateMode('yesterday'); }}
            />
            <Chip
              label={t('choisir_date')}
              selected={dateMode === 'custom'}
              onPress={() => { buzz('tap'); setDateMode('custom'); }}
            />
          </View>
          {dateMode === 'custom' && (
            <View style={styles.block}>
              <CrossPlatformDatePicker
                value={customDate}
                mode="date"
                onChange={(_, d) => { if (d) setCustomDate(d); }}
              />
            </View>
          )}

          <Pressable
            onPress={() => { buzz('tap'); setNoteOpen((v) => !v); }}
            accessibilityRole="button"
            accessibilityLabel={t('ajouter_note')}
            style={styles.noteToggle}
          >
            <Text style={[typography.body, { color: colors.inkMid }]}>{t('ajouter_note')}</Text>
            <Text style={{ color: colors.inkMid, fontSize: 16 }}>{noteOpen ? '▾' : '▸'}</Text>
          </Pressable>
          {noteOpen && (
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('placeholder_note')}
              placeholderTextColor={colors.inkFaint}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              accessibilityLabel={t('note')}
              style={[styles.noteInput, { backgroundColor: colors.sunken, color: colors.ink }]}
            />
          )}

        </ScrollView>

        {/* Pied de feuille, hors défilement : le bouton reste toujours
            entièrement visible, quelle que soit la hauteur de la feuille. */}
        <View style={[styles.footer, { borderTopColor: colors.rule }]}>
          <Button
            label={t('enregistrer_operation')}
            size="lg"
            fullWidth
            onPress={handleSave}
            icon={<Check size={18} color={colors.accentFg} strokeWidth={2.5} />}
          />
        </View>

        {success && (
          <View style={[StyleSheet.absoluteFill, styles.success, { backgroundColor: colors.card }]}>
            <LottieView
              source={require('../../../assets/animations/success-check.json')}
              autoPlay
              loop={false}
              style={styles.lottie}
            />
            <Text style={[typography.subtitle, { color: colors.ink }]}>{t('valide')}</Text>
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  // Chaîne de hauteur bornée : la feuille a un maxHeight (BottomSheetModal),
  // wrap un maxHeight et les enfants sont en flexShrink:1 → la feuille se
  // comprime au lieu de déborder hors écran (coupait le bouton en bas).
  wrap: { position: 'relative', maxHeight: 560, flexShrink: 1 },
  // Le ScrollView se comprime dans wrap pour laisser sa place au pied de
  // feuille ; c'est lui qui défile.
  scrollView: { flexShrink: 1 },
  scroll: { paddingBottom: spacing.md },
  // Champ montant : conteneur creux (rayon, respiration) — le champ doit
  // SE LIRE comme un champ ; le nombre reste centré, seul (l'unité est
  // au libellé de section, donc plus de devise flottante déconnectée).
  amountField: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  amountInput: {
    flex: 1,
    fontFamily: numericFonts.semibold,
    letterSpacing: -1.2,
    textAlign: 'center',
    paddingVertical: 2,
  },
  error: { textAlign: 'center', fontSize: 13, marginTop: spacing.sm },
  // Raccourcis et rangées : tous calés à gauche, sous leur libellé →
  // un seul rythme visuel (les raccourcis n'échappent plus à la règle).
  chips: { flexDirection: 'row', gap: 8, marginTop: spacing.md, flexWrap: 'wrap' },
  row: { flexDirection: 'row', gap: 8, marginTop: spacing.md, flexWrap: 'wrap' },
  block: { marginTop: spacing.lg },
  // La marge haute est portée par le libellé de section au-dessus
  // (pas de double saut d'espacement).
  feeBox: { borderRadius: radius.md, padding: spacing.md },
  feeRows: { marginTop: spacing.md, gap: 6 },
  feeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Libellé de section : même grammaire que la page Ajout (11 px, gras,
  // interlettrage large, capitales) → les deux saisies se ressemblent.
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // 3 colonnes de base fixe (`flexBasis` 31 % + aucun `grow`) : toutes
  // les cellules gardent la même largeur, y compris la dernière rangée —
  // l'ancien `width 23 % + flexGrow: 1` faisait déborder la 4ᵉ colonne
  // (wrap involontaire à 3) et étirait la rangée incomplète en cellules
  // 2× plus larges.
  cat: {
    flexBasis: '31%',
    flexGrow: 0,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: touchTarget,
    justifyContent: 'center',
  },
  catCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  // 11 px (et non 10) + 2 lignes : « Abonnements & Tech » se replie au
  // lieu d'être tronqué en « Abonnements… ».
  catLabel: { fontSize: 11, lineHeight: 14, fontWeight: '500', textAlign: 'center' },
  noteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTarget,
    marginTop: spacing.lg,
  },
  noteInput: { borderRadius: radius.sm, padding: 12, fontSize: 15, minHeight: 64, marginTop: spacing.sm },
  footer: { paddingTop: spacing.md, marginTop: spacing.sm, borderTopWidth: 1 },
  success: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
  lottie: { width: 140, height: 140 },
});

export default TransactionSheet;
