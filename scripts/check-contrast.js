#!/usr/bin/env node
/**
 * scripts/check-contrast.js — audit WCAG des paires texte/fond du thème.
 *
 * Usage : node scripts/check-contrast.js
 * Sortie 0 si toutes les paires ≥ 4,5:1 (texte courant), 1 sinon.
 */
function lum(hex) {
  const v = String(hex).replace('#', '');
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v.slice(0, 6);
  const n = parseInt(full, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// [nom, encre, fond] — style Old Money : encre sur fond sombre ET clair,
// tons sémantiques sur carte, accent champagne et ses encres calculées.
const PAIRS = [
  ['encre / fond sombre', '#eef1f5', '#0e1014'],
  ['encre / fond clair', '#14171c', '#ffffff'],
  ['encre moyenne / carte sombre', '#98a1ae', '#14171d'],
  ['encre moyenne / carte claire', '#545c68', '#ffffff'],
  ['revenu / carte sombre', '#2ecc71', '#14171d'],
  ['revenu / carte claire', '#0f7a4a', '#ffffff'],
  ['dépense / carte sombre', '#ff5c5c', '#14171d'],
  ['dépense / carte claire', '#c22a2a', '#ffffff'],
  ['alerte / carte claire', '#8a5a00', '#ffffff'],
  ['info / carte sombre', '#5AA9E6', '#14171d'],
  ['info / carte claire', '#0B5CAD', '#ffffff'],
  ['noir / champagne (FAB, encres)', '#0e1014', '#C9A86A'],
  ['blanc / bronze clair (accent)', '#ffffff', '#8A6D2B'],
  ['blanc / encre pastille avatar', '#ffffff', '#4A5BF0'],
  ['encre / pastille pastille claire', '#0e1014', '#E3C98B'],
];

let fail = 0;
PAIRS.forEach(([name, fg, bg]) => {
  const r = ratio(fg, bg);
  const ok = r >= 4.5;
  if (!ok) fail += 1;
  console.log(`${ok ? '✓' : '✗'} ${name.padEnd(38)} ${r.toFixed(2)}:1 ${ok ? 'AA' : 'FAIL'}`);
});
process.exit(fail ? 1 : 0);
