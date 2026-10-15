require('../scripts/test-harness.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');

const harness = require('../scripts/test-harness.cjs');
const { mergeRecords, toRow, toRows, sync } = require('../src/utils/sync');

test.beforeEach(() => {
  harness.resetAll();
  sync.reset();
});

test('mergeRecords — une date locale invalide ne bloque plus la mise à jour cloud', () => {
  const local = [{ id: 'a', updated_at: 'pas-une-date', title: 'local' }];
  const cloud = [{ id: 'a', updated_at: '2025-01-01T00:00:00.000Z', title: 'cloud' }];
  const merged = mergeRecords(local, cloud);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].title, 'cloud');
});

test('mergeRecords — une date cloud invalide n’écrase pas la version locale', () => {
  const local = [{ id: 'a', updated_at: '2025-06-01T00:00:00.000Z', title: 'local' }];
  const cloud = [{ id: 'a', updated_at: 'invalide', title: 'cloud' }];
  const merged = mergeRecords(local, cloud);
  assert.equal(merged[0].title, 'local');
});

test('mergeRecords — à horodatage égal, la version locale (non poussée) gagne', () => {
  const same = '2025-03-03T10:00:00.000Z';
  const merged = mergeRecords(
    [{ id: 'a', updated_at: same, title: 'local' }],
    [{ id: 'a', updated_at: same, title: 'cloud' }]
  );
  assert.equal(merged[0].title, 'local');
});

test('mergeRecords — cloud plus récent gagne, ids absents conservés', () => {
  const local = [
    { id: 'a', updated_at: '2025-01-01T00:00:00.000Z', title: 'old' },
    { id: 'local-only', updated_at: '2025-01-01T00:00:00.000Z' },
  ];
  const cloud = [
    { id: 'a', updated_at: '2025-02-01T00:00:00.000Z', title: 'new' },
    { id: 'cloud-only', updated_at: '2025-02-01T00:00:00.000Z' },
  ];
  const merged = mergeRecords(local, cloud);
  const byId = Object.fromEntries(merged.map((r) => [r.id, r]));
  assert.equal(byId.a.title, 'new');
  assert.ok(byId['local-only']);
  assert.ok(byId['cloud-only']);
  assert.equal(merged.length, 3);
});

test('toRow — masque les colonnes inconnues, force l’id en texte, garde updated_at', () => {
  const row = toRow(
    'transactions',
    { id: 123, title: 'T', champInconnu: 'x', updated_at: '2025-01-01T00:00:00.000Z' },
    'user-1'
  );
  assert.equal(row.id, '123');
  assert.equal(row.user_id, 'user-1');
  assert.equal(row.updated_at, '2025-01-01T00:00:00.000Z');
  assert.equal(row.champInconnu, undefined);
});

test('toRow — renvoie null sans id exploitable', () => {
  assert.equal(toRow('transactions', { title: 'sans id' }), null);
  assert.equal(toRow('transactions', null), null);
});

test('toRows — filtre les enregistrements sans id', () => {
  const rows = toRows('debts', [{ id: 'a' }, { title: 'sans id' }], 'u');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'a');
});

test('tombstones — une suppression hors ligne retire la ligne des données locales et du pull', async () => {
  // Le serveur possède déjà la ligne « a ».
  harness.supabaseMock.__tables.transactions = [
    { id: 'a', user_id: 'u1', title: 'à supprimer' },
    { id: 'b', user_id: 'u1', title: 'à garder' },
  ];
  harness.supabaseMock.__session = null; // hors ligne

  await sync.init('u1');
  await sync.remove('transactions', ['a']); // suppression hors ligne → tombstone + file

  const local = await sync.filterDeleted('transactions', [
    { id: 'a', title: 'à supprimer' },
    { id: 'b', title: 'à garder' },
  ]);
  assert.deepEqual(local.map((r) => r.id), ['b']);

  // De retour en ligne, le pull ne doit PAS ressusciter « a » (serveur pas
  // encore mis à jour).
  harness.supabaseMock.__session = 'u1';
  const pulled = await sync.pull('transactions');
  assert.deepEqual(pulled.map((r) => r.id), ['b']);
});

test('tombstones — une suppression en ligne confirmée est purgée', async () => {
  harness.supabaseMock.__session = 'u1';
  harness.supabaseMock.__tables.transactions = [{ id: 'a', user_id: 'u1' }];

  await sync.init('u1');
  await sync.remove('transactions', ['a']);

  // Serveur mis à jour et tombstone retiré : plus rien à filtrer.
  const local = await sync.filterDeleted('transactions', [{ id: 'a' }]);
  assert.equal(local.length, 1);
  const pending = await harness.AsyncStorage.getItem('@pending_sync_u1');
  assert.ok(!pending || JSON.parse(pending).length === 0);
});
