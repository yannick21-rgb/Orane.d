require('../scripts/test-harness.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');

const harness = require('../scripts/test-harness.cjs');
const {
  initSecureStorage,
  secureReadJSON,
  secureWriteJSON,
  secureGet,
  lockSecureStorage,
} = require('../src/utils/secureStorage');

const MARKER = 'enc:v1:';

test.beforeEach(() => {
  harness.resetAll();
  lockSecureStorage();
});

test('initSecureStorage — crée une clé maîtresse et renvoie true', async () => {
  const ok = await initSecureStorage('user-1');
  assert.equal(ok, true);
  assert.ok(harness.secureStoreMap.get('orane_master_key'));
});

test('secureWriteJSON — écrit une valeur chiffrée (marqueur) et retire la copie en clair', async () => {
  await harness.AsyncStorage.setItem('@oraned_transactions_u1', JSON.stringify([{ id: 'old' }]));
  await initSecureStorage('user-1');

  await secureWriteJSON('@oraned_transactions_u1', [{ id: 'a', amount: 42 }]);

  const encrypted = await harness.AsyncStorage.getItem('@enc_@oraned_transactions_u1');
  assert.ok(encrypted, 'la valeur chiffrée doit exister');
  assert.ok(encrypted.startsWith(MARKER), 'elle doit porter le marqueur');
  assert.ok(!encrypted.includes('"amount":42'), 'le contenu ne doit pas être en clair');
  assert.equal(await harness.AsyncStorage.getItem('@oraned_transactions_u1'), null);
});

test('secureReadJSON — aller-retour chiffré', async () => {
  await initSecureStorage('user-1');
  const data = [{ id: 'a', title: 'Café', amount: 3.5 }];
  await secureWriteJSON('@oraned_transactions_u1', data);
  const read = await secureReadJSON('@oraned_transactions_u1', null);
  assert.deepEqual(read, data);
});

test('secureReadJSON — migre une donnée héritée en clair', async () => {
  // Donnée écrite avant le chiffrement : en clair sur la clé d’origine.
  const legacy = [{ id: 'legacy', title: 'ancien' }];
  await harness.AsyncStorage.setItem('@oraned_debts_u1', JSON.stringify(legacy));

  const read = await secureReadJSON('@oraned_debts_u1', []);
  assert.deepEqual(read, legacy);

  // Migration proactive : réécrite chiffrée, copie claire supprimée.
  const encrypted = await harness.AsyncStorage.getItem('@enc_@oraned_debts_u1');
  assert.ok(encrypted && encrypted.startsWith(MARKER));
  assert.equal(await harness.AsyncStorage.getItem('@oraned_debts_u1'), null);
  assert.deepEqual(await secureReadJSON('@oraned_debts_u1', []), legacy);
});

test('secureReadJSON — renvoie le repli quand rien n’est stocké', async () => {
  await initSecureStorage('user-1');
  assert.deepEqual(await secureReadJSON('@oraned_tontines_u1', []), []);
});

test('pas de crypto.subtle — stockage en clair (sans marqueur), mais lisible', async () => {
  const realCrypto = globalThis.crypto;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  // Simule un build sans module natif : crypto présent mais sans subtle.
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    writable: true,
    value: { getRandomValues: realCrypto.getRandomValues.bind(realCrypto) },
  });

  try {
    await initSecureStorage('user-1');
    await secureWriteJSON('@oraned_transactions_u1', [{ id: 'x' }]);
    // Sans chiffrement, la donnée part en clair sur la clé d'origine (donc
    // lisible par le chemin hérité), jamais sous un marqueur trompeur.
    const raw = await harness.AsyncStorage.getItem('@oraned_transactions_u1');
    assert.ok(raw, 'la donnée doit être écrite');
    assert.ok(!raw.startsWith(MARKER), 'pas de marqueur quand le chiffrement est indisponible');
    assert.equal(await harness.AsyncStorage.getItem('@enc_@oraned_transactions_u1'), null);
    assert.deepEqual(await secureReadJSON('@oraned_transactions_u1', []), [{ id: 'x' }]);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
    else delete globalThis.crypto;
  }
});

test('secureGet — ne renvoie jamais une valeur chiffrée illisible telle quelle', async () => {
  await initSecureStorage('user-1');
  await harness.AsyncStorage.setItem('@enc_@oraned_transactions_u1', `${MARKER}deadbeef`);
  assert.equal(await secureGet('@oraned_transactions_u1'), null);
});

test('clé maîtresse perdue — une valeur vide n’écrase PAS la donnée chiffrée', async () => {
  await initSecureStorage('user-1');
  await secureWriteJSON('@oraned_transactions_u1', [{ id: 'a', title: 'Café' }]);
  const stored = await harness.AsyncStorage.getItem('@enc_@oraned_transactions_u1');
  assert.ok(stored.startsWith(MARKER));

  // Réinstallation / SecureStore vidé : une nouvelle clé maîtresse est générée.
  harness.secureStoreMap.clear();
  lockSecureStorage();

  // La lecture signale l'illisibilité au lieu de renvoyer le repli `[]`.
  assert.equal(await secureReadJSON('@oraned_transactions_u1', []), undefined);

  // La persistance d'un tableau vide — ce qu'écrirait le contexte après la
  // lecture ci-dessus — doit être refusée, sinon la donnée serait perdue.
  const refusals = [];
  const origError = console.error;
  console.error = (...args) => refusals.push(args);
  let ok;
  try {
    ok = await secureWriteJSON('@oraned_transactions_u1', []);
  } finally {
    console.error = origError;
  }
  assert.equal(ok, false);
  assert.ok(refusals.length > 0, 'un refus doit être journalisé');

  // La donnée d'origine est intacte sur le disque.
  assert.equal(await harness.AsyncStorage.getItem('@enc_@oraned_transactions_u1'), stored);
});

test('clé maîtresse perdue — une valeur non vide (reprise cloud) reste écritible', async () => {
  await initSecureStorage('user-1');
  await secureWriteJSON('@oraned_transactions_u1', [{ id: 'a' }]);
  harness.secureStoreMap.clear();
  lockSecureStorage();

  const restored = [{ id: 'cloud', title: 'restauré' }];
  assert.equal(await secureWriteJSON('@oraned_transactions_u1', restored), true);
  assert.deepEqual(await secureReadJSON('@oraned_transactions_u1', []), restored);
});

test('valeur en clair héritée — jamais prise pour une donnée indéchiffrable', async () => {
  // Clair (pas de marqueur) : la garde anti-perte ne doit pas s'appliquer.
  await harness.AsyncStorage.setItem('@enc_@oraned_transactions_u1', JSON.stringify([{ id: 'a' }]));
  await initSecureStorage('user-1');
  assert.equal(await secureWriteJSON('@oraned_transactions_u1', []), true);
});
