/**
 * Bac à sable visuel — « le carnet ».
 *
 * Pas une Prod. Un écran de contrôle qui rend l'accueil avec des données
 * fictives, hors authentification, pour juger la palette, le rythme et
 * l'alignement de la colonne des montants sans avoir à peupler une base.
 *
 * NON RACCORDE — ce fichier n'est importe nulle part, donc il ne part pas dans
 * le bundle. Il est laisse sur disque comme banc de montage : le cabler
 * demandait un `import` statique dans `App.js`, et Metro n'elague pas les
 * imports conditionnels — l'ecran aurait voyage en production pour rien.
 *
 * Pour le reutiliser : reintroduire l'`import` et la branche
 * `EXPO_PUBLIC_CARNET_PREVIEW === '1' && Platform.OS === 'web'` dans `App.js`,
 * puis lancer `EXPO_PUBLIC_CARNET_PREVIEW=1 npx expo start --web`.
 * Retirer l'import et la branche suffit a l'exclure de nouveau.
 */
import React from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useColors } from '../theme';

import { type } from '../theme/type';
import { radius } from '../theme/tokens';
import { Amount, Button, Card, Cells, Cell, Input, Rule, SectionHeader } from '../components/ui';
import { ACCENT_COLORS } from '../../model/ThemeModel';

const DEMO = [
  { title: 'Courses — marché Saint-Jean', category: 'Alimentation', amount: 4500, date: '2026-10-02', note: 'Riz, huile, 2 poulets' },
  { title: 'Data bundle Orange', category: 'Général', amount: 3000, date: '2026-10-01' },
  { title: 'Taxi — gare → campus', category: 'Transport', amount: 1200, date: '2026-10-01' },
  { title: 'Colocation — octobre', category: 'Logement', amount: 45000, date: '2026-09-28' },
  { title: 'Boursier — septembre', category: 'Salaire', amount: 120000, date: '2026-09-25' },
  { title: 'Retrait MoMo → espèces', category: 'Retrait MoMo', amount: -30000, date: '2026-09-24' },
];

const DEBTS = [
  { label: 'À recevoir', value: 15000, tone: 'income' },
  { label: 'À rembourser', value: 8200, tone: 'expense' },
  { label: 'Tontine', value: 25000, tone: 'transfer' },
];

export default function CarnetPreview() {
  const { isDark, setTheme, accentColor, setAccentColor } = useFinance();
  const colors = useColors();
  const toggleTheme = () => setTheme(isDark ? 'Clair' : 'Sombre');

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.toolbar}>
          <Text style={[type.micro, { color: colors.inkFaint }]}>« le carnet » — banc de rendu</Text>
          <TouchableOpacity
            onPress={toggleTheme}
            accessibilityRole="button"
            style={[styles.toggle, { backgroundColor: colors.sunken }]}
          >
            <Text style={[type.micro, { color: colors.ink }]}>
              {isDark ? 'Voir en clair' : 'Voir en sombre'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* En-tête */}
        <View style={styles.header}>
          <Text style={[type.title, { color: colors.ink }]}>Orane</Text>
          <View style={styles.syncRow}>
            <View style={[styles.syncDot, { backgroundColor: colors.warning }]} />
            <Text style={[type.micro, { color: colors.inkMid }]}>3 en attente</Text>
          </View>
        </View>

        {/* Le solde — le seul corps très marqué */}
        <View style={styles.balance}>
          <Text style={[type.micro, { color: colors.inkMid }]}>Solde disponible</Text>
          <Amount value={128450} currency="F CFA" size="display" align="left" style={styles.display} />
        </View>

        <View style={styles.flowRow}>
          <Cells>
            <Cell label="Revenus">
              <Amount value={165000} currency="F CFA" size="figure" tone="income" signed align="left" />
            </Cell>
            <Cell label="Dépenses">
              <Amount value={98700} currency="F CFA" size="figure" tone="expense" align="left" />
            </Cell>
          </Cells>
        </View>

        <Rule tone="soft" />

        {/* Les trois poches sur une ligne */}
        <View style={styles.pocketRow}>
          {[
            { name: 'MoMo', value: 81300 },
            { name: 'Espèces', value: 37150 },
            { name: 'Banque', value: 10000 },
          ].map((p, i) => (
            <React.Fragment key={p.name}>
              {i > 0 ? <Rule vertical tone="soft" /> : null}
              <View style={styles.pocket}>
                <Text style={[type.micro, { color: colors.inkFaint }]}>{p.name}</Text>
                <Amount value={p.value} currency="F CFA" size="amountSm" tone="mid" style={styles.pocketAmount} />
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Progression — le motif de cellules, une seconde fois */}
        <Rule />
        <View style={styles.progressBand}>
          <Cells>
            <Cell label="Niveau">
              <Amount value={4} size="figure" align="left" />
            </Cell>
            <Cell label="XP">
              <Amount value="320 / 600" size="amount" tone="mid" align="left" />
            </Cell>
            <Cell label="Série">
              <View style={styles.streak}>
                <Amount value={6} size="amount" tone="mid" align="left" />
                <Text style={[type.micro, { color: colors.inkFaint }]}>j</Text>
              </View>
            </Cell>
          </Cells>
          <View style={[styles.track, { backgroundColor: colors.track }]}>
            <View style={[styles.trackFill, { backgroundColor: colors.accent, width: '53%' }]} />
          </View>
        </View>

        {/* Dettes */}
        <Rule />
        <View style={styles.debtRow}>
          {DEBTS.map((d, i) => (
            <React.Fragment key={d.label}>
              {i > 0 ? <Rule vertical tone="soft" /> : null}
              <View style={styles.pocket}>
                <Text style={[type.micro, { color: colors.inkFaint }]}>{d.label}</Text>
                <Amount value={d.value} currency="F CFA" size="amount" tone={d.tone} signed style={styles.pocketAmount} />
              </View>
            </React.Fragment>
          ))}
        </View>

        <Rule />
        <View style={styles.sectionHead}>
          <SectionHeader
            title="Toutes les opérations"
            style={{ marginBottom: 0 }}
            trailing={<Text style={{ color: colors.inkMid }}>⌕</Text>}
          />
        </View>
        <View style={styles.searchBar}>
          <Input placeholder="Rechercher" style={styles.search} />
        </View>

        {/* Les lignes d'opération */}
        {DEMO.map((item) => {
          const isIncome = item.category === 'Salaire';
          const isTransfer = item.category === 'Retrait MoMo';
          return (
            <View key={item.title}>
              <Rule />
              <View style={styles.row}>
                <View style={styles.rowMain}>
                  <Text style={[type.bodyStrong, { color: colors.ink }]} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.rowMeta}>
                    <Text style={[type.label, { color: colors.inkMid }]}>
                      {item.category === 'Alimentation' ? 'Alimentation' : item.category}
                    </Text>
                    <Text style={[type.label, { color: colors.inkFaint }]}>02 oct</Text>
                  </View>
                  {item.note ? (
                    <Text style={[type.micro, styles.note, { color: colors.inkFaint }]} numberOfLines={1}>{item.note}</Text>
                  ) : null}
                </View>
                <Amount
                  value={Math.abs(item.amount)}
                  currency="F CFA"
                  size="amount"
                  tone={isTransfer ? 'transfer' : isIncome ? 'income' : 'expense'}
                  signed={!isTransfer}
                  style={styles.rowAmount}
                />
              </View>
            </View>
          );
        })}
        <Text style={[type.micro, styles.footnote, { color: colors.inkFaint }]}>
          Appuie sur la poubelle pour supprimer
        </Text>

        {/* Primitives, pour vérifier qu'elles restent dans le langage */}
        <Rule style={styles.gapTop} />
        <Text style={[type.heading, { color: colors.ink, marginBottom: 12 }]}>Primitives</Text>
        <Card padding={20} radius={radius.md}>
          <Text style={[type.label, { color: colors.inkMid, marginBottom: 12 }]}>Boutons</Text>
          <View style={styles.btnRow}>
            <Button label="Enregistrer" size="md" onPress={() => {}} />
            <Button label="Annuler" size="md" variant="secondary" onPress={() => {}} />
            <Button label="Supprimer" size="md" variant="danger" onPress={() => {}} />
            <Button label="Fantôme" size="md" variant="ghost" onPress={() => {}} />
          </View>
          <Text style={[type.label, { color: colors.inkMid, marginTop: 18, marginBottom: 12 }]}>Accents</Text>
          <View style={styles.swatches}>
            {ACCENT_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setAccentColor(c)}
                accessibilityRole="button"
                accessibilityLabel={`Accent ${c}`}
                style={[
                  styles.swatch,
                  { backgroundColor: c },
                  accentColor === c && { borderColor: colors.ink, borderWidth: 2 },
                ]}
              />
            ))}
          </View>
          <Text style={[type.label, { color: colors.inkMid, marginTop: 18, marginBottom: 12 }]}>Champ</Text>
          <Input placeholder="Titre de l'opération" />
        </Card>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0e1014' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 12 },
  toggle: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 24 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncDot: { width: 5, height: 5, borderRadius: 3 },
  balance: { marginBottom: 20 },
  display: { marginTop: 6 },
  flowRow: { paddingBottom: 16 },
  pocketRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  pocket: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  pocketAmount: { marginTop: 3 },
  progressBand: { paddingVertical: 16 },
  streak: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  track: { height: 4, borderRadius: radius.pill, overflow: 'hidden', marginTop: 14 },
  trackFill: { height: 4, borderRadius: radius.pill },
  debtRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  sectionHead: { paddingTop: 20 },
  searchBar: { paddingVertical: 14 },
  search: { marginTop: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  rowMain: { flex: 1, minWidth: 0 },
  rowMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 3 },
  note: { marginTop: 3 },
  rowAmount: { minWidth: 110 },
  footnote: { marginTop: 14 },
  btnRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: radius.sm },
  gapTop: { marginTop: 28 },
  footer: { height: 40 },
});