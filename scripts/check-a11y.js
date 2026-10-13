#!/usr/bin/env node
/**
 * scripts/check-a11y.js — audit statique d'accessibilité.
 *
 * Contrôles (AST, comme check-code.js) :
 *   1. tout TouchableOpacity / Pressable doit porter accessibilityLabel
 *      (les spreads {...props} sont acceptés : le libellé peut venir de
 *      l'appelant, ex. composants ui génériques) ;
 *   2. tout TextInput doit porter accessibilityLabel ou placeholder ;
 *   3. rappel des zones tactiles : signale les Pressable dont le style
 *      impose une hauteur/largeur < 44 (hors cas légitimes ignorés).
 *
 * Usage : node scripts/check-a11y.js [--strict]
 * En mode normal : rapport seul (sortie 0). --strict : sortie 1 si findings.
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const STRICT = process.argv.includes('--strict');
const ROOT = 'src';
const MIN_TOUCH = 44;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      walk(full, out);
    } else if (/\.(js|jsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

const findings = [];

function hasTextInSubtree(node) {
  let found = false;
  const scan = (n) => {
    if (!n || typeof n !== 'object' || found) return;
    if (Array.isArray(n)) return n.forEach(scan);
    if (n.type === 'JSXElement') {
      const opening = n.openingElement;
      if (opening && opening.name.type === 'JSXIdentifier' && opening.name.name === 'Text') {
        found = true;
        return;
      }
    }
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue;
      scan(n[k]);
    }
  };
  // Ne scanne que les enfants (le bouton lui-même n'est pas un <Text>).
  (node.children || []).forEach(scan);
  return found;
}

for (const file of walk(ROOT)) {
  const code = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
    });
  } catch (e) {
    continue;
  }
  const rel = path.relative(process.cwd(), file);
  traverse(ast, {
    JSXOpeningElement(p) {
      const name = p.node.name;
      if (name.type !== 'JSXIdentifier') return;
      const line = p.node.loc.start.line;
      const attrs = p.node.attributes || [];
      const has = (n) => attrs.some((a) => a.type === 'JSXAttribute' && a.name.name === n);
      const hasSpread = attrs.some((a) => a.type === 'JSXSpreadAttribute');

      if (name.name === 'TouchableOpacity' || name.name === 'Pressable') {
        if (!has('accessibilityLabel') && !hasSpread) {
          // Nom accessible via le contenu : un <Text> descendant (littéral
          // ou t('clé')) suffit aux lecteurs d'écran. Seuls les boutons
          // purement iconographiques sont signalés.
          const el = p.parent && p.parent.type === 'JSXElement' ? p.parent : p.node;
          if (!hasTextInSubtree(el)) {
            findings.push({ file: rel, line, kind: 'label', message: `<${name.name}> icône sans accessibilityLabel` });
          }
        }
        // Zone tactile : cherche height/width/minHeight/minWidth littéraux < 44
        // dans un objet style inline de premier niveau.
        const styleAttr = attrs.find((a) => a.type === 'JSXAttribute' && a.name.name === 'style');
        const checkSize = (obj) => {
          for (const prop of obj.properties || []) {
            if (prop.type !== 'ObjectProperty' || prop.computed) continue;
            const k = prop.key.name ?? prop.key.value;
            const v = prop.value;
            if (!['height', 'width', 'minHeight', 'minWidth'].includes(k)) continue;
            if (v.type === 'NumericLiteral' && v.value < MIN_TOUCH) {
              findings.push({ file: rel, line, kind: 'touch', message: `<${name.name}> ${k}=${v.value} < ${MIN_TOUCH}` });
            }
          }
        };
        if (styleAttr && styleAttr.value && styleAttr.value.type === 'JSXExpressionContainer') {
          const expr = styleAttr.value.expression;
          const objs = expr.type === 'ArrayExpression' ? expr.elements : [expr];
          objs.forEach((o) => { if (o && o.type === 'ObjectExpression') checkSize(o); });
        }
      }

      if (name.name === 'TextInput') {
        if (!has('accessibilityLabel') && !has('placeholder') && !hasSpread) {
          findings.push({ file: rel, line, kind: 'label', message: '<TextInput> sans accessibilityLabel ni placeholder' });
        }
      }
    },
  });
}

if (!findings.length) {
  console.log('✓ accessibilité : rien à signaler.');
  process.exit(0);
}

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}
console.log(`${findings.length} remarque(s) dans ${byFile.size} fichier(s) :\n`);
for (const [file, list] of byFile) {
  console.log(file);
  for (const f of list.sort((a, b) => a.line - b.line)) {
    console.log(`  L${f.line}  [${f.kind}] ${f.message}`);
  }
  console.log('');
}
process.exit(STRICT ? 1 : 0);
