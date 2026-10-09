import { Platform } from 'react-native';
import { toNumber } from '../utils/format';

export async function exportTransactionsToCSV(transactions, devise = '€') {
  if (!transactions || transactions.length === 0) {
    throw new Error('Aucune transaction à exporter.');
  }

  const headers = 'Date;Catégorie;Description;Montant;Type;Portefeuille;Frais MoMo;Réseau';
  // Le séparateur est `;` : sans guillemets, un `;`, un guillemet ou un saut
  // de ligne dans une description décale toutes les colonnes suivantes.
  // RFC 4180 : on entoure de guillemets et on double les guillemets internes.
  const esc = (value) => {
    const s = value === null || value === undefined ? '' : String(value);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = transactions.map((tx) => {
    const date = esc(tx.date || '');
    const category = esc(tx.category || '');
    const description = esc(tx.description || tx.note || '');
    const amount = toNumber(tx.amount).toFixed(2);
    const wallet = esc(tx.wallet === 'cash' ? 'Espèces' : 'MoMo');
    const type = esc(tx.type === 'expense' ? 'Dépense' : tx.type === 'transfert' ? 'Transfert' : 'Revenu');
    const momoFee = toNumber(tx.momoFee || tx.frais || 0).toFixed(2);
    const network = esc(tx.momoNetwork || '');
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
