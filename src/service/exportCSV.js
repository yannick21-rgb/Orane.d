import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function exportTransactionsToCSV(transactions, devise = '€') {
  if (!transactions || transactions.length === 0) {
    throw new Error('Aucune transaction à exporter.');
  }

  const headers = 'Date;Catégorie;Description;Montant;Type';
  const rows = transactions.map((tx) => {
    const date = tx.date || '';
    const category = (tx.category || '').replace(/,/g, ' ');
    const description = (tx.description || tx.note || '').replace(/,/g, ' ');
    const amount = tx.amount ?? '';
    const type = tx.type === 'expense' ? 'Dépense' : 'Revenu';
    return `${date};${category};${description};${amount};${type}`;
  });

  const csvContent = `${headers}\n${rows.join('\n')}`;
  const fileUri = `${FileSystem.cacheDirectory}oraned_export_${Date.now()}.csv`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Exporter mes transactions',
  });
}
