import { Platform } from 'react-native';
import { toNumber } from '../utils/format';

export async function exportTransactionsToCSV(transactions, devise = '€') {
  if (!transactions || transactions.length === 0) {
    throw new Error('Aucune transaction à exporter.');
  }

  const headers = 'Date;Catégorie;Description;Montant;Type;Portefeuille;Frais MoMo;Réseau';
  const rows = transactions.map((tx) => {
    const date = tx.date || '';
    const category = (tx.category || '').replace(/,/g, ' ');
    const description = (tx.description || tx.note || '').replace(/,/g, ' ');
    const amount = toNumber(tx.amount).toFixed(2);
    const wallet = tx.wallet === 'cash' ? 'Espèces' : 'MoMo';
    const type = tx.type === 'expense' ? 'Dépense' : tx.type === 'transfert' ? 'Transfert' : 'Revenu';
    const momoFee = toNumber(tx.momoFee || tx.frais || 0).toFixed(2);
    const network = tx.momoNetwork || '';
    return `${date};${category};${description};${amount};${type};${wallet};${momoFee};${network}`;
  });

  const csvContent = `${headers}\n${rows.join('\n')}`;

  if (Platform.OS === 'web') {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `oraned_export_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const FileSystem = require('expo-file-system');
  const Sharing = require('expo-sharing');
  const fileUri = `${FileSystem.cacheDirectory}oraned_export_${Date.now()}.csv`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Exporter mes transactions',
  });
}
