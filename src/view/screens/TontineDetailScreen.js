import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { useFinance } from '../../viewmodel/FinanceContext';
import { useTontines } from '../../viewmodel/TontineContext';
import { useGamification } from '../../viewmodel/GamificationContext';
import { ROUND_STATUS, computeTontineSummary } from '../../model/TontineModel';
import { toNumber } from '../../utils/format';
import { useResponsive } from '../../utils/responsive';
import { useColors } from '../theme';

export default function TontineDetailScreen({ group, onClose }) {
  const { accentColor, devise, addTransaction } = useFinance();
  const { markRoundPaid, markRoundReceived } = useTontines();
  const { awardTontineRound } = useGamification();
  const { contentMaxWidth, contentPadding, cardPadding, borderRadius } = useResponsive();
  const styles = createStyles(contentMaxWidth, contentPadding, cardPadding, borderRadius);
  const deviseSymbol = devise?.split(' ')[0] || 'F';
  const summary = computeTontineSummary(group);

  const colors = useColors();

  const handleMarkPaid = (round) => {
    Alert.alert(
      'Marquer cotisation payée',
      `Confirmer le paiement du tour ${round.roundNumber} (${group.amountPerTour} ${deviseSymbol}) ?\n\nAjouter une transaction réelle correspondante ?`,
      [
        { text: 'Non', style: 'cancel', onPress: async () => { await markRoundPaid(group.id, round.roundNumber); const dueOk = !round.dueDate || new Date() <= new Date(round.dueDate); if (dueOk) awardTontineRound(group.id, round.roundNumber); } },
        {
          text: 'Oui, créer la dépense',
          onPress: async () => {
            await markRoundPaid(group.id, round.roundNumber);
            const dueOk2 = !round.dueDate || new Date() <= new Date(round.dueDate);
            if (dueOk2) awardTontineRound(group.id, round.roundNumber);
            addTransaction({
              id: Date.now().toString(),
              title: `Cotisation tontine — ${group.groupName} (tour ${round.roundNumber})`,
              amount: group.amountPerTour,
              type: 'expense',
              wallet: 'cash',
              category: 'Épargne',
              note: `Tontine ${group.groupName} — tour ${round.roundNumber}/${group.totalParticipants}`,
              date: new Date().toISOString(),
            });
          },
        },
      ]
    );
  };

  const handleMarkReceived = (round) => {
    Alert.alert(
      'Marquer comme reçu',
      `Vous allez recevoir ${(group.amountPerTour * group.totalParticipants).toLocaleString()} ${deviseSymbol}.\n\nAjouter une transaction réelle ? Choisissez le portefeuille ou "Non".`,
      [
        { text: 'Non, juste marquer', style: 'cancel', onPress: () => markRoundReceived(group.id, round.roundNumber) },
        {
          text: '👉 MoMo',
          onPress: async () => {
            await markRoundReceived(group.id, round.roundNumber);
            addTransaction({
              id: Date.now().toString(),
              title: `Réception tontine — ${group.groupName}`,
              amount: group.amountPerTour * group.totalParticipants,
              type: 'income',
              wallet: 'momo',
              category: 'Épargne',
              note: `Tour de tontine ${group.groupName} — tour ${round.roundNumber}/${group.totalParticipants}`,
              date: new Date().toISOString(),
            });
          },
        },
        {
          text: '💵 Cash',
          onPress: async () => {
            await markRoundReceived(group.id, round.roundNumber);
            addTransaction({
              id: Date.now().toString(),
              title: `Réception tontine — ${group.groupName}`,
              amount: group.amountPerTour * group.totalParticipants,
              type: 'income',
              wallet: 'cash',
              category: 'Épargne',
              note: `Tour de tontine ${group.groupName} — tour ${round.roundNumber}/${group.totalParticipants}`,
              date: new Date().toISOString(),
            });
          },
        },
      ]
    );
  };

  const sortedRounds = [...group.rounds].sort((a, b) => a.roundNumber - b.roundNumber);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{group.groupName}</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.subText }]}>Montant/tour</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{group.amountPerTour.toLocaleString()} {deviseSymbol}</Text>
        </View>
        <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.subText }]}>Total à recevoir</Text>
          <Text style={[styles.infoValue, { color: colors.green }]}>{(group.amountPerTour * group.totalParticipants).toLocaleString()} {deviseSymbol}</Text>
        </View>
        <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.subText }]}>Position</Text>
          <Text style={[styles.infoValue, { color: colors.orange }]}>Tour {group.myPosition}/{group.totalParticipants}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryBadge, { backgroundColor: colors.input }]}>
          <Text style={[styles.summaryBadgeLabel, { color: colors.subText }]}>Cotisé</Text>
          <Text style={[styles.summaryBadgeValue, { color: colors.text }]}>{summary.totalPaid.toLocaleString()} {deviseSymbol}</Text>
        </View>
        <View style={[styles.summaryBadge, { backgroundColor: colors.input }]}>
          <Text style={[styles.summaryBadgeLabel, { color: colors.subText }]}>Reçu</Text>
          <Text style={[styles.summaryBadgeValue, { color: colors.green }]}>{summary.totalReceived.toLocaleString()} {deviseSymbol}</Text>
        </View>
        <View style={[styles.summaryBadge, { backgroundColor: colors.input }]}>
          <Text style={[styles.summaryBadgeLabel, { color: colors.subText }]}>Reste</Text>
          <Text style={[styles.summaryBadgeValue, { color: summary.hasReceived ? colors.subText : colors.orange }]}>
            {summary.hasReceived ? '✓' : `${summary.totalToReceiveAtMyTurn.toLocaleString()} ${deviseSymbol}`}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Tours</Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.roundsList} showsVerticalScrollIndicator={false}>
        {sortedRounds.map((round) => {
          const isPast = new Date(round.dueDate) < new Date();
          const statusColor = round.status === ROUND_STATUS.PAYE ? colors.green
            : round.status === ROUND_STATUS.RECU ? colors.orange
            : isPast ? colors.red
            : colors.subText;
          const statusIcon = round.status === ROUND_STATUS.PAYE ? '✅'
            : round.status === ROUND_STATUS.RECU ? '💰'
            : isPast ? '⚠️'
            : '⏳';
          const statusText = round.status === ROUND_STATUS.PAYE ? 'Payé'
            : round.status === ROUND_STATUS.RECU ? 'Reçu'
            : isPast ? 'En retard'
            : 'À payer';

          return (
            <View
              key={round.roundNumber}
              style={[styles.roundCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.roundLeft}>
                <Text style={[styles.roundNumber, { color: round.isMyTurnToReceive ? accentColor : colors.text }]}>
                  {statusIcon} Tour {round.roundNumber}
                </Text>
                <Text style={[styles.roundDate, { color: colors.subText }]}>
                  {new Date(round.dueDate).toLocaleDateString('fr-FR')}
                  {round.isMyTurnToReceive && (
                    <Text style={{ color: accentColor, fontWeight: '700' }}> ← Mon tour !</Text>
                  )}
                </Text>
              </View>
              <View style={styles.roundRight}>
                <Text style={[styles.roundAmount, { color: statusColor }]}>
                  {round.isMyTurnToReceive
                    ? `${(group.amountPerTour * group.totalParticipants).toLocaleString()} ${deviseSymbol}`
                    : `${group.amountPerTour} ${deviseSymbol}`
                  }
                </Text>
                {round.status === ROUND_STATUS.A_PAYER && (
                  <TouchableOpacity
                    style={[styles.roundAction, { backgroundColor: colors.green + '20' }]}
                    onPress={() => round.isMyTurnToReceive ? handleMarkReceived(round) : handleMarkPaid(round)}
                  >
                    <Check size={14} color={colors.green} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (cp, cpad, cardP, br) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: cpad, paddingVertical: 16, borderBottomWidth: 1,
    maxWidth: cp, width: '100%', alignSelf: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center', marginHorizontal: 12 },
  infoCard: { marginHorizontal: cpad, marginTop: 16, padding: cardP, borderRadius: br, maxWidth: cp, width: '100%', alignSelf: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  infoLabel: { fontSize: 13, fontWeight: '500' },
  infoValue: { fontSize: 15, fontWeight: '700' },
  infoDivider: { height: 1, marginVertical: 6 },
  summaryRow: { flexDirection: 'row', gap: 10, marginHorizontal: cpad, marginTop: 12, maxWidth: cp, width: '100%', alignSelf: 'center' },
  summaryBadge: { flex: 1, padding: 12, borderRadius: 14, alignItems: 'center' },
  summaryBadgeLabel: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  summaryBadgeValue: { fontSize: 14, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', paddingHorizontal: cpad, marginTop: 20, marginBottom: 8 },
  roundsList: { paddingHorizontal: cpad, paddingBottom: 40, maxWidth: cp, width: '100%', alignSelf: 'center' },
  roundCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1,
  },
  roundLeft: { flex: 1 },
  roundNumber: { fontSize: 14, fontWeight: '700' },
  roundDate: { fontSize: 12, marginTop: 2 },
  roundRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roundAmount: { fontSize: 14, fontWeight: 'bold' },
  roundAction: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
