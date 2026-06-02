import React, { useState, useEffect } from 'react'; // ✅ Import de useState ajouté
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { LanguageManager } from './LanguageManager'; // ✅ On ajoute "../" pour remonter dans src/
// Icônes par catégorie pour affichage dans la liste
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

export default function HomeScreen({ navigation }) { // ✅ Navigation passée en paramètre

  const {
    transactions = [],
    isDark = false,
    accentColor = '#3b82f6',
    deleteTransaction,
    locale, // 🚀 On écoute la langue globale ici pour forcer le rafraîchissement automatique
  } = useFinance();

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
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  const totalExpenses = sorted
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  const balance = totalIncome - totalExpenses;
  const recentTransactions = sorted.slice(0, 5);

  // ── Suppression avec confirmation ──────────────────────────────────────
  const handleDelete = (item) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${item.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteTransaction(item.id),
        },
      ]
    );
  }; // ✅ Correctement fermé ici

  // ── Formatage date ────────────────────────────────────────────────────
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // ── Icône : catégorie en priorité, fallback sur type ─────────────────
  const getTxIcon = (item) => {
    if (item.category && CATEGORY_ICONS[item.category]) {
      return CATEGORY_ICONS[item.category];
    }
    return item.type === 'income' ? '💰' : '📦';
  };

  // 3️⃣ Rendu de l'écran principal (Un seul return, bien placé !)
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>

        {/* Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.welcomeText, { color: colors.subText }]}>Bonjour 👋</Text>
            <Text style={[styles.title, { color: colors.text }]}>
              {LanguageManager.t('home')} {/* ✅ Traduit dynamiquement */}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: accentColor }]}
            onPress={() => navigation?.navigate('Ajout')}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Carte Solde Global ──────────────────────────────────────────── */}
        <View
          style={[
            styles.mainCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: isDark ? 0 : 1 },
          ]}
        >
          <Text style={[styles.mainLabel, { color: colors.subText }]}>Solde Total</Text>
          <Text style={[styles.mainValue, { color: balance >= 0 ? colors.text : colors.expense }]}>
            {balance >= 0 ? '+' : '-'}{Math.abs(balance).toFixed(2)} €
          </Text>

          <View style={styles.rowStats}>
            <View style={styles.statContainer}>
              <Text style={[styles.statLabel, { color: colors.subText }]}>▲ Revenus</Text>
              <Text style={[styles.statValue, { color: colors.income }]}>
                +{totalIncome.toFixed(2)} €
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? '#222431' : '#eef0f5' }]} />
            <View style={styles.statContainer}>
              <Text style={[styles.statLabel, { color: colors.subText }]}>▼ Dépenses</Text>
              <Text style={[styles.statValue, { color: colors.expense }]}>
                -{totalExpenses.toFixed(2)} €
              </Text>
            </View>
          </View>
        </View>

        {/* Section opérations ──────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dernières opérations</Text>
          {safeTransactions.length > 0 && (
            <TouchableOpacity onPress={() => navigation?.navigate('Stats')}>
              <Text style={[styles.seeMore, { color: accentColor }]}>Voir bilans</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Indice discret : appui long pour supprimer */}
        {recentTransactions.length > 0 && (
          <Text style={[styles.deleteHint, { color: colors.subText }]}>
            Appui long sur une opération pour la supprimer
          </Text>
        )}

        {/* Liste vide ou Transactions ─────────────────────────────────── */}
        {recentTransactions.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: isDark ? 0 : 1 },
            ]}
          >
            <Text style={{ fontSize: 32, marginBottom: 10 }}>💳</Text>
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              Aucune opération pour le moment.
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { borderColor: accentColor }]}
              onPress={() => navigation?.navigate('Ajout')}
            >
              <Text style={[styles.emptyButtonText, { color: accentColor }]}>
                Ajouter ma première transaction
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentTransactions.map((item) => {
            if (!item) return null;
            const isExpense = item.type === 'expense';
            return (
              <TouchableOpacity
                key={item.id}
                onLongPress={() => handleDelete(item)}
                activeOpacity={0.8}
                style={[
                  styles.txCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: isDark ? 0 : 1 },
                ]}
              >
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
                      {item.category ?? 'Général'} · {formatDate(item.date)}
                    </Text>
                    {item.note ? (
                      <Text style={[styles.txNote, { color: colors.subText }]} numberOfLines={1}>
                        {item.note}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text style={[styles.txAmount, { color: isExpense ? colors.expense : colors.income }]}>
                  {isExpense ? '-' : '+'}
                  {Math.abs(item.amount || 0).toFixed(2)} €
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        {/* Lien "Voir tout" ───────────────────────────────────────────── */}
        {sorted.length > 5 && (
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => navigation?.navigate('Stats')}
          >
            <Text style={[styles.viewAllText, { color: accentColor }]}>
              Voir toutes les transactions ({sorted.length})
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 25 },
  welcomeText:     { fontSize: 14, fontWeight: '500' },
  title:           { fontSize: 32, fontWeight: 'bold', marginTop: 2 },
  addButton:       { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  addButtonText:   { color: '#fff', fontSize: 24, fontWeight: '600', marginTop: -2 },

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
  seeMore:        { fontSize: 13, fontWeight: '600' },
  deleteHint:     { fontSize: 11, fontWeight: '500', marginBottom: 14, opacity: 0.7 },

  txCard:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12 },
  txLeft:      { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  txIconBox:   { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  txTitle:     { fontSize: 15, fontWeight: '600' },
  txCategory:  { fontSize: 12, fontWeight: '500', marginTop: 2 },
  txNote:      { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  txAmount:    { fontSize: 16, fontWeight: 'bold' },

  emptyCard:       { padding: 30, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyText:       { fontSize: 14, textAlign: 'center', marginBottom: 15 },
  emptyButton:     { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' },
  emptyButtonText: { fontSize: 13, fontWeight: '600' },

  viewAllBtn:  { alignItems: 'center', paddingVertical: 12 },
  viewAllText: { fontSize: 13, fontWeight: '600' },
});