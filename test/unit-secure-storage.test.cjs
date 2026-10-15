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
