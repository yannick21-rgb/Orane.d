require('../scripts/test-harness.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');

const { generateId } = require('../src/utils/id');
const { toNumber, toCurrency } = require('../src/utils/format');

test('generateId — produit des identifiants uniques même en rafale', () => {
  const N = 50000;
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const id = generateId();
    assert.ok(!seen.has(id), `collision sur ${id}`);
    seen.add(id);
  }
  assert.equal(seen.size, N);
});

test('generateId — format sans caractère problématique pour une clé/champ texte', () => {
  for (let i = 0; i < 100; i++) {
    const id = generateId();
    assert.equal(typeof id, 'string');
    assert.match(id, /^[0-9a-z]+-[0-9a-z]+-[0-9a-z]+$/);
    assert.ok(id.length > 8);
  }
});

test('toNumber — gère espaces, virgule, symboles et valeurs invalides', () => {
  assert.equal(toNumber('1 234,56'), 1234.56);
  assert.equal(toNumber('12 €'), 12);
  assert.equal(toNumber(''), 0);
  assert.equal(toNumber(null), 0);
  assert.equal(toNumber(undefined), 0);
  assert.equal(toNumber('abc'), 0);
  assert.equal(toNumber(-42.5), -42.5);
  assert.equal(toNumber(0), 0);
});

test('toCurrency — deux décimales, format français', () => {
  // L'espace des milliers produit par ICU peut être U+202F : on normalise.
  const norm = (s) => s.replace(/\s/g, ' ');
  assert.equal(norm(toCurrency(1234.5)), '1 234,50');
  assert.equal(norm(toCurrency('12,3')), '12,30');
});
